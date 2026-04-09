import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmod,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer, type Server, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { google } from "googleapis";

const CALLBACK_PATH = "/oauth2callback";
const OAUTH_CLIENT_FILENAME = "oauth-client.json";
const TOKEN_FILENAME = "oauth-token.json";
const WORKSPACE_OAUTH_FILE_PATTERNS = [
  /^client_secret.*\.json$/i,
  /^oauth-client.*\.json$/i,
  /^google.*oauth.*\.json$/i,
  /^credentials.*\.json$/i,
  /^client.*\.json$/i,
] as const;

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

const CLIENT_ID_ENV_KEYS = [
  "YT_DDP_OAUTH_CLIENT_ID",
  "YOUTUBE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_ID",
] as const;
const CLIENT_SECRET_ENV_KEYS = [
  "YT_DDP_OAUTH_CLIENT_SECRET",
  "YOUTUBE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_CLIENT_SECRET",
] as const;
const CLIENT_JSON_ENV_KEYS = [
  "YT_DDP_OAUTH_CLIENT_JSON",
  "YOUTUBE_OAUTH_CLIENT_JSON",
  "GOOGLE_OAUTH_CLIENT_JSON",
] as const;
const CLIENT_JSON_BASE64_ENV_KEYS = [
  "YT_DDP_OAUTH_CLIENT_JSON_BASE64",
  "YOUTUBE_OAUTH_CLIENT_JSON_BASE64",
  "GOOGLE_OAUTH_CLIENT_JSON_BASE64",
] as const;
const CLIENT_FILE_ENV_KEYS = [
  "YT_DDP_OAUTH_CLIENT_FILE",
  "YOUTUBE_OAUTH_CLIENT_FILE",
  "GOOGLE_OAUTH_CLIENT_FILE",
] as const;

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export type OAuthSourceKind =
  | "env-client"
  | "env-json"
  | "env-file"
  | "app-config"
  | "workspace-file";

export interface OAuthSetupStatus {
  configured: boolean;
  source: string | null;
  sourceKind: OAuthSourceKind | null;
  tokenPath: string;
  clientConfigPath: string;
  suggestedClientFile: string | null;
}

export interface OAuthSourceResolution {
  config: OAuthConfig | null;
  source: string | null;
  sourceKind: OAuthSourceKind | null;
  tokenPath: string;
  clientConfigPath: string;
  suggestedClientFile: string | null;
}

export interface OAuthResolutionOptions {
  configDir?: string;
  env?: NodeJS.ProcessEnv;
  workspaceDir?: string;
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
  const resolution = await resolveOAuthSource();
  const oauthConfig = resolution.config;
  const tokenPath = resolution.tokenPath;

