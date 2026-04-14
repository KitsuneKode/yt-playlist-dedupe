# 🌌 YT Dedupe &middot; Playlist Deduplicator

<div align="center">
  <h3>The definitive engineering tool to clean massive YouTube playlists.</h3>
  <p>Available as a headless CLI or a native DOM-bypassing browser extension.</p>
</div>

---

<br />

## ✦ Features

### 🧩 DOM Extractor (Browser Extension)
Reads rendered videos directly from the DOM. Requires **zero OAuth setup** and consumes **zero API units**. Bypasses the YouTube Data API limits completely by acting as a native web client.

### ⚡ Quota Safe-Stop (CLI)
YouTube aggressively caps deletions at ~198/day per account. Our CLI tracks a local ledger and intercepts execution before you hit `403 Forbidden` HTTP errors, keeping your API project safe from shadowbans.

### 🧠 Smart Caching (CLI)
Playlist metadata is automatically cached locally for 24 hours. The cache is programmed to magically invalidate at Midnight PT exactly when Google's quota resets.

<br />

## 📦 The CLI Package

Built for developers, automation pipelines, and massive headless scanning.

### Installation

```bash
# Global installation
npm install -g @kitsunekode/yt-ddp

# Or run instantly via Bun
bunx @kitsunekode/yt-ddp --help
```

### Usage

**1. Setup OAuth Credentials**
```bash
yt-ddp setup
```
> Follow the interactive terminal prompts to configure your Google Cloud project and inject your OAuth credentials.

**2. Dry-Run Scan**
```bash
yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

**3. Execute Deletions**
```bash
yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID" --execute
```

**4. Check Local Quota Ledger**
```bash
yt-ddp quota
```

<br />

## 🧩 The Browser Extension

Built for end-users. Nuke duplicates directly from your browser without limits, API keys, or coding knowledge.

### Installation (Local Development / Unpacked)

#### For Google Chrome / Chromium Browsers (Edge, Brave, Arc):
1. Clone this repository and run `bun run build` at the root.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `apps/extension/dist/chrome` folder.

#### For Mozilla Firefox:
1. Clone this repository and run `bun run build` at the root.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click on **Load Temporary Add-on...**.
4. Navigate to `apps/extension/dist/firefox` and select the `manifest.json` file.

### Usage
1. Navigate to a YouTube playlist (e.g., `https://www.youtube.com/playlist?list=...`).
2. Click the **YT Dedupe** extension icon.
3. Click **Deep Auto Scan** to let the extension scroll and read the entire stack.
4. Review the identified duplicates and hit **Nuke Duplicates**.

<br />

## 🛠 Development & Architecture

This project is structured as a high-performance **Turborepo** monorepo using **Bun**.

| Package | Description |
| :--- | :--- |
| **`packages/core`** | Framework-agnostic deduplication logic and shared types. |
| **`apps/cli`** | The headless NPM package that consumes `@yt-ddp/core`. |
| **`apps/extension`** | Manifest V3 Chrome & Firefox extension (Vite, React, Framer Motion, Glassmorphic Brutalist UI). |
| **`apps/web`** | A Next.js 15 App Router landing page. |

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on how to set up the development environment, run tests, and contribute.

---

## 📜 License

MIT. See [LICENSE](./LICENSE).
