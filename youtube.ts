import { setTimeout as sleep } from "node:timers/promises";
import { google, type youtube_v3 } from "googleapis";
import type { Logger, OAuthClient } from "./auth.js";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";
const PLAYLIST_PAGE_SIZE = 50;

export interface PlaylistItemSummary {
  playlistItemId: string;
  playlistId: string;
  videoId: string | null;
  title: string;
  position: number;
}

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    data?: {
      error?: {
        message?: unknown;
        errors?: Array<{
          reason?: unknown;
          message?: unknown;
        }>;
      };
    };
  };
  errors?: Array<{
    reason?: unknown;
    message?: unknown;
  }>;
}

export function createYouTubeClient(auth: OAuthClient): youtube_v3.Youtube {
  return google.youtube({
    version: "v3",
    auth,
  });
}

export async function listPlaylistItems({
  youtube,
  playlistId,
}: {
  youtube: youtube_v3.Youtube;
  playlistId: string;
}): Promise<PlaylistItemSummary[]> {
  const items: PlaylistItemSummary[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await youtube.playlistItems.list({
      part: ["snippet"],
      playlistId,
      maxResults: PLAYLIST_PAGE_SIZE,
      pageToken: nextPageToken,
      fields: "nextPageToken,items(id,snippet(title,position,playlistId,resourceId/videoId))",
    });

    for (const rawItem of response.data.items ?? []) {
      const snippet = rawItem.snippet;
      const playlistItemId = rawItem.id;

      if (!playlistItemId || !snippet) {
        continue;
      }

      if (snippet.playlistId && snippet.playlistId !== playlistId) {
        throw new Error(
          `Safety check failed: fetched playlist item ${playlistItemId} from playlist ${snippet.playlistId}, expected ${playlistId}.`,
        );
      }

      const position =
        typeof snippet.position === "number" ? snippet.position : items.length;

      items.push({
        playlistItemId,
        playlistId,
        videoId: snippet.resourceId?.videoId ?? null,
        title: snippet.title ?? "(untitled video)",
        position,
      });
    }

    nextPageToken = response.data.nextPageToken ?? undefined;
  } while (nextPageToken);

  return items;
}

export async function deletePlaylistItemWithRetry({
  youtube,
  playlistItemId,
  logger,
  maxAttempts = 5,
  baseDelayMs = 500,
}: {
  youtube: youtube_v3.Youtube;
  playlistItemId: string;
  logger?: Pick<Logger, "warn">;
  maxAttempts?: number;
  baseDelayMs?: number;
}): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await youtube.playlistItems.delete({ id: playlistItemId });
      return;
    } catch (error) {
      lastError = error;

      if (!isRetryableApiError(error) || attempt === maxAttempts) {
        break;
      }

      const backoffMs = Math.min(baseDelayMs * 2 ** (attempt - 1), 8_000);
      const jitterMs = Math.floor(Math.random() * 250);
      logger?.warn(
        `Transient delete failure for playlist item ${playlistItemId}. Retrying in ${backoffMs + jitterMs}ms.`,
      );
      await sleep(backoffMs + jitterMs);
    }
  }

  throw lastError;
}

export function isRetryableApiError(error: unknown): boolean {
  const status = getStatusCode(error);
  const reason = getErrorReason(error);
  const code = getErrorCode(error);

  if (status !== null && [408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  if (reason !== null && ["backendError", "rateLimitExceeded", "userRateLimitExceeded"].includes(reason)) {
    return true;
  }

  if (code !== null && ["ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
    return true;
  }

  return false;
}

export function formatApiError(error: unknown): string {
  const status = getStatusCode(error);
  const reason = getErrorReason(error);
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  if (status === 400 && reason === "playlistOperationUnsupported") {
    return "YouTube does not allow deleting items from that playlist type.";
  }

  if (status === 401) {
    return "Google authorization failed. Remove the saved token and authenticate again.";
  }

  if (status === 403 && reason === "playlistItemsNotAccessible") {
    return "The playlist items are not accessible with the current account or scope.";
  }

  if ((status === 400 || status === 404) && ["playlistNotFound", "invalidPlaylistId"].includes(reason ?? "")) {
    return "The playlist ID is invalid or the playlist is not accessible.";
  }

  if (status === 403 && ["quotaExceeded", "rateLimitExceeded", "userRateLimitExceeded"].includes(reason ?? "")) {
    return "The YouTube Data API quota or rate limit was exceeded.";
  }

  if (code !== null) {
    return `Network error (${code}): ${message}`;
  }

  if (status !== null) {
    return `API error ${status}${reason ? ` (${reason})` : ""}: ${message}`;
  }

  return message;
}

export function getStatusCode(error: unknown): number | null {
  const errorLike = getErrorLike(error);
  return typeof errorLike.response?.status === "number" ? errorLike.response.status : null;
}

export function getErrorReason(error: unknown): string | null {
  const errorLike = getErrorLike(error);
  const reason =
    errorLike.response?.data?.error?.errors?.[0]?.reason ??
    errorLike.errors?.[0]?.reason ??
    null;

  return typeof reason === "string" ? reason : null;
}

function getErrorCode(error: unknown): string | null {
  const errorLike = getErrorLike(error);
  return typeof errorLike.code === "string" ? errorLike.code : null;
}

function getErrorMessage(error: unknown): string {
  const errorLike = getErrorLike(error);
  const message =
    errorLike.response?.data?.error?.message ??
    errorLike.errors?.[0]?.message ??
    errorLike.message;

  if (typeof message === "string" && message.length > 0) {
    return message;
  }

  return error instanceof Error ? error.message : "Unknown error";
}

function getErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : {};
}
