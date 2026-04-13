#!/usr/bin/env node

import { createInterface } from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import { getAuthenticatedClient, type OAuthClient } from "./auth.js";
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
  getErrorReason,
  getStatusCode,
  listPlaylistItems,
  type PlaylistItemSummary,
  shouldAbortRemainingDeletions,
  YOUTUBE_SCOPE,
} from "./youtube.js";

const INTER_DELETE_DELAY_MS = 200;
const ANSI_RESET = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K";
const PROGRESS_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const COMMANDS = new Set(["help", "scan", "setup", "login", "completion"]);
const ALLOWED_FLAGS = new Set([
  "--dry-run",
  "--execute",
  "--help",
  "--json",
  "-h",
  "--playlist",
  "--yes",
] as const);
const COLORS_ENABLED = process.env.FORCE_COLOR
  ? process.env.FORCE_COLOR !== "0"
  : !process.env.NO_COLOR && process.stdout.isTTY;
const PROGRESS_ENABLED =
  process.stderr.isTTY && !process.env.CI && process.env.TERM !== "dumb";

const style = {
  accent: (text: string) => colorize(text, "36"),
  danger: (text: string) => colorize(text, "31"),
  dim: (text: string) => colorize(text, "2"),
  heading: (text: string) => colorize(text, "1", "36"),
  muted: (text: string) => colorize(text, "90"),
  ok: (text: string) => colorize(text, "32"),
  strong: (text: string) => colorize(text, "1"),
  warn: (text: string) => colorize(text, "33"),
};

export interface CliOptions {
  command: "completion" | "help" | "login" | "scan" | "setup";
  completionShell: "zsh" | null;
  execute: boolean;
  help: boolean;
  outputJson: boolean;
  playlistId: string | null;
  playlistInput: string | null;
  playlistInputKind: "id" | "url" | null;
  yes: boolean;
}

interface DuplicateGroup {
  copyCount: number;
  duplicates: DuplicatePlaylistItem[];
  firstOccurrenceIndex: number;
  keptPlaylistItemId: string;
  keptTitle: string;
  removableCount: number;
}

interface ScanReport {
  duplicateGroups: DuplicateGroup[];
  duplicateItemCount: number;
  itemsWithoutVideoId: number;
  playlistCountAfterCleanup: number;
  playlistId: string;
  scannedCount: number;
  uniqueVideoCount: number;
}

interface DeletionFailure {
  duplicateIndex: number;
  message: string;
  playlistItemId: string;
  title: string;
}

interface DeletionReport {
  aborted: boolean;
  abortedReason: string | null;
  deletedCount: number;
  failed: DeletionFailure[];
  skippedCount: number;
}

class Spinner {
  private frameIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(private text: string) {}

  start(): void {
    if (!PROGRESS_ENABLED) {
      return;
    }

    this.render();
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % PROGRESS_FRAMES.length;
      this.render();
    }, 80);
  }

  update(text: string): void {
    this.text = text;

    if (!PROGRESS_ENABLED) {
      return;
    }

    this.render();
  }

  succeed(text: string): void {
    this.finish(`${style.ok("✔")} ${text}`);
  }

  fail(text: string): void {
    this.finish(`${style.danger("✖")} ${text}`);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (PROGRESS_ENABLED) {
      process.stderr.write(`\r${CLEAR_LINE}\r`);
    }
  }

  private finish(text: string): void {
    if (!PROGRESS_ENABLED) {
      return;
    }

    this.stop();
    process.stderr.write(`${text}\n`);
  }

  private render(): void {
    if (!PROGRESS_ENABLED) {
      return;
    }

    const frame = style.accent(PROGRESS_FRAMES[this.frameIndex]);
    process.stderr.write(`\r${CLEAR_LINE}\r${frame} ${this.text}`);
  }
}