  if (!oauthConfig) {
    throw createMissingOAuthConfigError(
      resolution.suggestedClientFile
        ? dirname(resolution.suggestedClientFile)
        : process.cwd(),
    );
  }

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

export async function resolveOAuthSource(
  options: OAuthResolutionOptions = {},
): Promise<OAuthSourceResolution> {
  const env = options.env ?? process.env;
  const workspaceDir = resolve(options.workspaceDir ?? process.cwd());
  const clientConfigPath = getClientConfigPath(options);
  const tokenPath = getTokenPath(options);
  const suggestedClientFile = await findWorkspaceOAuthClientFile({
    workspaceDir,
  });

  const configFromEnv = loadOAuthConfigFromEnv(env);
  if (configFromEnv) {
    return {
      clientConfigPath,
      config: configFromEnv,
      source: "environment variables (client ID + secret)",
      sourceKind: "env-client",
      suggestedClientFile,
      tokenPath,
    };
  }

  const configFromJsonEnv = loadOAuthConfigFromJsonEnv(env);
  if (configFromJsonEnv) {
    return {
      clientConfigPath,
      config: configFromJsonEnv,
      source: "environment variables (OAuth client JSON)",
      sourceKind: "env-json",
      suggestedClientFile,
      tokenPath,
    };
  }

  const configuredClientFilePath = getConfiguredOAuthClientFilePath(env);
  if (configuredClientFilePath) {
    return {
      clientConfigPath,
      config: await readOAuthClientFile(configuredClientFilePath),
      source: `OAuth client file (${resolve(configuredClientFilePath)})`,
      sourceKind: "env-file",
      suggestedClientFile,
      tokenPath,
    };
  }

  const persistedConfig =
    await loadPersistedOAuthClientConfig(clientConfigPath);
  if (persistedConfig) {
    return {
      clientConfigPath,
      config: persistedConfig,
      source: `yt-ddp app config (${clientConfigPath})`,
      sourceKind: "app-config",
      suggestedClientFile,
      tokenPath,
    };
  }

  if (suggestedClientFile) {
    return {
      clientConfigPath,
      config: await readOAuthClientFile(suggestedClientFile),
      source: `workspace OAuth client file (${suggestedClientFile})`,
      sourceKind: "workspace-file",
      suggestedClientFile,
      tokenPath,
    };
  }

  return {
    clientConfigPath,
    config: null,
    source: null,
    sourceKind: null,
    suggestedClientFile: null,
    tokenPath,
  };
}

export async function inspectOAuthSetup(): Promise<OAuthSetupStatus> {
  const resolution = await resolveOAuthSource();
  return {
    configured: resolution.config !== null,
    source: resolution.source,
    sourceKind: resolution.sourceKind,
    tokenPath: resolution.tokenPath,
    clientConfigPath: resolution.clientConfigPath,
    suggestedClientFile: resolution.suggestedClientFile,
  };
}

export async function readOAuthClientFile(
  filePath: string,
): Promise<OAuthConfig> {
  const raw = await readFile(resolve(filePath), "utf8");
  return parseInstalledClientJson(raw, "OAuth client file");
}

export async function savePersistedOAuthClientConfig(
  oauthConfig: OAuthConfig,
  options: OAuthResolutionOptions = {},
): Promise<string> {
  const clientConfigPath = getClientConfigPath(options);
  await mkdir(dirname(clientConfigPath), { recursive: true, mode: 0o700 });
  await writeFile(clientConfigPath, JSON.stringify(oauthConfig, null, 2), {
    mode: 0o600,
  });
  await chmod(clientConfigPath, 0o600).catch(() => {});
  return clientConfigPath;
}

async function findWorkspaceOAuthClientFile({
  workspaceDir,
}: {
  workspaceDir: string;
}): Promise<string | null> {
  const entries = await listWorkspaceOAuthCandidates(workspaceDir);

  for (const entry of entries) {
    const candidatePath = resolve(workspaceDir, entry.name);

    try {
      await readOAuthClientFile(candidatePath);
      return candidatePath;
    } catch {
      // Ignore similarly named files that are not Google Desktop OAuth clients.
    }
  }

  return null;
}

async function listWorkspaceOAuthCandidates(
  workspaceDir: string,
): Promise<Array<{ name: string }>> {
  try {
    const entries = await readdir(workspaceDir, { withFileTypes: true });

    return entries
      .filter(
        (entry) =>
          entry.isFile() && isLikelyWorkspaceOAuthClientFile(entry.name),
      )
      .sort(
        (left, right) =>
          scoreWorkspaceOAuthClientFile(right.name) -
            scoreWorkspaceOAuthClientFile(left.name) ||
          left.name.localeCompare(right.name),
      )
      .map((entry) => ({ name: entry.name }));
  } catch {
    return [];
  }
}

function loadOAuthConfigFromEnv(env: NodeJS.ProcessEnv): OAuthConfig | null {
  const clientId = getFirstDefinedEnvValue(env, CLIENT_ID_ENV_KEYS);
  const clientSecret = getFirstDefinedEnvValue(env, CLIENT_SECRET_ENV_KEYS);

  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

function loadOAuthConfigFromJsonEnv(
  env: NodeJS.ProcessEnv,
): OAuthConfig | null {
  const rawJson = getFirstDefinedEnvValue(env, CLIENT_JSON_ENV_KEYS);

  if (rawJson) {
    return parseInstalledClientJson(rawJson, "YT_DDP_OAUTH_CLIENT_JSON");
  }

  const base64Json = getFirstDefinedEnvValue(env, CLIENT_JSON_BASE64_ENV_KEYS);

  if (!base64Json) {
    return null;
  }

  try {
    const decoded = Buffer.from(base64Json, "base64").toString("utf8");
    return parseInstalledClientJson(decoded, "YT_DDP_OAUTH_CLIENT_JSON_BASE64");
  } catch (error) {
    throw new Error(
      `Failed to decode YT_DDP_OAUTH_CLIENT_JSON_BASE64: ${getErrorMessage(error)}`,
    );
  }
}

function getConfiguredOAuthClientFilePath(
  env: NodeJS.ProcessEnv,
): string | null {
  return getFirstDefinedEnvValue(env, CLIENT_FILE_ENV_KEYS);
}

function getClientConfigPath(options: OAuthResolutionOptions = {}): string {
  return join(getConfigDir(options), OAUTH_CLIENT_FILENAME);
}

function getTokenPath(options: OAuthResolutionOptions = {}): string {
  return join(getConfigDir(options), TOKEN_FILENAME);
}

function getConfigDir(options: OAuthResolutionOptions = {}): string {
  if (options.configDir) {
    return resolve(options.configDir);
  }

  const env = options.env ?? process.env;
  const configuredDir =
    env.YT_DDP_CONFIG_DIR ?? env.YT_PLAYLIST_DEDUPE_CONFIG_DIR;
  if (configuredDir) {
    return resolve(configuredDir);
  }

  const baseDir =
    env.XDG_CONFIG_HOME ?? env.APPDATA ?? join(homedir(), ".config");

  return join(baseDir, "yt-ddp");
}

async function loadPersistedOAuthClientConfig(
  clientConfigPath: string,
): Promise<OAuthConfig | null> {
  try {
    const raw = await readFile(clientConfigPath, "utf8");
    return parsePersistedOAuthClientConfig(raw, clientConfigPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
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

function parsePersistedOAuthClientConfig(
  raw: string,
  sourceLabel: string,
): OAuthConfig {
  const parsed = JSON.parse(raw) as unknown;

  if (isRecord(parsed)) {
    const clientId =
      typeof parsed.clientId === "string" ? parsed.clientId : null;
    const clientSecret =
      typeof parsed.clientSecret === "string" ? parsed.clientSecret : null;

    if (clientId && clientSecret) {
      return { clientId, clientSecret };
    }
  }

  return parseInstalledClientJson(raw, sourceLabel);
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

function isLikelyWorkspaceOAuthClientFile(fileName: string): boolean {
  return WORKSPACE_OAUTH_FILE_PATTERNS.some((pattern) =>
    pattern.test(fileName),
  );
}

function scoreWorkspaceOAuthClientFile(fileName: string): number {
  const index = WORKSPACE_OAUTH_FILE_PATTERNS.findIndex((pattern) =>
    pattern.test(fileName),
  );

  return index === -1 ? -1 : WORKSPACE_OAUTH_FILE_PATTERNS.length - index;
}

function getFirstDefinedEnvValue(
  env: NodeJS.ProcessEnv,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = env[key];
    if (value) {
      return value;
    }
  }

  return null;
}

function createMissingOAuthConfigError(workspaceDir: string): Error {
  return new Error(
    `No OAuth client found. Run \`yt-ddp setup\`, or place your downloaded Desktop app OAuth JSON in ${workspaceDir}. Advanced options: set YT_DDP_OAUTH_CLIENT_ID and YT_DDP_OAUTH_CLIENT_SECRET, YT_DDP_OAUTH_CLIENT_JSON_BASE64, or YT_DDP_OAUTH_CLIENT_FILE.`,
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
