import { expect, test } from "bun:test";
import { upsertOAuthEnv } from "./setup.js";

test("upsertOAuthEnv adds OAuth credentials to an empty env file", () => {
  expect(
    upsertOAuthEnv("", {
      YT_DDP_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
      YT_DDP_OAUTH_CLIENT_SECRET: "secret-value",
    }),
  ).toBe(
    [
      "# yt-ddp OAuth",
      "YT_DDP_OAUTH_CLIENT_ID=client-id.apps.googleusercontent.com",
      "YT_DDP_OAUTH_CLIENT_SECRET=secret-value",
      "",
    ].join("\n"),
  );
});

test("upsertOAuthEnv preserves unrelated env values and removes legacy OAuth keys", () => {
  const existing = [
    "FOO=bar",
    "YOUTUBE_OAUTH_CLIENT_FILE=/tmp/client.json",
    "YOUTUBE_OAUTH_CLIENT_JSON_BASE64=abc123",
    "",
  ].join("\n");

  expect(
    upsertOAuthEnv(existing, {
      YT_DDP_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
      YT_DDP_OAUTH_CLIENT_SECRET: "secret-value",
    }),
  ).toBe(
    [
      "FOO=bar",
      "",
      "# yt-ddp OAuth",
      "YT_DDP_OAUTH_CLIENT_ID=client-id.apps.googleusercontent.com",
      "YT_DDP_OAUTH_CLIENT_SECRET=secret-value",
      "",
    ].join("\n"),
  );
});