export async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));

  if (cli.help || cli.command === "help") {
    printUsage();
    return;
  }

  if (cli.command === "setup" || cli.command === "login") {
    await runSetup();
    return;
  }

  if (cli.command === "completion") {
    printCompletion(cli.completionShell ?? "zsh");
    return;
  }

  if (!cli.playlistId) {
    if (cli.outputJson) {
      printJson({
        error: {
          code: "missing_playlist_input",
          message:
            "Pass a playlist URL or playlist ID to scan, or use --playlist.",
        },
        ok: false,
      });
      process.exitCode = 1;
      return;
    }

    printMissingPlaylistHelp();
    return;
  }

  if (isProtectedPlaylistId(cli.playlistId)) {
    const playlistName = getProtectedPlaylistName(cli.playlistId);
    throw new Error(
      `Refusing to operate on protected playlist ${cli.playlistId}${playlistName ? ` (${playlistName})` : ""}.`,
    );
  }

  if (!cli.outputJson) {
    printRunHeader(cli);
  }

  const authSpinner = new Spinner("Checking OAuth configuration...");
  if (PROGRESS_ENABLED) {
    authSpinner.start();
  } else if (!cli.outputJson) {
    console.log(`${style.accent("Auth")} Checking OAuth configuration...`);
    console.log("");
  }

  let authClient: OAuthClient;

  try {
    authClient = await getAuthenticatedClient({
      scope: YOUTUBE_SCOPE,
      logger: console,
    });
    authSpinner.succeed("OAuth ready");
  } catch (error) {
    authSpinner.fail("OAuth setup needs attention");
    throw error;
  }

  const youtube = createYouTubeClient(authClient);
  const scanSpinner = new Spinner("Reading playlist items...");
  if (PROGRESS_ENABLED) {
    scanSpinner.start();
  } else if (!cli.outputJson) {
    console.log(`${style.accent("Scan")} Reading playlist items...`);
    console.log("");
  }

  let playlistItems: PlaylistItemSummary[];

  try {
    playlistItems = await safelyListPlaylistItems(
      youtube,
      cli.playlistId,
      scanSpinner,
    );
    scanSpinner.succeed(`Loaded ${playlistItems.length} playlist items`);
  } catch (error) {
    scanSpinner.fail("Playlist scan stopped");
    throw error;
  }

  const { duplicates, itemsWithoutVideoId, uniqueVideoCount } =
    findDuplicateVideos(playlistItems);
  const scanReport = createScanReport({
    duplicates,
    itemsWithoutVideoId,
    playlistId: cli.playlistId,
    scannedCount: playlistItems.length,
    uniqueVideoCount,
  });

  if (!cli.outputJson) {
    printScanSummary(scanReport);
  }

  if (scanReport.duplicateItemCount === 0) {
    if (cli.outputJson) {
      printJson({
        ok: true,
        report: scanReport,
      });
    }
    return;
  }

  if (!cli.execute) {
    if (!cli.outputJson) {
      console.log("");
      console.log(
        `${style.warn("Dry run only.")} Re-run with --execute to delete the duplicate playlist items listed above.`,
      );
    } else {
      printJson({
        ok: true,
        report: scanReport,
      });
    }
    return;
  }

  if (!cli.yes) {
    if (!cli.outputJson) {
      console.log("");
      console.log(style.warn("Deletion warning"));
      console.log(
        "- Only duplicate playlist items from the playlist above will be deleted.",
      );
      console.log("- The first occurrence of each video will be kept.");
      console.log(
        `- Type ${style.strong(`delete ${scanReport.duplicateItemCount}`)} to confirm.`,
      );
      console.log("");
    }

    const confirmed = await promptForDeletionConfirmation(
      scanReport.duplicateItemCount,
    );
    if (!confirmed) {
      if (!cli.outputJson) {
        console.log(style.warn("Deletion cancelled."));
      } else {
        printJson({
          ok: true,
          report: scanReport,
        });
      }
      return;
    }
  } else if (!cli.outputJson) {
    console.log("");
    console.log(
      `${style.warn("Auto-confirm enabled")} with --yes. Proceeding with deletion.`,
    );
  }

  const deletionReport = await deleteDuplicates({
    duplicates,
    outputJson: cli.outputJson,
    youtube,
  });

  if (cli.outputJson) {
    printJson({
      ok: deletionReport.failed.length === 0 && !deletionReport.aborted,
      report: scanReport,
      deletion: deletionReport,
    });
  } else {
    printDeletionSummary(deletionReport);
  }

  if (deletionReport.failed.length > 0 || deletionReport.aborted) {
    process.exitCode = 1;
  }
}

