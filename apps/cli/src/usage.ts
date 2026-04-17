import { chmod, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getAppConfigDir, type OAuthResolutionOptions } from "./auth.js";
import type { PlaylistItemSummary } from "@yt-ddp/core";
import { PLAYLIST_ITEMS_DELETE_QUOTA_COST, PLAYLIST_ITEMS_LIST_QUOTA_COST } from "./youtube.js";

const PLAYLIST_CACHE_DIRNAME = "playlist-cache";
const QUOTA_LEDGER_FILENAME = "quota-ledger.json";
const PLAYLIST_CACHE_VERSION = 1;
const QUOTA_LEDGER_VERSION = 1;
const DEFAULT_PLAYLIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function getMidnightPT(): Date {
  const now = new Date();
  const yyyyMmDd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(now);

  const d8 = new Date(`${yyyyMmDd}T00:00:00-08:00`);
  const d7 = new Date(`${yyyyMmDd}T00:00:00-07:00`);

  const h8 = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hour12: false,
  }).format(d8);

  if (h8 === "24" || h8 === "0" || h8 === "00") return d8;
  return d7;
}
const MAX_QUOTA_LEDGER_ENTRIES = 500;
const REFERENCE_DAILY_QUOTA_UNITS = 10_000;

type UsageOptions = Pick<OAuthResolutionOptions, "configDir" | "env">;

interface StoredPlaylistScanCache {
  cachedAt: string;
  items: PlaylistItemSummary[];
  pageCount: number;
  playlistId: string;
  version: number;
}

interface StoredQuotaLedger {
  entries: QuotaLedgerEntry[];
  version: number;
}

export interface CachedPlaylistScan {
  ageMs: number;
  cachedAt: string;
  estimatedQuotaUnitsSaved: number;
  items: PlaylistItemSummary[];
  pageCount: number;
  playlistId: string;
}

export interface PlaylistScanCacheEntry {
  ageMs: number;
  cachedAt: string;
  estimatedQuotaUnitsSaved: number;
  itemCount: number;
  pageCount: number;
  playlistId: string;
}

export interface QuotaLedgerEntry {
  at: string;
  attemptedDeletes?: number;
  cacheAgeMs?: number;
  deletedCount?: number;
  estimatedUnits: number;
  estimatedUnitsSaved?: number;
  failedCount?: number;
  itemCount?: number;
  pageCount?: number;
  playlistId?: string;
  type: "delete-batch" | "scan-cache-hit" | "scan-live";
}

export interface QuotaUsageReport {
  cache: {
    enabled: boolean;
    entries: PlaylistScanCacheEntry[];
    ttlMinutes: number;
  };
  configDir: string;
  generatedAt: string;
  referenceDailyQuotaUnits: number;
  usage: {
    cacheHitsToday: number;
    deleteBatchesToday: number;
    estimatedUnitsLast7Days: number;
    estimatedUnitsSavedByCacheToday: number;
    estimatedUnitsToday: number;
    estimatedUnitsTotal: number;
    liveScansToday: number;
    percentOfReferenceDailyQuotaUsedToday: number;
  };
}

export function getPlaylistCacheTtlMs(options: UsageOptions = {}): number {
  const rawValue =
    options.env?.YT_DDP_PLAYLIST_CACHE_TTL_MINUTES ?? process.env.YT_DDP_PLAYLIST_CACHE_TTL_MINUTES;

  if (rawValue === undefined) {
    return DEFAULT_PLAYLIST_CACHE_TTL_MS;
  }

  const parsedMinutes = Number(rawValue);
  if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
    return DEFAULT_PLAYLIST_CACHE_TTL_MS;
  }

  return Math.floor(parsedMinutes * 60 * 1000);
}

