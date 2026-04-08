#!/usr/bin/env node

import { createInterface } from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import { getAuthenticatedClient } from "./auth.js";
import {
  type DuplicatePlaylistItem,
  findDuplicateVideos,
  getProtectedPlaylistName,
  isProtectedPlaylistId,
} from "./dedupe.js";
import { runSetup } from "./setup.js";
import {
  createYouTubeClient,
  deletePlaylistItemWithRetry,
  formatApiError,
  listPlaylistItems,
  YOUTUBE_SCOPE,
} from "./youtube.js";

const INTER_DELETE_DELAY_MS = 200;
const COMMANDS = new Set(["help", "scan", "setup"]);
const ALLOWED_FLAGS = new Set([
  "--dry-run",
  "--execute",
  "--help",
  "-h",
  "--playlist",
  "--yes",
] as const);

export interface CliOptions {
  command: "help" | "scan" | "setup";
  help: boolean;
  execute: boolean;
  yes: boolean;
  playlistId: string | null;
  playlistInput: string | null;
  playlistInputKind: "id" | "url" | null;
}

export async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));

  if (cli.help || cli.command === "help") {
    printUsage();
    return;
  }

  if (cli.command === "setup") {
    await runSetup();
    return;
  }

  if (!cli.playlistId) {
    printUsage();
    throw new Error(
      "Missing playlist input. Pass a playlist ID, a YouTube playlist/watch URL, or use --playlist.",
    );
  }

  if (isProtectedPlaylistId(cli.playlistId)) {
    const playlistName = getProtectedPlaylistName(cli.playlistId);
    throw new Error(
      `Refusing to operate on protected playlist ${cli.playlistId}${playlistName ? ` (${playlistName})` : ""}.`,
    );
  }

  printRunHeader(cli);
  console.log("Scanning playlist items...");
  console.log("");

  const authClient = await getAuthenticatedClient({
    scope: YOUTUBE_SCOPE,
    logger: console,
  });
  const youtube = createYouTubeClient(authClient);

  const playlistItems = await safelyListPlaylistItems(youtube, cli.playlistId);
  const { duplicates, itemsWithoutVideoId, uniqueVideoCount } =
    findDuplicateVideos(playlistItems);

  printScanSummary({
    scannedCount: playlistItems.length,
    uniqueVideoCount,
    duplicateCount: duplicates.length,
    duplicates,
    itemsWithoutVideoId,
  });

  if (duplicates.length === 0) {
    return;
  }

  if (!cli.execute) {
    console.log("");
    console.log(
      "Dry run only. Re-run with --execute to delete the duplicate playlist items listed above.",
    );
    return;
  }

  console.log("");
  if (!cli.yes) {
    console.log("Deletion warning:");
    console.log(
      "- Only duplicate playlist items from the playlist above will be deleted.",
    );
    console.log("- The first occurrence of each video will be kept.");
    console.log("- This action cannot be undone.");
    console.log("");

    const confirmed = await promptForConfirmation(
      "Proceed to delete? (yes/no) ",
    );
    if (!confirmed) {
      console.log("Deletion cancelled.");
      return;
    }
  } else {
    console.log("Auto-confirm enabled with --yes. Proceeding with deletion.");
  }

  let deletedCount = 0;

  for (const [index, duplicate] of duplicates.entries()) {
    console.log(
      `Deleting ${index + 1}/${duplicates.length}: [${duplicate.duplicateIndex}] ${duplicate.title}`,
    );

    try {
      await deletePlaylistItemWithRetry({
        youtube,
        playlistItemId: duplicate.playlistItemId,
        logger: console,
      });
      deletedCount += 1;
    } catch (error) {
      throw new Error(
        `Failed to delete playlist item ${duplicate.playlistItemId}: ${formatApiError(error)}`,
      );
    }

    await sleep(INTER_DELETE_DELAY_MS);
  }

  console.log("");
  console.log(
    `Deleted ${deletedCount} duplicate playlist item${deletedCount === 1 ? "" : "s"}.`,
  );
}

