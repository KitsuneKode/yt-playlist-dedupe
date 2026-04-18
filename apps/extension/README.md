# 🧩 YT Dedupe Extension

<div align="center">
  <p>The native, DOM-bypassing browser extension for scanning and nuking duplicate videos from massive YouTube playlists.</p>
</div>

<br />

## ✦ Overview

The YT Dedupe Extension provides a premium, zero-config GUI for the YT Dedupe engine. By reading the actual rendered DOM of the YouTube playlist page, it entirely bypasses Google's YouTube Data API, ensuring you never hit quotas, deal with limit-bans, or need to configure OAuth credentials.

### Aesthetic Design

The UI utilizes a bespoke **Glassmorphic Obsidian** dark mode complete with:

- `motion/react` spring physics and staggered choreographed lists
- Blur-masked borders and refined interactive press states
- Custom cubic-bezier easings for snappy, production-grade micro-interactions

<br />

## ⬇️ Download Pre-Built Extension

Don't want to build from source? Grab the latest pre-built zip from [GitHub Releases](https://github.com/KitsuneKode/yt-playlist-dedupe/releases/latest) — see the root [README](../../README.md#️-download-the-extension) for download links and install instructions.

<br />

## 🛠 Developer Setup

This extension is built with **Vite**, **React**, **Tailwind CSS**, and **Framer Motion**.

### Recommended Commands

First, ensure you are in the root directory and have installed dependencies via `bun install`.

Then, to develop on the extension specifically:

```bash
# Run local dev server with Hot Module Replacement (HMR)
bun run dev --filter extension

# Build the extension for Chrome (Outputs to /dist/chrome)
bun run build --filter extension

# Build the extension for Firefox (Outputs to /dist/firefox)
bun run build:firefox --filter extension
```

### Loading the Extension into Chrome

1. Run the build command above.
2. Go to `chrome://extensions` in your browser.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `/apps/extension/dist/chrome` directory.

### Loading into Firefox

1. Run the Firefox build command.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**
4. Select the `manifest.json` file inside the `/apps/extension/dist/firefox` folder.

<br />

## 🏗 Tech Stack

- **React 19**
- **Vite (CRXJS Plugin)**
- **Tailwind CSS v4**
- **Framer Motion v12**
- **Lucide React** (Icons)