export async function readPlaylistScanCache({
  playlistId,
  ...options
}: UsageOptions & {
  playlistId: string;
}): Promise<CachedPlaylistScan | null> {
  const ttlMs = getPlaylistCacheTtlMs(options);
  if (ttlMs <= 0) {
    return null;
  }

  const cachePath = getPlaylistCachePath(playlistId, options);

  try {
    const raw = await readFile(cachePath, "utf8");
    const parsed = JSON.parse(raw) as StoredPlaylistScanCache;

    if (
      parsed.version !== PLAYLIST_CACHE_VERSION ||
      parsed.playlistId !== playlistId ||
      !Array.isArray(parsed.items) ||
      typeof parsed.cachedAt !== "string" ||
      typeof parsed.pageCount !== "number"
    ) {
      await rm(cachePath, { force: true }).catch(() => {});
      return null;
    }

    const cachedAtMs = Date.parse(parsed.cachedAt);
    if (Number.isNaN(cachedAtMs)) {
      await rm(cachePath, { force: true }).catch(() => {});
      return null;
    }

    const ageMs = Math.max(Date.now() - cachedAtMs, 0);
    if (ageMs > ttlMs || cachedAtMs < getMidnightPT().getTime()) {
      await rm(cachePath, { force: true }).catch(() => {});
      return null;
    }

    return {
      ageMs,
      cachedAt: parsed.cachedAt,
      estimatedQuotaUnitsSaved: parsed.pageCount * PLAYLIST_ITEMS_LIST_QUOTA_COST,
      items: parsed.items,
      pageCount: parsed.pageCount,
      playlistId: parsed.playlistId,
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writePlaylistScanCache({
  items,
  pageCount,
  playlistId,
  ...options
}: UsageOptions & {
  items: PlaylistItemSummary[];
  pageCount: number;
  playlistId: string;
}): Promise<void> {
  if (getPlaylistCacheTtlMs(options) <= 0) {
    return;
  }

  const cachePath = getPlaylistCachePath(playlistId, options);
  await mkdir(dirname(cachePath), { recursive: true, mode: 0o700 });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        cachedAt: new Date().toISOString(),
        items,
        pageCount,
        playlistId,
        version: PLAYLIST_CACHE_VERSION,
      } satisfies StoredPlaylistScanCache,
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await chmod(cachePath, 0o600).catch(() => {});
}

export async function invalidatePlaylistScanCache({
  playlistId,
  ...options
}: UsageOptions & {
  playlistId: string;
}): Promise<void> {
  await rm(getPlaylistCachePath(playlistId, options), { force: true }).catch(() => {});
}

export async function recordQuotaEntry(
  entry: QuotaLedgerEntry,
  options: UsageOptions = {},
): Promise<void> {
  const ledgerPath = getQuotaLedgerPath(options);
  const ledger = await loadQuotaLedger(options);

  ledger.entries.push(entry);
  if (ledger.entries.length > MAX_QUOTA_LEDGER_ENTRIES) {
    ledger.entries.splice(0, ledger.entries.length - MAX_QUOTA_LEDGER_ENTRIES);
  }

  await mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2), {
    mode: 0o600,
  });
  await chmod(ledgerPath, 0o600).catch(() => {});
}

export async function getQuotaUsageReport(options: UsageOptions = {}): Promise<QuotaUsageReport> {
  const [ledger, cacheEntries] = await Promise.all([
    loadQuotaLedger(options),
    listPlaylistScanCaches(options),
  ]);
  const now = Date.now();
  const startOfToday = getMidnightPT();
  const sevenDaysAgoMs = now - 7 * 24 * 60 * 60 * 1000;

  const estimatedUnitsToday = sumEntries(ledger.entries, (entry) =>
    Date.parse(entry.at) >= startOfToday.getTime() ? entry.estimatedUnits : 0,
  );
  const estimatedUnitsSavedByCacheToday = sumEntries(ledger.entries, (entry) =>
    Date.parse(entry.at) >= startOfToday.getTime() ? (entry.estimatedUnitsSaved ?? 0) : 0,
  );
  const cacheHitsToday = ledger.entries.filter(
    (entry) => entry.type === "scan-cache-hit" && Date.parse(entry.at) >= startOfToday.getTime(),
  ).length;
  const liveScansToday = ledger.entries.filter(
    (entry) => entry.type === "scan-live" && Date.parse(entry.at) >= startOfToday.getTime(),
  ).length;
  const deleteBatchesToday = ledger.entries.filter(
    (entry) => entry.type === "delete-batch" && Date.parse(entry.at) >= startOfToday.getTime(),
  ).length;

  return {
    cache: {
      enabled: getPlaylistCacheTtlMs(options) > 0,
      entries: cacheEntries,
      ttlMinutes: Math.floor(getPlaylistCacheTtlMs(options) / 60_000),
    },
    configDir: getAppConfigDir(options),
    generatedAt: new Date(now).toISOString(),
    referenceDailyQuotaUnits: REFERENCE_DAILY_QUOTA_UNITS,
    usage: {
      cacheHitsToday,
      deleteBatchesToday,
      estimatedUnitsLast7Days: sumEntries(ledger.entries, (entry) =>
        Date.parse(entry.at) >= sevenDaysAgoMs ? entry.estimatedUnits : 0,
      ),
      estimatedUnitsSavedByCacheToday,
      estimatedUnitsToday,
      estimatedUnitsTotal: sumEntries(ledger.entries, (entry) => entry.estimatedUnits),
      liveScansToday,
      percentOfReferenceDailyQuotaUsedToday: Math.min(
        (estimatedUnitsToday / REFERENCE_DAILY_QUOTA_UNITS) * 100,
        100,
      ),
    },
  };
}