export function parseArgs(argv: string[]): CliOptions {
  let command: CliOptions["command"] = "scan";
  let sawExplicitCommand = false;
  let help = false;
  let execute = false;
  let sawDryRun = false;
  let yes = false;
  let outputJson = false;
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

      if (value === "--json") {
        outputJson = true;
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

  if (command === "setup" || command === "login") {
    if (playlistInput) {
      throw new Error(`The ${command} command does not take a playlist input.`);
    }

    if (execute || sawDryRun || yes) {
      throw new Error(
        `The ${command} command does not accept scan or deletion flags.`,
      );
    }

    return {
      command,
      completionShell: null,
      execute: false,
      help,
      outputJson,
      playlistId: null,
      playlistInput: null,
      playlistInputKind: null,
      yes: false,
    };
  }

  if (command === "completion") {
    if (execute || sawDryRun || yes) {
      throw new Error(
        "The completion command does not accept scan or deletion flags.",
      );
    }

    if (playlistInput && playlistInput !== "zsh") {
      throw new Error("Supported completion shells: zsh");
    }

    return {
      command,
      completionShell: (playlistInput ?? "zsh") as "zsh",
      execute: false,
      help,
      outputJson: false,
      playlistId: null,
      playlistInput: null,
      playlistInputKind: null,
      yes: false,
    };
  }

  if (command === "help") {
    return {
      command,
      completionShell: null,
      execute: false,
      help: true,
      outputJson: false,
      playlistId: null,
      playlistInput: null,
      playlistInputKind: null,
      yes: false,
    };
  }

  const normalizedPlaylist = playlistInput
    ? normalizePlaylistInput(playlistInput)
    : null;

  return {
    command,
    completionShell: null,
    execute,
    help,
    outputJson,
    playlistId: normalizedPlaylist?.playlistId ?? null,
    playlistInput,
    playlistInputKind: normalizedPlaylist?.inputKind ?? null,
    yes,
  };
}

async function safelyListPlaylistItems(
  youtube: ReturnType<typeof createYouTubeClient>,
  playlistId: string,
  spinner: Spinner,
) {
  try {
    return await listPlaylistItems({
      logger: console,
      onProgress: ({ itemsFetched, pageCount }) => {
        spinner.update(
          `Reading playlist items... ${itemsFetched} fetched across ${pageCount} page${pageCount === 1 ? "" : "s"}`,
        );
      },
      playlistId,
      youtube,
    });
  } catch (error) {
    throw new Error(formatApiError(error));
  }
}

function printUsage(): void {
  console.log(style.heading("yt-ddp"));
  console.log("");
  console.log(style.strong("Usage:"));
  console.log("  yt-ddp setup");
  console.log("  yt-ddp login");
  console.log("  yt-ddp <playlist-id-or-url> [--execute] [--yes] [--json]");
  console.log(
    "  yt-ddp scan --playlist <playlist-id-or-url> [--execute] [--yes] [--json]",
  );
  console.log("  yt-ddp completion zsh");
  console.log("");
  console.log(style.strong("Commands:"));
  console.log(
    "  setup       Save Google Desktop OAuth credentials into local app config",
  );
  console.log("  login       Friendly alias for setup");
  console.log(
    "  scan        Explicit scan command. This is also the default action.",
  );
  console.log("  completion  Print a shell completion script");
  console.log("");
  console.log(style.strong("Flags:"));
  console.log("  --playlist  Playlist ID or full YouTube playlist/watch URL");
  console.log(
    "  --dry-run   Scan only and print duplicates. This is the default.",
  );
  console.log("  --execute   Delete duplicate playlist items.");
  console.log(
    "  --yes       Skip the delete confirmation prompt. Requires --execute.",
  );
  console.log("  --json      Print machine-readable scan/deletion output");
  console.log("  --help, -h  Show this help text.");
  console.log("");
  console.log(style.strong("Examples:"));
  console.log("  yt-ddp setup");
  console.log('  yt-ddp "https://www.youtube.com/playlist?list=PLxxxxxxxx"');
  console.log("  yt-ddp --playlist PLxxxxxxxx --execute");
  console.log("  yt-ddp completion zsh > ~/.zfunc/_yt-ddp");
}

function printMissingPlaylistHelp(): void {
  console.log(style.heading("yt-ddp"));
  console.log("");
  console.log(
    "Ready when you are. Pass a playlist URL or playlist ID to scan.",
  );
  console.log("");
  console.log(style.strong("Try:"));
  console.log('  yt-ddp "https://www.youtube.com/playlist?list=PLxxxxxxxx"');
  console.log("  yt-ddp PLxxxxxxxx");
  console.log("  yt-ddp setup");
  console.log("");
  console.log(style.dim("Use `yt-ddp --help` to see all commands and flags."));
}

function createScanReport({
  duplicates,
  itemsWithoutVideoId,
  playlistId,
  scannedCount,
  uniqueVideoCount,
}: {
  duplicates: DuplicatePlaylistItem[];
  itemsWithoutVideoId: number;
  playlistId: string;
  scannedCount: number;
  uniqueVideoCount: number;
}): ScanReport {
  const duplicateGroups = groupDuplicatesByKeptItem(duplicates);

  return {
    duplicateGroups,
    duplicateItemCount: duplicates.length,
    itemsWithoutVideoId,
    playlistCountAfterCleanup: scannedCount - duplicates.length,
    playlistId,
    scannedCount,
    uniqueVideoCount,
  };
}

function printScanSummary(report: ScanReport): void {
  console.log(style.heading("Scan summary"));
  console.log(style.muted("------------"));
  console.log(summaryLine("Playlist items scanned", report.scannedCount));
  console.log(summaryLine("Unique videos found", report.uniqueVideoCount));
  console.log(summaryLine("Duplicate groups", report.duplicateGroups.length));
  console.log(summaryLine("Extra copies removable", report.duplicateItemCount));
  console.log(
    summaryLine(
      "Playlist size after cleanup",
      report.playlistCountAfterCleanup,
    ),
  );

  if (report.itemsWithoutVideoId > 0) {
    console.log(
      `${style.warn("Items skipped without a usable videoId")}: ${style.warn(String(report.itemsWithoutVideoId))}`,
    );
  }

  if (report.duplicateItemCount === 0) {
    console.log(style.ok("No duplicates found."));
    return;
  }

  console.log("");
  console.log(style.heading("Duplicate groups"));
  console.log(style.muted("----------------"));

  for (const [groupIndex, group] of report.duplicateGroups.entries()) {
    console.log(
      `${style.strong(`${groupIndex + 1}.`)} ${group.keptTitle} ${style.muted(`(${group.copyCount} copies, remove ${group.removableCount})`)}`,
    );
    console.log(
      `   ${style.ok("Keep")} #${style.ok(String(group.firstOccurrenceIndex))}`,
    );

    for (const duplicate of group.duplicates) {
      console.log(
        `   ${style.danger("Remove")} #${style.danger(String(duplicate.duplicateIndex))}: ${duplicate.title}`,
      );
    }
  }
}

async function deleteDuplicates({
  duplicates,
  outputJson,
  youtube,
}: {
  duplicates: DuplicatePlaylistItem[];
  outputJson: boolean;
  youtube: ReturnType<typeof createYouTubeClient>;
}): Promise<DeletionReport> {
  const failures: DeletionFailure[] = [];
  let aborted = false;
  let abortedReason: string | null = null;
  let consecutiveFailures = 0;
  let deletedCount = 0;

  for (const [index, duplicate] of duplicates.entries()) {
    if (!outputJson) {
      console.log(
        `${style.accent("Delete")} ${index + 1}/${duplicates.length}: #${duplicate.duplicateIndex} ${duplicate.title}`,
      );
    }

    try {
      await deletePlaylistItemWithRetry({
        logger: console,
        playlistItemId: duplicate.playlistItemId,
        youtube,
      });
      deletedCount += 1;
      consecutiveFailures = 0;
    } catch (error) {
      const message = formatApiError(error);
      failures.push({
        duplicateIndex: duplicate.duplicateIndex,
        message,
        playlistItemId: duplicate.playlistItemId,
        title: duplicate.title,
      });
      consecutiveFailures += 1;

      if (!outputJson) {
        console.log(
          `  ${style.warn("Skipped")} #${duplicate.duplicateIndex}: ${message}`,
        );
      }

      if (shouldAbortRemainingDeletions(error)) {
        aborted = true;
        abortedReason = message;
        break;
      }

      if (consecutiveFailures >= 3) {
        aborted = true;
        abortedReason =
          "Stopped after 3 consecutive delete failures to avoid making a bad situation worse.";
        break;
      }
    }

    await sleep(INTER_DELETE_DELAY_MS);
  }

  return {
    aborted,
    abortedReason,
    deletedCount,
    failed: failures,
    skippedCount: duplicates.length - deletedCount - failures.length,
  };
}

function printDeletionSummary(report: DeletionReport): void {
  console.log("");
  console.log(style.heading("Delete summary"));
  console.log(style.muted("--------------"));
  console.log(summaryLine("Deleted", report.deletedCount));
  console.log(summaryLine("Failed", report.failed.length));

  if (report.aborted) {
    console.log(`${style.warn("Stopped early")}: ${report.abortedReason}`);
  }

  if (report.failed.length === 0 && !report.aborted) {
    console.log(style.ok("All duplicate items were removed."));
    return;
  }

  if (report.failed.length > 0) {
    console.log("");
    console.log(style.warn("Failed removals"));
    console.log(style.muted("----------------"));
    for (const failure of report.failed) {
      console.log(
        `- #${failure.duplicateIndex} ${failure.title}: ${failure.message}`,
      );
    }
  }
}

function groupDuplicatesByKeptItem(
  duplicates: DuplicatePlaylistItem[],
): DuplicateGroup[] {
  const groups = new Map<
    string,
    {
      duplicates: DuplicatePlaylistItem[];
      firstOccurrenceIndex: number;
      keptPlaylistItemId: string;
      keptTitle: string;
    }
  >();

  for (const duplicate of duplicates) {
    const existingGroup = groups.get(duplicate.keptPlaylistItemId);

    if (existingGroup) {
      existingGroup.duplicates.push(duplicate);
      continue;
    }

    groups.set(duplicate.keptPlaylistItemId, {
      duplicates: [duplicate],
      firstOccurrenceIndex: duplicate.firstOccurrenceIndex,
      keptPlaylistItemId: duplicate.keptPlaylistItemId,
      keptTitle: duplicate.keptTitle,
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    copyCount: group.duplicates.length + 1,
    removableCount: group.duplicates.length,
  }));
}

function summaryLine(label: string, value: number): string {
  return `${style.dim(label)}: ${style.strong(String(value))}`;
}

function printRunHeader(cli: CliOptions): void {
  if (cli.command !== "scan" || !cli.playlistId) {
    return;
  }

  console.log(style.heading("yt-ddp"));
  console.log("");
  console.log(
    `Mode: ${cli.execute ? style.danger("Execute") : style.warn("Dry run")}`,
  );
  console.log(`Playlist: ${style.accent(cli.playlistId)}`);

  if (cli.playlistInputKind === "url" && cli.playlistInput) {
    console.log(`Input: URL (${cli.playlistInput})`);
  }

  console.log(
    style.dim("Scope: only the playlist above will be scanned or modified."),
  );
  console.log("");
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
      inputKind: "url",
      playlistId: validatePlaylistId(playlistIdFromUrl),
    };
  }

  return {
    inputKind: "id",
    playlistId: validatePlaylistId(trimmed),
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

async function promptForDeletionConfirmation(
  duplicateCount: number,
): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const expectedPhrase = `delete ${duplicateCount}`;

  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question(`Type "${expectedPhrase}" to continue: `, resolve);
    });
    return answer.trim().toLowerCase() === expectedPhrase;
  } finally {
    rl.close();
  }
}

