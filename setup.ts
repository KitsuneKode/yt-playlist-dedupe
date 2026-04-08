import { readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  createInterface,
  type Interface as ReadlineInterface,
} from "node:readline/promises";
import { inspectOAuthSetup, readOAuthClientFile } from "./auth.js";

const ENV_FILE = ".env";
const OAUTH_KEYS = [
  "YT_DDP_OAUTH_CLIENT_ID",
  "YT_DDP_OAUTH_CLIENT_SECRET",
  "YT_DDP_OAUTH_CLIENT_JSON",
  "YT_DDP_OAUTH_CLIENT_JSON_BASE64",
  "YT_DDP_OAUTH_CLIENT_FILE",
  "YOUTUBE_OAUTH_CLIENT_ID",
  "YOUTUBE_OAUTH_CLIENT_SECRET",
  "YOUTUBE_OAUTH_CLIENT_JSON",
  "YOUTUBE_OAUTH_CLIENT_JSON_BASE64",
  "YOUTUBE_OAUTH_CLIENT_FILE",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_CLIENT_JSON",
  "GOOGLE_OAUTH_CLIENT_JSON_BASE64",
  "GOOGLE_OAUTH_CLIENT_FILE",
] as const;

export async function runSetup(): Promise<void> {
  const setupStatus = inspectOAuthSetup();
  const suggestedFile = await findSuggestedOAuthClientFile();
  const envPath = resolve(process.cwd(), ENV_FILE);

  console.log("yt-ddp setup");
  console.log("");
  console.log(
    "This wizard stores your Google Desktop app OAuth credentials in a local .env file.",
  );
  console.log(`OAuth token cache: ${setupStatus.tokenPath}`);
  console.log(`Current config: ${setupStatus.source ?? "not set"}`);

  if (suggestedFile) {
    console.log(`Detected OAuth client file: ${suggestedFile}`);
  }

  console.log("");
  console.log("Need the Desktop app OAuth JSON from Google Cloud Console:");
  console.log("1. Enable the YouTube Data API v3.");
  console.log("2. Create OAuth client credentials for a Desktop app.");
  console.log("3. Download the JSON file.");
  console.log("");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const credentialsPath = await promptForCredentialsFile({
      rl,
      suggestedFile,
      allowEmpty: setupStatus.configured,
    });

    if (!credentialsPath) {
      console.log("No changes made.");
      return;
    }

    const oauthConfig = await readOAuthClientFile(credentialsPath);
    const existingEnv = await loadOptionalFile(envPath);
    const nextEnv = upsertOAuthEnv(existingEnv, {
      YT_DDP_OAUTH_CLIENT_ID: oauthConfig.clientId,
      YT_DDP_OAUTH_CLIENT_SECRET: oauthConfig.clientSecret,
    });

    await writeFile(envPath, nextEnv);

    console.log("");
    console.log(`Saved OAuth credentials to ${envPath}`);
    console.log("Next steps:");
    console.log(
      '1. Run `yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID"`',
    );
    console.log("2. Sign in once when the browser prompt opens.");
    console.log("3. Re-run with --execute when the dry run looks right.");
  } finally {
    rl.close();
  }
}

export function upsertOAuthEnv(
  existingContents: string,
  entries: Record<string, string>,
): string {
  const remainingEntries = new Map(Object.entries(entries));
  const nextLines: string[] = [];

  for (const line of existingContents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) {
      nextLines.push(line);
      continue;
    }

    const key = match[1];

    if (OAUTH_KEYS.includes(key as (typeof OAUTH_KEYS)[number])) {
      const nextValue = remainingEntries.get(key);
      if (nextValue !== undefined) {
        nextLines.push(`${key}=${formatEnvValue(nextValue)}`);
        remainingEntries.delete(key);
      }
      continue;
    }

    nextLines.push(line);
  }

  while (nextLines.length > 0 && nextLines.at(-1) === "") {
    nextLines.pop();
  }

  if (nextLines.length > 0) {
    nextLines.push("");
  }

  if (remainingEntries.size > 0) {
    nextLines.push("# yt-ddp OAuth");
    for (const [key, value] of remainingEntries) {
      nextLines.push(`${key}=${formatEnvValue(value)}`);
    }
  }

  nextLines.push("");
  return nextLines.join("\n");
}

async function promptForCredentialsFile({
  rl,
  suggestedFile,
  allowEmpty,
}: {
  rl: ReadlineInterface;
  suggestedFile: string | null;
  allowEmpty: boolean;
}): Promise<string | null> {
  while (true) {
    const prompt = suggestedFile
      ? `Path to OAuth JSON [${suggestedFile}]: `
      : "Path to OAuth JSON: ";
    const answer = (await rl.question(prompt)).trim();

    if (!answer) {
      if (allowEmpty) {
        return null;
      }

      if (suggestedFile) {
        try {
          await readOAuthClientFile(suggestedFile);
          return suggestedFile;
        } catch (error) {
          console.log(
            `Could not use ${suggestedFile}: ${error instanceof Error ? error.message : String(error)}`,
          );
          console.log(
            "Try again with the path to the downloaded Desktop app OAuth JSON.",
          );
          continue;
        }
      }

      console.log("A Desktop app OAuth JSON file is required for setup.");
      continue;
    }

    const resolvedPath = resolveUserPath(answer);

    try {
      await readOAuthClientFile(resolvedPath);
      return resolvedPath;
    } catch (error) {
      console.log(
        `Could not use ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.log(
        "Try again with the path to the downloaded Desktop app OAuth JSON.",
      );
    }
  }
}

async function findSuggestedOAuthClientFile(): Promise<string | null> {
  try {
    const entries = await readdir(process.cwd(), { withFileTypes: true });
    const match = entries.find(
      (entry) =>
        entry.isFile() &&
        /^(oauth-client.*|client_secret.*|credentials.*)\.json$/i.test(
          entry.name,
        ),
    );

    return match ? resolve(process.cwd(), match.name) : null;
  } catch {
    return null;
  }
}

async function loadOptionalFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }

    throw error;
  }
}

function resolveUserPath(filePath: string): string {
  if (filePath === "~") {
    return homedir();
  }

  if (filePath.startsWith("~/")) {
    return resolve(homedir(), filePath.slice(2));
  }

  return resolve(filePath);
}

function formatEnvValue(value: string): string {
  return /^[A-Za-z0-9_./:@-]+$/.test(value) ? value : JSON.stringify(value);
}