export function parseArgs(argv: string[]): CliOptions {
  let command: CliOptions["command"] = "scan";
  let sawExplicitCommand = false;
  let help = false;
  let execute = false;
  let sawDryRun = false;
  let yes = false;
  let playlistInput: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--help" || value === "-h") {
      help = true;
      continue;
    }

    if (value.startsWith("--")) {
      if (
        !ALLOWED_FLAGS.has(
          value as typeof ALLOWED_FLAGS extends Set<infer T> ? T : never,
        )
      ) {
        throw new Error(`Unknown flag: ${value}`);
      }

      if (value === "--execute") {
        execute = true;
        continue;
      }

      if (value === "--dry-run") {
        sawDryRun = true;
        continue;
      }

      if (value === "--yes") {
        yes = true;
        continue;
      }

      if (value === "--playlist") {
        const nextValue = argv[index + 1];
        if (!nextValue || nextValue.startsWith("--")) {
          throw new Error("Missing value for --playlist.");
        }

        if (playlistInput) {
          throw new Error("Provide the playlist only once.");
        }

        playlistInput = nextValue;
        index += 1;
        continue;
      }
    }

    if (!sawExplicitCommand && COMMANDS.has(value) && playlistInput === null) {
      command = value as CliOptions["command"];
      sawExplicitCommand = true;
      continue;
    }

    if (playlistInput) {
      throw new Error("Provide the playlist only once.");
    }

    playlistInput = value;
  }

  if (sawDryRun && execute) {
    throw new Error("Use either --dry-run or --execute, not both.");
  }

  if (yes && !execute) {
    throw new Error("Use --yes only together with --execute.");
  }

  if (command === "setup") {
    if (playlistInput) {
      throw new Error("The setup command does not take a playlist input.");
    }

    if (execute || sawDryRun || yes) {
      throw new Error(
        "The setup command does not accept scan or deletion flags.",
      );
    }

    return {
      command,
      help,
      execute: false,
      yes: false,
      playlistId: null,
      playlistInput: null,
      playlistInputKind: null,
    };
  }

  if (command === "help") {
    return {
      command,
      help: true,
      execute: false,
      yes: false,
      playlistId: null,
      playlistInput: null,
      playlistInputKind: null,
    };
  }

  const normalizedPlaylist = playlistInput
    ? normalizePlaylistInput(playlistInput)
    : null;

  return {
    command,
    help,
    execute,
    yes,
    playlistId: normalizedPlaylist?.playlistId ?? null,
    playlistInput,
    playlistInputKind: normalizedPlaylist?.inputKind ?? null,
  };
}

