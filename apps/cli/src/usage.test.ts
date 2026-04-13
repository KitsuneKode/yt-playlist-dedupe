import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getQuotaUsageReport,
  invalidatePlaylistScanCache,
  readPlaylistScanCache,
  recordQuotaEntry,
  writePlaylistScanCache,
} from "./usage.js";

test("playlist scan cache can be written, read, and invalidated", async () => {
  const configDir = await mkdtemp(join(tmpdir(), "yt-ddp-usage-cache-"));

  try {
    await writePlaylistScanCache({
      configDir,
      items: [
        {
          playlistId: "PL123",
          playlistItemId: "item-1",
          position: 0,
          title: "Video 1",
          videoId: "video-1",
        },
      ],
      pageCount: 2,
      playlistId: "PL123",
    });

    const cached = await readPlaylistScanCache({
      configDir,
      playlistId: "PL123",
    });

    expect(cached).not.toBeNull();
    expect(cached).toMatchObject({
      estimatedQuotaUnitsSaved: 2,
      pageCount: 2,
      playlistId: "PL123",
    });

    await invalidatePlaylistScanCache({
      configDir,
      playlistId: "PL123",
    });

    expect(
      await readPlaylistScanCache({
        configDir,
        playlistId: "PL123",
      }),
    ).toBeNull();
  } finally {
    await rm(configDir, { recursive: true, force: true });
  }
});

test("quota report summarizes local estimated usage and saved units", async () => {
  const configDir = await mkdtemp(join(tmpdir(), "yt-ddp-usage-report-"));

  try {
    await recordQuotaEntry(
      {
        at: new Date().toISOString(),
        estimatedUnits: 3,
        pageCount: 3,
        playlistId: "PL123",
        type: "scan-live",
      },
      { configDir },
    );
    await recordQuotaEntry(
      {
        at: new Date().toISOString(),
        estimatedUnits: 0,
        estimatedUnitsSaved: 3,
        pageCount: 3,
        playlistId: "PL123",
        type: "scan-cache-hit",
      },
      { configDir },
    );
    await recordQuotaEntry(
      {
        at: new Date().toISOString(),
        attemptedDeletes: 2,
        deletedCount: 1,
        estimatedUnits: 100,
        failedCount: 1,
        playlistId: "PL123",
        type: "delete-batch",
      },
      { configDir },
    );

    const report = await getQuotaUsageReport({ configDir });

    expect(report.usage.estimatedUnitsToday).toBe(103);
    expect(report.usage.estimatedUnitsSavedByCacheToday).toBe(3);
    expect(report.usage.liveScansToday).toBe(1);
    expect(report.usage.cacheHitsToday).toBe(1);
    expect(report.usage.deleteBatchesToday).toBe(1);
  } finally {
    await rm(configDir, { recursive: true, force: true });
  }
});
