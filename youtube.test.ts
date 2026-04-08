import { expect, test } from "bun:test";
import { formatApiError, isRetryableApiError } from "./youtube.js";

test("isRetryableApiError returns true for transient rate limit errors", () => {
  expect(
    isRetryableApiError({
      response: {
        status: 429,
        data: {
          error: {
            errors: [{ reason: "rateLimitExceeded" }],
          },
        },
      },
    }),
  ).toBe(true);
});

test("formatApiError maps invalid playlist errors", () => {
  expect(
    formatApiError({
      response: {
        status: 404,
        data: {
          error: {
            message: "Playlist not found",
            errors: [{ reason: "playlistNotFound" }],
          },
        },
      },
    }),
  ).toBe("The playlist ID is invalid or the playlist is not accessible.");
});

test("formatApiError maps quota errors", () => {
  expect(
    formatApiError({
      response: {
        status: 403,
        data: {
          error: {
            message: "Quota exceeded",
            errors: [{ reason: "quotaExceeded" }],
          },
        },
      },
    }),
  ).toBe("The YouTube Data API quota or rate limit was exceeded.");
});
