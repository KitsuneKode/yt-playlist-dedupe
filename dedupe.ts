import type { PlaylistItemSummary } from "./youtube.js";

const PROTECTED_PLAYLIST_PREFIXES = new Map<string, string>([
  ["HL", "Watch History"],
  ["LL", "Liked Videos"],
  ["WL", "Watch Later"],
  ["UU", "Uploads"],
  ["FL", "Favorites"],
]);

export interface DuplicatePlaylistItem extends PlaylistItemSummary {
  firstOccurrenceIndex: number;
  duplicateIndex: number;
  keptPlaylistItemId: string;
  keptTitle: string;
}

export interface DeduplicationResult {
  duplicates: DuplicatePlaylistItem[];
  itemsWithoutVideoId: number;
  uniqueVideoCount: number;
}

export function isProtectedPlaylistId(playlistId: string): boolean {
  const prefix = playlistId.slice(0, 2).toUpperCase();
  return PROTECTED_PLAYLIST_PREFIXES.has(prefix);
}

export function getProtectedPlaylistName(playlistId: string): string | null {
  const prefix = playlistId.slice(0, 2).toUpperCase();
  return PROTECTED_PLAYLIST_PREFIXES.get(prefix) ?? null;
}

export function findDuplicateVideos(
  playlistItems: PlaylistItemSummary[],
): DeduplicationResult {
  const sortedItems = [...playlistItems].sort(
    (left, right) => left.position - right.position,
  );
  const firstSeenByVideoId = new Map<string, PlaylistItemSummary>();
  const duplicates: DuplicatePlaylistItem[] = [];
  let itemsWithoutVideoId = 0;

  for (const item of sortedItems) {
    if (!item.videoId) {
      itemsWithoutVideoId += 1;
      continue;
    }

    const firstSeen = firstSeenByVideoId.get(item.videoId);
    if (!firstSeen) {
      firstSeenByVideoId.set(item.videoId, item);
      continue;
    }

    duplicates.push({
      ...item,
      firstOccurrenceIndex: firstSeen.position + 1,
      duplicateIndex: item.position + 1,
      keptPlaylistItemId: firstSeen.playlistItemId,
      keptTitle: firstSeen.title,
    });
  }

  return {
    duplicates,
    itemsWithoutVideoId,
    uniqueVideoCount: firstSeenByVideoId.size,
  };
}
