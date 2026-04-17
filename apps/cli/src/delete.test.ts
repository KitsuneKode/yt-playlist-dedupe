import { expect, test } from "bun:test";
import type { DuplicatePlaylistItem } from "@yt-ddp/core";
import { deleteDuplicates } from "./index.js";

function makeDuplicate(playlistItemId: string, duplicateIndex: number): DuplicatePlaylistItem {
  return {
    duplicateIndex,
    firstOccurrenceIndex: 1,
    keptPlaylistItemId: "keep-1",
    keptTitle: "Original video",
    playlistId: "PL123",
    playlistItemId,
    position: duplicateIndex - 1,
    title: `Video ${duplicateIndex}`,
    videoId: `video-${duplicateIndex}`,
  };
}

function createRateLimitError(): unknown {
  return {
    response: {
      data: {
        error: {
          errors: [{ reason: "rateLimitExceeded" }],
          message: "Rate limit hit",
        },
      },
      status: 403,
    },
  };
}

test("deleteDuplicates keeps going after a normal item failure", async () => {
  const duplicates = [makeDuplicate("a", 2), makeDuplicate("b", 3), makeDuplicate("c", 4)];
  const deletedIds: string[] = [];

  const report = await deleteDuplicates({
    deletePlaylistItem: async (playlistItemId) => {
      if (playlistItemId === "b") {
        throw new Error("boom");
      }

      deletedIds.push(playlistItemId);
    },
    duplicates,
    outputJson: true,
    wait: async () => {},
    youtube: {} as ReturnType<typeof import("./youtube.js").createYouTubeClient>,
  });

  expect(deletedIds).toEqual(["a", "c"]);
  expect(report).toEqual({
    aborted: false,
    abortedReason: null,
    deletedCount: 2,
    failed: [
      {
        duplicateIndex: 3,
        message: "boom",
        playlistItemId: "b",
        title: "Video 3",
      },
    ],
    skippedCount: 0,
  });
});

test("deleteDuplicates uses bounded parallel workers", async () => {
  const duplicates = [
    makeDuplicate("a", 2),
    makeDuplicate("b", 3),
    makeDuplicate("c", 4),
    makeDuplicate("d", 5),
  ];
  let activeCount = 0;
  let maxActiveCount = 0;

  await deleteDuplicates({
    deletePlaylistItem: async () => {
      activeCount += 1;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      await Promise.resolve();
      await Promise.resolve();
      activeCount -= 1;
    },
    duplicates,
    outputJson: true,
    wait: async () => {},
    youtube: {} as ReturnType<typeof import("./youtube.js").createYouTubeClient>,
  });

  expect(maxActiveCount).toBeGreaterThan(1);
});

test("deleteDuplicates trips the circuit breaker on rate-limit failures", async () => {
  const duplicates = [
    makeDuplicate("a", 2),
    makeDuplicate("b", 3),
    makeDuplicate("c", 4),
    makeDuplicate("d", 5),
    makeDuplicate("e", 6),
    makeDuplicate("f", 7),
  ];
  const startedIds: string[] = [];

  const report = await deleteDuplicates({
    deletePlaylistItem: async (playlistItemId) => {
      startedIds.push(playlistItemId);

      if (playlistItemId === "b") {
        throw createRateLimitError();
      }

      await Promise.resolve();
      await Promise.resolve();
    },
    duplicates,
    outputJson: true,
    wait: async () => {},
    youtube: {} as ReturnType<typeof import("./youtube.js").createYouTubeClient>,
  });

  expect(startedIds).toEqual(["a", "b", "c", "d"]);
  expect(report.aborted).toBe(true);
  expect(report.abortedReason).toBe("The YouTube Data API quota or rate limit was exceeded.");
  expect(report.deletedCount).toBe(3);
  expect(report.failed).toEqual([
    {
      duplicateIndex: 3,
      message: "The YouTube Data API quota or rate limit was exceeded.",
      playlistItemId: "b",
      title: "Video 3",
    },
  ]);
  expect(report.skippedCount).toBe(2);
});