function printCompletion(shell: "zsh"): void {
  if (shell !== "zsh") {
    throw new Error("Supported completion shells: zsh");
  }

  process.stdout.write(`${getZshCompletionScript()}\n`);
}

function getZshCompletionScript(): string {
  return `#compdef yt-ddp

local context state line
typeset -A opt_args

_yt_ddp_commands=(
  'scan:scan a playlist for duplicates'
  'setup:save OAuth client credentials to local app config'
  'login:alias for setup'
  'completion:print a shell completion script'
  'help:show help'
)

_arguments -C \\
  '--playlist[Playlist ID or full YouTube playlist/watch URL]:playlist input:' \\
  '--dry-run[Scan only and print duplicates]' \\
  '--execute[Delete duplicate playlist items]' \\
  '--yes[Skip delete confirmation; requires --execute]' \\
  '--json[Print machine-readable output]' \\
  '--help[Show help text]' \\
  '-h[Show help text]' \\
  '1:command or playlist:->first' \\
  '*::args:->rest'

case $state in
  first)
    _describe 'commands' _yt_ddp_commands
    ;;
  rest)
    case $words[2] in
      completion)
        _values 'shell' zsh
        ;;
      scan)
        _message 'playlist id or YouTube playlist URL'
        ;;
    esac
    ;;
esac
`;
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function colorize(text: string, ...codes: string[]): string {
  return COLORS_ENABLED ? `\x1b[${codes.join(";")}m${text}${ANSI_RESET}` : text;
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    if (process.argv.includes("--json")) {
      printJson({
        error: {
          message,
        },
        ok: false,
      });
    } else {
      console.error("");
      console.error(`${style.danger("Error")}: ${message}`);

      const reason = getErrorReason(error);
      const status = getStatusCode(error);

      if (
        message.includes("Google authorization was denied or blocked") ||
        reason === "quotaExceeded" ||
        status === 401
      ) {
        console.error("");
        console.error(style.strong("Helpful next steps:"));
        console.error(
          "- Run `yt-ddp setup` and make sure you are using a Google Desktop app OAuth client JSON.",
        );
        console.error(
          "- If Google says the app is still being tested, add your Google account as a test user in the OAuth consent screen.",
        );
        console.error(
          "- If you are using someone else's OAuth client, the owner must approve your account or publish/verify the app.",
        );
      }
    }

    process.exitCode = 1;
  });
}
