import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveOAuthSource, savePersistedOAuthClientConfig } from "./auth.js";

test("resolveOAuthSource auto-detects a workspace OAuth client file", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "yt-ddp-auth-workspace-"));
  const configDir = await mkdtemp(join(tmpdir(), "yt-ddp-auth-config-"));

  await writeFile(
    join(workspaceDir, "client_secret_demo.apps.googleusercontent.com.json"),
    JSON.stringify({
      installed: {
        client_id: "workspace-client.apps.googleusercontent.com",
        client_secret: "workspace-secret",
      },
    }),
  );

  try {
    const resolution = await resolveOAuthSource({
      configDir,
      env: {},
      workspaceDir,
    });

    expect(resolution.sourceKind).toBe("workspace-file");
    expect(resolution.suggestedClientFile).toBe(
      join(workspaceDir, "client_secret_demo.apps.googleusercontent.com.json"),
    );
    expect(resolution.config).toEqual({
      clientId: "workspace-client.apps.googleusercontent.com",
      clientSecret: "workspace-secret",
    });
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
  }
});

test("resolveOAuthSource uses persisted app config before workspace detection", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "yt-ddp-auth-workspace-"));
  const configDir = await mkdtemp(join(tmpdir(), "yt-ddp-auth-config-"));

  await writeFile(
    join(workspaceDir, "client_secret_demo.apps.googleusercontent.com.json"),
    JSON.stringify({
      installed: {
        client_id: "workspace-client.apps.googleusercontent.com",
        client_secret: "workspace-secret",
      },
    }),
  );

  try {
    const savedConfigPath = await savePersistedOAuthClientConfig(
      {
        clientId: "persisted-client.apps.googleusercontent.com",
        clientSecret: "persisted-secret",
      },
      { configDir },
    );

    const savedRaw = await readFile(savedConfigPath, "utf8");
    expect(JSON.parse(savedRaw)).toEqual({
      clientId: "persisted-client.apps.googleusercontent.com",
      clientSecret: "persisted-secret",
    });

    const resolution = await resolveOAuthSource({
      configDir,
      env: {},
      workspaceDir,
    });

    expect(resolution.sourceKind).toBe("app-config");
    expect(resolution.config).toEqual({
      clientId: "persisted-client.apps.googleusercontent.com",
      clientSecret: "persisted-secret",
    });
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
  }
});

test("resolveOAuthSource prefers env overrides over persisted app config", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "yt-ddp-auth-workspace-"));
  const configDir = await mkdtemp(join(tmpdir(), "yt-ddp-auth-config-"));

  try {
    await savePersistedOAuthClientConfig(
      {
        clientId: "persisted-client.apps.googleusercontent.com",
        clientSecret: "persisted-secret",
      },
      { configDir },
    );

    const resolution = await resolveOAuthSource({
      configDir,
      env: {
        YT_DDP_OAUTH_CLIENT_ID: "env-client.apps.googleusercontent.com",
        YT_DDP_OAUTH_CLIENT_SECRET: "env-secret",
      },
      workspaceDir,
    });

    expect(resolution.sourceKind).toBe("env-client");
    expect(resolution.config).toEqual({
      clientId: "env-client.apps.googleusercontent.com",
      clientSecret: "env-secret",
    });
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
  }
});