async function listPlaylistScanCaches(options: UsageOptions): Promise<PlaylistScanCacheEntry[]> {
  const cacheDir = getPlaylistCacheDir(options);
  const ttlMs = getPlaylistCacheTtlMs(options);

  try {
    const entries = await readdir(cacheDir, { withFileTypes: true });
    const caches = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          try {
            const raw = await readFile(join(cacheDir, entry.name), "utf8");
            const parsed = JSON.parse(raw) as StoredPlaylistScanCache;
            const cachedAtMs = Date.parse(parsed.cachedAt);
            const ageMs = Math.max(Date.now() - cachedAtMs, 0);

            if (
              parsed.version !== PLAYLIST_CACHE_VERSION ||
              !Array.isArray(parsed.items) ||
              Number.isNaN(cachedAtMs) ||
              typeof parsed.pageCount !== "number" ||
              typeof parsed.playlistId !== "string"
            ) {
              return null;
            }

            if (ttlMs > 0 && ageMs > ttlMs) {
              await rm(join(cacheDir, entry.name), { force: true }).catch(() => {});
              return null;
            }

            return {
              ageMs,
              cachedAt: parsed.cachedAt,
              estimatedQuotaUnitsSaved: parsed.pageCount * PLAYLIST_ITEMS_LIST_QUOTA_COST,
              itemCount: parsed.items.length,
              pageCount: parsed.pageCount,
              playlistId: parsed.playlistId,
            } satisfies PlaylistScanCacheEntry;
          } catch {
            return null;
          }
        }),
    );

    return caches
      .filter((entry): entry is PlaylistScanCacheEntry => entry !== null)
      .sort((left, right) => left.ageMs - right.ageMs);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function loadQuotaLedger(options: UsageOptions): Promise<StoredQuotaLedger> {
  const ledgerPath = getQuotaLedgerPath(options);

  try {
    const raw = await readFile(ledgerPath, "utf8");
    const parsed = JSON.parse(raw) as StoredQuotaLedger;

    if (!Array.isArray(parsed.entries) || parsed.version !== QUOTA_LEDGER_VERSION) {
      return {
        entries: [],
        version: QUOTA_LEDGER_VERSION,
      };
    }

    return {
      entries: parsed.entries.filter(isQuotaLedgerEntry),
      version: QUOTA_LEDGER_VERSION,
    };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {
        entries: [],
        version: QUOTA_LEDGER_VERSION,
      };
    }

    throw error;
  }
}

function getPlaylistCacheDir(options: UsageOptions): string {
  return join(getAppConfigDir(options), PLAYLIST_CACHE_DIRNAME);
}

function getPlaylistCachePath(playlistId: string, options: UsageOptions): string {
  return join(getPlaylistCacheDir(options), `${encodeURIComponent(playlistId)}.json`);
}

function getQuotaLedgerPath(options: UsageOptions): string {
  return join(getAppConfigDir(options), QUOTA_LEDGER_FILENAME);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function isQuotaLedgerEntry(value: unknown): value is QuotaLedgerEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Partial<QuotaLedgerEntry>;
  return (
    typeof entry.at === "string" &&
    typeof entry.estimatedUnits === "number" &&
    (entry.estimatedUnitsSaved === undefined || typeof entry.estimatedUnitsSaved === "number") &&
    (entry.playlistId === undefined || typeof entry.playlistId === "string") &&
    (entry.pageCount === undefined || typeof entry.pageCount === "number") &&
    (entry.itemCount === undefined || typeof entry.itemCount === "number") &&
    (entry.cacheAgeMs === undefined || typeof entry.cacheAgeMs === "number") &&
    (entry.attemptedDeletes === undefined || typeof entry.attemptedDeletes === "number") &&
    (entry.deletedCount === undefined || typeof entry.deletedCount === "number") &&
    (entry.failedCount === undefined || typeof entry.failedCount === "number") &&
    (entry.type === "delete-batch" || entry.type === "scan-cache-hit" || entry.type === "scan-live")
  );
}

function sumEntries(
  entries: QuotaLedgerEntry[],
  pickValue: (entry: QuotaLedgerEntry) => number,
): number {
  return entries.reduce((total, entry) => total + pickValue(entry), 0);
}

export const QUOTA_REFERENCE = {
  dailyUnits: REFERENCE_DAILY_QUOTA_UNITS,
  deleteUnitsPerItem: PLAYLIST_ITEMS_DELETE_QUOTA_COST,
  listUnitsPerPage: PLAYLIST_ITEMS_LIST_QUOTA_COST,
} as const;
