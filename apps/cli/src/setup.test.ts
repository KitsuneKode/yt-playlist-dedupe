import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promptForCredentialsFile } from "./setup.js";

test("promptForCredentialsFile accepts the detected OAuth file on Enter", async () => {
  const workspaceDir = await mkdtemp(join(tmpdir(), "yt-ddp-setup-"));
  const suggestedFile = join(workspaceDir, "client_secret_demo.apps.googleusercontent.com.json");

  await writeFile(
    suggestedFile,
    JSON.stringify({
      installed: {
        client_id: "client-id.apps.googleusercontent.com",
        client_secret: "secret-value",
      },
    }),
  );

  try {
    const result = await promptForCredentialsFile({
      allowEmpty: false,
      rl: {
        question: async () => "",
      },
      suggestedFile,
    });

    expect(result).toBe(suggestedFile);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