async function safelyListPlaylistItems(
  youtube: ReturnType<typeof createYouTubeClient>,
  playlistId: string,
) {
  try {
    return await listPlaylistItems({ youtube, playlistId });
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

function printUsage(): void {
  console.log("yt-ddp");
  console.log("");
  console.log("Usage:");
  console.log("  yt-ddp setup");
  console.log("  yt-ddp <playlist-id-or-url> [--execute] [--yes]");
  console.log(
    "  yt-ddp scan --playlist <playlist-id-or-url> [--execute] [--yes]",
  );
  console.log("");
  console.log("Commands:");
  console.log("  setup       Save Google Desktop OAuth credentials into .env");
  console.log(
    "  scan        Explicit scan command. This is also the default action.",
  );
  console.log("");
  console.log("Flags:");
  console.log("  --playlist  Playlist ID or full YouTube playlist/watch URL");
  console.log(
    "  --dry-run   Scan only and print duplicates. This is the default.",
  );
  console.log("  --execute   Delete duplicate playlist items.");
  console.log(
    "  --yes       Skip the delete confirmation prompt. Requires --execute.",
  );
  console.log("  --help, -h  Show this help text.");
  console.log("");
  console.log("Examples:");
  console.log("  yt-ddp setup");
  console.log('  yt-ddp "https://www.youtube.com/playlist?list=PLxxxxxxxx"');
  console.log("  yt-ddp --playlist PLxxxxxxxx --execute");
  console.log(
    '  yt-ddp "https://www.youtube.com/watch?v=abc123&list=PLxxxxxxxx" --execute --yes',
  );
}

function printScanSummary({
  scannedCount,
  uniqueVideoCount,
  duplicateCount,
  duplicates,
  itemsWithoutVideoId,
}: {
  scannedCount: number;
  uniqueVideoCount: number;
  duplicateCount: number;
  duplicates: DuplicatePlaylistItem[];
  itemsWithoutVideoId: number;
}): void {
  console.log("Scan summary");
  console.log(`Videos scanned: ${scannedCount}`);
  console.log(`Unique videos kept: ${uniqueVideoCount}`);
  console.log(`Duplicates found: ${duplicateCount}`);

  if (itemsWithoutVideoId > 0) {
    console.log(
      `Items skipped without a usable videoId: ${itemsWithoutVideoId}`,
    );
  }

  if (duplicateCount === 0) {
    console.log("No duplicates found.");
    return;
  }

  console.log("");
  console.log("Duplicate items to remove:");

  for (const duplicate of duplicates) {
    console.log(
      `- [${duplicate.duplicateIndex}] ${duplicate.title} -> keep item #${duplicate.firstOccurrenceIndex}`,
    );
  }
}

function printRunHeader(cli: CliOptions): void {
  if (cli.command !== "scan" || !cli.playlistId) {
    return;
  }

  console.log("yt-ddp");
  console.log("");
  console.log(`Mode: ${cli.execute ? "Execute" : "Dry run"}`);
  console.log(`Playlist: ${cli.playlistId}`);

  if (cli.playlistInputKind === "url" && cli.playlistInput) {
    console.log(`Input: URL (${cli.playlistInput})`);
  }

  console.log("Scope: only the playlist above will be scanned or modified.");
}

function normalizePlaylistInput(input: string): {
  playlistId: string;
  inputKind: "id" | "url";
} {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Playlist input cannot be empty.");
  }

  const playlistIdFromUrl = extractPlaylistIdFromUrl(trimmed);
  if (playlistIdFromUrl) {
    return {
      playlistId: validatePlaylistId(playlistIdFromUrl),
      inputKind: "url",
    };
  }

  return {
    playlistId: validatePlaylistId(trimmed),
    inputKind: "id",
  };
}

function extractPlaylistIdFromUrl(input: string): string | null {
  const candidate = /^[a-z]+:\/\//i.test(input)
    ? input
    : maybeLooksLikeYouTubeUrl(input)
      ? `https://${input}`
      : null;

  if (!candidate) {
    return input.includes("list=")
      ? extractPlaylistIdFromListParam(input)
      : null;
  }

  try {
    const url = new URL(candidate);
    if (!isYouTubeHostname(url.hostname)) {
      throw new Error("Only YouTube playlist URLs are supported.");
    }

    const playlistId = url.searchParams.get("list");
    if (!playlistId) {
      throw new Error("Playlist URL must include a list parameter.");
    }

    return playlistId;
  } catch (error) {
    if (input.includes("list=")) {
      return extractPlaylistIdFromListParam(input);
    }

    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

function extractPlaylistIdFromListParam(input: string): string | null {
  const match = input.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

function isYouTubeHostname(hostname: string): boolean {
  return (
    /(^|\.)youtube\.com$/i.test(hostname) ||
    /(^|\.)youtube-nocookie\.com$/i.test(hostname) ||
    /(^|\.)youtu\.be$/i.test(hostname)
  );
}

function maybeLooksLikeYouTubeUrl(input: string): boolean {
  return /(youtube\.com|youtube-nocookie\.com|youtu\.be)/i.test(input);
}

function validatePlaylistId(playlistId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(playlistId)) {
    throw new Error("Playlist ID contains invalid characters.");
  }

  return playlistId;
}

async function promptForConfirmation(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question(question, resolve);
    });
    return answer.trim().toLowerCase() === "yes";
  } finally {
    rl.close();
  }
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    console.error("");
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
