import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  createInterface,
  type Interface as ReadlineInterface,
} from "node:readline/promises";
import {
  inspectOAuthSetup,
  readOAuthClientFile,
  savePersistedOAuthClientConfig,
} from "./auth.js";

type PromptReader = Pick<ReadlineInterface, "question">;

export async function runSetup(): Promise<void> {
  const setupStatus = await inspectOAuthSetup();

  console.log("yt-ddp setup");
  console.log("");
  console.log(
    "This wizard saves your Google Desktop app OAuth credentials into yt-ddp's local config directory.",
  );
  console.log(`OAuth token cache: ${setupStatus.tokenPath}`);
  console.log(`OAuth client config: ${setupStatus.clientConfigPath}`);
  console.log(`Current config: ${setupStatus.source ?? "not set"}`);

  if (setupStatus.suggestedClientFile) {
    console.log(
      `Detected OAuth client file: ${setupStatus.suggestedClientFile}`,
    );
    console.log("Press Enter to use it.");
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
      allowEmpty:
        setupStatus.configured && setupStatus.sourceKind !== "workspace-file",
      rl,
      suggestedFile: setupStatus.suggestedClientFile,
    });

    if (!credentialsPath) {
      console.log("No changes made.");
      return;
    }

    const oauthConfig = await readOAuthClientFile(credentialsPath);
    const savedConfigPath = await savePersistedOAuthClientConfig(oauthConfig);

    console.log("");
    console.log(`Saved OAuth client config to ${savedConfigPath}`);
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

export async function promptForCredentialsFile({
  allowEmpty,
  rl,
  suggestedFile,
}: {
  allowEmpty: boolean;
  rl: PromptReader;
  suggestedFile: string | null;
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

function resolveUserPath(filePath: string): string {
  if (filePath === "~") {
    return homedir();
  }

  if (filePath.startsWith("~/")) {
    return resolve(homedir(), filePath.slice(2));
  }

  return resolve(filePath);
}
