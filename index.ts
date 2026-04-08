import { createInterface } from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import { getAuthenticatedClient } from "./auth.js";
import {
  findDuplicateVideos,
  getProtectedPlaylistName,
  type DuplicatePlaylistItem,
  isProtectedPlaylistId,
} from "./dedupe.js";
import {
  YOUTUBE_SCOPE,
  createYouTubeClient,
  deletePlaylistItemWithRetry,
  formatApiError,
  listPlaylistItems,
} from "./youtube.js";

const INTER_DELETE_DELAY_MS = 200;
const ALLOWED_FLAGS = new Set(["--dry-run", "--execute", "--help", "-h"]);

export interface CliOptions {
  help: boolean;
  execute: boolean;
  playlistId: string | null;
}

export async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));

  if (cli.help) {
    printUsage();
    return;
  }

  if (!cli.playlistId) {
    printUsage();
    throw new Error("Missing required playlistId argument.");
  }

  if (isProtectedPlaylistId(cli.playlistId)) {
    const playlistName = getProtectedPlaylistName(cli.playlistId);
    throw new Error(
      `Refusing to operate on protected playlist ${cli.playlistId}${playlistName ? ` (${playlistName})` : ""}.`,
    );
  }

  console.log(`Mode: ${cli.execute ? "EXECUTE" : "DRY RUN"}`);
  console.log(`Target playlist: ${cli.playlistId}`);
  console.log("Safety warning: this tool only scans the playlist ID you provide and never touches any other playlist.");
  console.log("");

  const authClient = await getAuthenticatedClient({
    scope: YOUTUBE_SCOPE,
    logger: console,
  });
  const youtube = createYouTubeClient(authClient);

  const playlistItems = await safelyListPlaylistItems(youtube, cli.playlistId);
  const { duplicates, itemsWithoutVideoId } = findDuplicateVideos(playlistItems);

  printScanSummary({
    scannedCount: playlistItems.length,
    duplicateCount: duplicates.length,
    duplicates,
    itemsWithoutVideoId,
  });

  if (duplicates.length === 0) {
    return;
  }

  if (!cli.execute) {
    console.log("");
    console.log("Dry run only. Re-run with --execute to delete the duplicate playlist items listed above.");
    return;
  }

  console.log("");
  console.log("Deletion warning:");
  console.log("- Only duplicate playlist items from the playlist above will be deleted.");
  console.log("- The first occurrence of each video will be kept.");
  console.log("- This action cannot be undone.");
  console.log("");

  const confirmed = await promptForConfirmation("Proceed to delete? (yes/no) ");
  if (!confirmed) {
    console.log("Deletion cancelled.");
    return;
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
  console.log(`Deleted ${deletedCount} duplicate playlist item${deletedCount === 1 ? "" : "s"}.`);
}

export function parseArgs(argv: string[]): CliOptions {
  const flags = new Set(argv.filter((value) => value.startsWith("--") || value === "-h"));
  const positional = argv.filter((value) => !value.startsWith("--") && value !== "-h");

  const help = flags.has("--help") || flags.has("-h");
  const execute = flags.has("--execute");

  if (flags.has("--dry-run") && flags.has("--execute")) {
    throw new Error("Use either --dry-run or --execute, not both.");
  }

  for (const flag of flags) {
    if (!ALLOWED_FLAGS.has(flag)) {
      throw new Error(`Unknown flag: ${flag}`);
    }
  }

  if (positional.length > 1) {
    throw new Error("Only one playlistId can be provided.");
  }

  const playlistId = positional[0]?.trim() ?? null;
  if (playlistId !== null && !/^[A-Za-z0-9_-]+$/.test(playlistId)) {
    throw new Error("Playlist ID contains invalid characters.");
  }

  return {
    help,
    execute,
    playlistId,
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
  console.log("Usage: bun run index.ts <playlistId> [--dry-run|--execute]");
  console.log("");
  console.log("Flags:");
  console.log("  --dry-run   Scan only and print duplicates. This is the default.");
  console.log("  --execute   Delete duplicate playlist items after explicit confirmation.");
}

function printScanSummary({
  scannedCount,
  duplicateCount,
  duplicates,
  itemsWithoutVideoId,
}: {
  scannedCount: number;
  duplicateCount: number;
  duplicates: DuplicatePlaylistItem[];
  itemsWithoutVideoId: number;
}): void {
  console.log(`Total videos scanned: ${scannedCount}`);
  console.log(`Total duplicates found: ${duplicateCount}`);

  if (itemsWithoutVideoId > 0) {
    console.log(`Items skipped without a usable videoId: ${itemsWithoutVideoId}`);
  }

  if (duplicateCount === 0) {
    console.log("No duplicates found.");
    return;
  }

  console.log("");
  console.log("Duplicates:");

  for (const duplicate of duplicates) {
    console.log(
      `- [${duplicate.duplicateIndex}] ${duplicate.title} (keeping item #${duplicate.firstOccurrenceIndex})`,
    );
  }
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
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
