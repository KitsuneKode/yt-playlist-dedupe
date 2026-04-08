import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { google } from "googleapis";

const CALLBACK_PATH = "/oauth2callback";
const TOKEN_FILENAME = "oauth-token.json";

export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

export type OAuthClient = InstanceType<typeof google.auth.OAuth2>;
type OAuthCredentials = NonNullable<
  Parameters<OAuthClient["setCredentials"]>[0]
>;
type GenerateAuthUrlOptions = NonNullable<
  Parameters<OAuthClient["generateAuthUrl"]>[0]
>;

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export interface OAuthSetupStatus {
  configured: boolean;
  source: string | null;
  tokenPath: string;
}

interface LoopbackServerState {
  server: Server;
  redirectUri: string;
  waitForCode: (expectedState: string, logger: Logger) => Promise<string>;
}

interface OAuthCallbackPayload {
  code: string | null;
  state: string | null;
}

interface InstalledClientFile {
  installed?: {
    client_id?: string;
    client_secret?: string;
  };
}

export async function getAuthenticatedClient({
  scope,
  logger = console,
}: {
  scope: string;
  logger?: Logger;
}): Promise<OAuthClient> {
  const oauthConfig = await loadOAuthConfig();
  const tokenPath = getTokenPath();
  const savedTokens = await loadSavedTokens(tokenPath);

  if (savedTokens) {
    const client = new google.auth.OAuth2(
      oauthConfig.clientId,
      oauthConfig.clientSecret,
      undefined,
    );

    client.setCredentials(savedTokens);
    registerTokenPersistence(client, tokenPath, logger);

    try {
      await client.getAccessToken();
      return client;
    } catch (error) {
      logger.warn(
        `Stored OAuth token could not be refreshed (${getErrorMessage(error)}). Starting a fresh authorization flow.`,
      );
      await rm(tokenPath, { force: true }).catch(() => {});
    }
  }

  return authorizeInteractively({ oauthConfig, scope, tokenPath, logger });
}

async function authorizeInteractively({
  oauthConfig,
  scope,
  tokenPath,
  logger,
}: {
  oauthConfig: OAuthConfig;
  scope: string;
  tokenPath: string;
  logger: Logger;
}): Promise<OAuthClient> {
  const { server, redirectUri, waitForCode } = await startLoopbackServer();
  const state = randomBytes(24).toString("hex");
  const oauthClient = new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    redirectUri,
  );

  registerTokenPersistence(oauthClient, tokenPath, logger);

  try {
    const { codeVerifier, codeChallenge } =
      await oauthClient.generateCodeVerifierAsync();
    const codeChallengeMethod =
      "S256" as GenerateAuthUrlOptions["code_challenge_method"];
    const authUrl = oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: [scope],
      prompt: "consent",
      include_granted_scopes: true,
      state,
      code_challenge_method: codeChallengeMethod,
      code_challenge: codeChallenge,
    });

    logger.log("");
    logger.log("Open this URL to authorize the CLI:");
    logger.log(authUrl);
    logger.log(
      "If your browser does not open automatically, paste the URL into your browser manually.",
    );
    logger.log("");

    openBrowser(authUrl);

    const authorizationCode = await waitForCode(state, logger);
    const { tokens } = await oauthClient.getToken({
      code: authorizationCode,
      codeVerifier,
      redirect_uri: redirectUri,
    });

    oauthClient.setCredentials(tokens);
    await persistTokens(tokenPath, oauthClient.credentials as OAuthCredentials);

    logger.log(`OAuth token saved to ${tokenPath}`);
    return oauthClient;
  } finally {
    server.close();
    await sleep(50);
  }
}

