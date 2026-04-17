import { expect, test } from "bun:test";
import { findDuplicateVideos, getProtectedPlaylistName, isProtectedPlaylistId } from "./dedupe.js";

test("findDuplicateVideos keeps the first occurrence only", () => {
  const result = findDuplicateVideos([
    {
      playlistItemId: "a",
      title: "One",
      videoId: "video-1",
      position: 0,
      playlistId: "PLabc",
    },
    {
      playlistItemId: "b",
      title: "Two",
      videoId: "video-2",
      position: 1,
      playlistId: "PLabc",
    },
    {
      playlistItemId: "c",
      title: "One duplicate",
      videoId: "video-1",
      position: 2,
      playlistId: "PLabc",
    },
    {
      playlistItemId: "d",
      title: "One duplicate again",
      videoId: "video-1",
      position: 3,
      playlistId: "PLabc",
    },
  ]);

  expect(result.uniqueVideoCount).toBe(2);
  expect(result.itemsWithoutVideoId).toBe(0);
  expect(result.duplicates).toHaveLength(2);
  expect(result.duplicates[0]).toMatchObject({
    playlistItemId: "c",
    duplicateIndex: 3,
    firstOccurrenceIndex: 1,
    keptPlaylistItemId: "a",
  });
  expect(result.duplicates[1]).toMatchObject({
    playlistItemId: "d",
    duplicateIndex: 4,
    firstOccurrenceIndex: 1,
    keptPlaylistItemId: "a",
  });
});

test("findDuplicateVideos skips items without a videoId", () => {
  const result = findDuplicateVideos([
    {
      playlistItemId: "a",
      title: "Private",
      videoId: null,
      position: 0,
      playlistId: "PLabc",
    },
    {
      playlistItemId: "b",
      title: "Actual",
      videoId: "video-2",
      position: 1,
      playlistId: "PLabc",
    },
  ]);

  expect(result.itemsWithoutVideoId).toBe(1);
  expect(result.duplicates).toHaveLength(0);
});

test("protected playlist guard catches YouTube system playlist prefixes", () => {
  expect(isProtectedPlaylistId("LLabc123")).toBe(true);
  expect(getProtectedPlaylistName("WLabc123")).toBe("Watch Later");
  expect(isProtectedPlaylistId("PLabc123")).toBe(false);
});
