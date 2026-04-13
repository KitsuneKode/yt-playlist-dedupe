# YT Dedupe

**YouTube Playlist Deduplicator** is the definitive engineering tool to clean massive YouTube playlists. 

Available as a headless CLI or a native DOM-bypassing browser extension.

Website: [https://ytdedupe.kitsunelabs.xyz](https://ytdedupe.kitsunelabs.xyz)

---

## 🚀 Features

- **DOM Extractor (Browser Extension)**: Reads rendered videos directly from the DOM, requiring zero OAuth setup and consuming **zero API units**. Bypasses the YouTube Data API limits completely.
- **Quota Safe-Stop (CLI)**: YouTube caps deletions at ~198/day. Our CLI tracks a local ledger and intercepts execution before you hit 403 HTTP errors.
- **Smart Caching (CLI)**: Playlist metadata is cached locally for 24 hours. The cache automatically invalidates at Midnight PT to match Google's quota reset.

---

## 📦 The CLI Package

For developers, automation, and massive headless scanning.

### Installation

```bash
npm install -g @kitsunekode/yt-ddp
```

Or run once using Bun:

```bash
bunx @kitsunekode/yt-ddp --help
```

### Usage

**1. Setup OAuth Credentials**
```bash
yt-ddp setup
```
Follow the prompts to configure your Google Cloud project and download your OAuth credentials.

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

---

## 🧩 The Browser Extension

For end-users. Nuke duplicates directly from your browser without limits.

### Installation (Local Development / Unpacked)

Currently, the extension is available for manual installation:

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
2. Scroll to the bottom of the page to ensure all videos are rendered in the DOM.
3. Click the **YT Dedupe** extension icon.
4. Click **Scan Playlist**.
5. Review the identified duplicates and click **Nuke Duplicates**.

---

## 🛠 Development & Architecture

This project is a high-performance **Turborepo** monorepo using **Bun**.

- `packages/core`: Framework-agnostic deduplication logic and shared types.
- `apps/cli`: The headless NPM package that consumes `@yt-ddp/core`.
- `apps/extension`: A Manifest V3 Chrome & Firefox extension (React, Vite, Shadcn UI).
- `apps/web`: A Next.js 15 App Router landing page.

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed instructions on how to set up the development environment, run tests, and contribute.

---

## 📜 License

MIT. See [LICENSE](./LICENSE).