async function startLoopbackServer(): Promise<LoopbackServerState> {
  let resolveCodePromise!: (value: OAuthCallbackPayload) => void;
  let rejectCodePromise!: (reason?: unknown) => void;

  const codePromise = new Promise<OAuthCallbackPayload>(
    (resolveCode, rejectCode) => {
      resolveCodePromise = resolveCode;
      rejectCodePromise = rejectCode;
    },
  );

  const server = createServer((request, response) => {
    handleOAuthCallback({
      requestUrl: request.url ?? "/",
      response,
      resolveCodePromise,
      rejectCodePromise,
    });
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to determine the local OAuth callback port.");
  }

  const redirectUri = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`;

  async function waitForCode(
    expectedState: string,
    logger: Logger,
  ): Promise<string> {
    const timeout = setTimeout(
      () => {
        rejectCodePromise(
          new Error("Timed out waiting for OAuth authorization."),
        );
      },
      5 * 60 * 1000,
    );

    try {
      logger.log(
        "Waiting for the browser callback on a local loopback port...",
      );
      const { code, state } = await codePromise;

      if (!code) {
        throw new Error(
          "OAuth callback did not include an authorization code.",
        );
      }

      if (state !== expectedState) {
        throw new Error("OAuth state validation failed.");
      }

      return code;
    } finally {
      clearTimeout(timeout);
    }
  }

  return { server, redirectUri, waitForCode };
}

function handleOAuthCallback({
  requestUrl,
  response,
  resolveCodePromise,
  rejectCodePromise,
}: {
  requestUrl: string;
  response: ServerResponse;
  resolveCodePromise: (value: OAuthCallbackPayload) => void;
  rejectCodePromise: (reason?: unknown) => void;
}): void {
  try {
    const url = new URL(requestUrl, "http://127.0.0.1");

    if (url.pathname !== CALLBACK_PATH) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const authError = url.searchParams.get("error");

    if (authError) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end(
        "Authorization failed. You can close this tab and return to the terminal.",
      );
      rejectCodePromise(new Error(`Authorization failed: ${authError}`));
      return;
    }

    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(
      "Authorization received. You can close this tab and return to the terminal.",
    );
    resolveCodePromise({ code, state });
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Unexpected callback error.");
    rejectCodePromise(error);
  }
}

async function loadOAuthConfig(): Promise<OAuthConfig> {
  const configFromEnv = loadOAuthConfigFromEnv();
  if (configFromEnv) {
    return configFromEnv;
  }

  const configFromJsonEnv = loadOAuthConfigFromJsonEnv();
  if (configFromJsonEnv) {
    return configFromJsonEnv;
  }

  const credentialsPath =
    process.env.YT_DDP_OAUTH_CLIENT_FILE ??
    process.env.YOUTUBE_OAUTH_CLIENT_FILE ??
    process.env.GOOGLE_OAUTH_CLIENT_FILE ??
    null;

  if (!credentialsPath) {
    throw new Error(
      "Missing OAuth client configuration. Run the setup command, or set YT_DDP_OAUTH_CLIENT_ID and YT_DDP_OAUTH_CLIENT_SECRET, set YT_DDP_OAUTH_CLIENT_JSON_BASE64, or set YT_DDP_OAUTH_CLIENT_FILE to a Desktop app OAuth client JSON file.",
    );
  }

  return readOAuthClientFile(credentialsPath);
}

export function inspectOAuthSetup(): OAuthSetupStatus {
  if (loadOAuthConfigFromEnv()) {
    return {
      configured: true,
      source: "environment variables (client ID + secret)",
      tokenPath: getTokenPath(),
    };
  }

  if (loadOAuthConfigFromJsonEnv()) {
    return {
      configured: true,
      source: "environment variables (OAuth client JSON)",
      tokenPath: getTokenPath(),
    };
  }

  const credentialsPath =
    process.env.YT_DDP_OAUTH_CLIENT_FILE ??
    process.env.YOUTUBE_OAUTH_CLIENT_FILE ??
    process.env.GOOGLE_OAUTH_CLIENT_FILE ??
    null;

  if (credentialsPath) {
    return {
      configured: true,
      source: `OAuth client file (${resolve(credentialsPath)})`,
      tokenPath: getTokenPath(),
    };
  }

  return {
    configured: false,
    source: null,
    tokenPath: getTokenPath(),
  };
}

export async function readOAuthClientFile(
  filePath: string,
): Promise<OAuthConfig> {
  const raw = await readFile(resolve(filePath), "utf8");
  return parseInstalledClientJson(raw, "OAuth client file");
}

function loadOAuthConfigFromEnv(): OAuthConfig | null {
  const clientId =
    process.env.YT_DDP_OAUTH_CLIENT_ID ??
    process.env.YOUTUBE_OAUTH_CLIENT_ID ??
    process.env.GOOGLE_OAUTH_CLIENT_ID ??
    null;
  const clientSecret =
    process.env.YT_DDP_OAUTH_CLIENT_SECRET ??
    process.env.YOUTUBE_OAUTH_CLIENT_SECRET ??
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ??
    null;

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

function loadOAuthConfigFromJsonEnv(): OAuthConfig | null {
  const rawJson =
    process.env.YT_DDP_OAUTH_CLIENT_JSON ??
    process.env.YOUTUBE_OAUTH_CLIENT_JSON ??
    process.env.GOOGLE_OAUTH_CLIENT_JSON ??
    null;

  if (rawJson) {
    return parseInstalledClientJson(rawJson, "YOUTUBE_OAUTH_CLIENT_JSON");
  }

  const base64Json =
    process.env.YT_DDP_OAUTH_CLIENT_JSON_BASE64 ??
    process.env.YOUTUBE_OAUTH_CLIENT_JSON_BASE64 ??
    process.env.GOOGLE_OAUTH_CLIENT_JSON_BASE64 ??
    null;

  if (!base64Json) {
    return null;
  }

  try {
    const decoded = Buffer.from(base64Json, "base64").toString("utf8");
    return parseInstalledClientJson(
      decoded,
      "YOUTUBE_OAUTH_CLIENT_JSON_BASE64",
    );
  } catch (error) {
    throw new Error(
      `Failed to decode YT_DDP_OAUTH_CLIENT_JSON_BASE64: ${getErrorMessage(error)}`,
    );
  }
}

function getTokenPath(): string {
  const configuredDir =
    process.env.YT_DDP_CONFIG_DIR ?? process.env.YT_PLAYLIST_DEDUPE_CONFIG_DIR;
  if (configuredDir) {
    return join(resolve(configuredDir), TOKEN_FILENAME);
  }

  const baseDir =
    process.env.XDG_CONFIG_HOME ??
    process.env.APPDATA ??
    join(homedir(), ".config");

  return join(baseDir, "yt-ddp", TOKEN_FILENAME);
}

async function loadSavedTokens(
  tokenPath: string,
): Promise<OAuthCredentials | null> {
  try {
    const raw = await readFile(tokenPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      throw new Error("Saved OAuth token file is not a JSON object.");
    }

    return parsed as OAuthCredentials;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function registerTokenPersistence(
  client: OAuthClient,
  tokenPath: string,
  logger: Logger,
): void {
  client.on("tokens", async (tokens) => {
    try {
      const currentTokens = (await loadSavedTokens(tokenPath)) ?? {};
      await persistTokens(tokenPath, {
        ...currentTokens,
        ...tokens,
      } as OAuthCredentials);
    } catch (error) {
      logger.warn(
        `Failed to persist refreshed OAuth token: ${getErrorMessage(error)}`,
      );
    }
  });
}

async function persistTokens(
  tokenPath: string,
  tokens: OAuthCredentials,
): Promise<void> {
  await mkdir(dirname(tokenPath), { recursive: true, mode: 0o700 });
  await writeFile(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  await chmod(tokenPath, 0o600).catch(() => {});
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const commands =
    platform === "darwin"
      ? [["open", url]]
      : platform === "win32"
        ? [["cmd", "/c", "start", "", url]]
        : [["xdg-open", url]];

  for (const [command, ...args] of commands) {
    try {
      const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", () => {});
      child.unref();
      return;
    } catch {
      // Ignore browser launch failures and fall back to the printed URL.
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseInstalledClientJson(
  raw: string,
  sourceLabel: string,
): OAuthConfig {
  const parsed = JSON.parse(raw) as InstalledClientFile;
  const clientId = parsed.installed?.client_id;
  const clientSecret = parsed.installed?.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error(
      `${sourceLabel} must contain Desktop app credentials under the installed key.`,
    );
  }

  return { clientId, clientSecret };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
