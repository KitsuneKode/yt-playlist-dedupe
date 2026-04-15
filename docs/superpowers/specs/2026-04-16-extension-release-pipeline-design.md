# Extension Release Pipeline — Design Spec

**Date:** 2026-04-16
**Status:** Approved

---

## Overview

Set up a fully automated GitHub Releases pipeline for the YT Dedupe browser extension, improve the root README to surface download links for end users, and clean up the broken extension upload code in the existing `release.yml`. The CLI/npm release pipeline (Changesets) is left untouched.

---

## Problem Statement

1. **No public downloads exist.** The extension can only be installed by cloning and building locally. There is no GitHub Release with zip attachments for end users.
2. **`release.yml` is broken.** It tries to upload zips without ever running `bun run build`, and calls `gh release upload` against a release that doesn't exist (Changesets creates an internal npm release, not a GitHub Release).
3. **README is developer-only.** End users have no download link, no badge, no step-by-step install guide for the pre-built extension.

---

## Decisions

| Question | Decision |
|---|---|
| Release trigger | Independent `extension-v*` git tags — decoupled from CLI/npm Changesets cycle |
| Changelog strategy | GitHub's `--generate-notes` reads merged PRs since last `extension-v*` tag; `.github/release.yml` categorizes PRs by label |
| README audience | Mixed — prominent download section for end users near top, developer section preserved below |
| Action versions | Use latest stable pinned versions across all workflows |

---

## Components

### 1. `.github/workflows/extension-release.yml` (new)

**Trigger:** `push` on tags matching `extension-v*`

**Steps:**
1. `actions/checkout@v4` with `fetch-depth: 0` (needed for `--generate-notes` to find the previous tag)
2. `oven-sh/setup-bun@v2`
3. `bun install --frozen-lockfile`
4. `bun run build` — runs full Turborepo build; produces `apps/extension/dist/chrome/`, `apps/extension/dist/firefox/`, `yt-dedupe-chrome.zip`, `yt-dedupe-firefox.zip`
5. `softprops/action-gh-release@v2` — creates a GitHub Release named `Extension ${{ github.ref_name }}` with `generate_release_notes: true` and both zips as assets

**Permissions:** `contents: write`

**Concurrency:** group `extension-release-${{ github.ref }}`, cancel-in-progress: false (never cancel a release in flight)

---

### 2. `.github/workflows/release.yml` (modified)

Remove the two broken steps at the end:
- `Upload Extension Artifacts` (guarded by `steps.changesets.outputs.published == 'true'`)
- `Attach Zips to GitHub Release`

These are replaced entirely by `extension-release.yml`. The `release.yml` responsibility is scoped to npm publishing only.

---

### 3. `.github/release.yml` (new)

PR label → release notes section mapping for GitHub's auto-generated notes:

```yaml
changelog:
  categories:
    - title: "New Features"
      labels: ["feat", "enhancement", "feature"]
    - title: "Bug Fixes"
      labels: ["fix", "bug", "bugfix"]
    - title: "Maintenance"
      labels: ["chore", "deps", "refactor", "ci"]
    - title: "Documentation"
      labels: ["docs", "documentation"]
```

Labels not matching any category appear under a default "Other Changes" section.

---

### 4. Root `README.md` (modified)

**New section added near the top (after the header, before Features):**

```markdown
## ⬇️ Download the Extension

[Latest Release badge linking to github.com/.../releases/latest]

| Browser | Download |
|---|---|
| Chrome / Chromium (Edge, Brave, Arc) | [yt-dedupe-chrome.zip] |
| Mozilla Firefox | [yt-dedupe-firefox.zip] |

### Install Chrome Extension (2 steps)
1. Download `yt-dedupe-chrome.zip` and unzip it anywhere on your computer.
2. Go to `chrome://extensions` → enable **Developer mode** → click **Load unpacked** → select the unzipped folder.

### Install Firefox Extension (2 steps)
1. Download `yt-dedupe-firefox.zip` and unzip it anywhere.
2. Go to `about:debugging#/runtime/this-firefox` → click **Load Temporary Add-on...** → select `manifest.json` inside the unzipped folder.
```

The download links point to `github.com/KitsuneKode/yt-playlist-dedupe/releases/latest/download/yt-dedupe-chrome.zip` (and firefox equivalent) — these are stable URLs that always resolve to the latest release asset, so they never need updating.

The existing "Browser Extension — Installation (Local Development / Unpacked)" section is preserved below for developers.

---

### 5. `apps/extension/README.md` (modified)

Add a brief "Download pre-built" note at the top pointing users to the root README or GitHub Releases page, before the developer setup section.

---

## Release Process (for maintainers)

```bash
# 1. Finish extension work with conventional commits
git commit -m "feat(extension): add bulk select mode"

# 2. Update the version in apps/extension/manifest.config.ts
#    (manual for now — bump patch/minor/major as appropriate)

# 3. Tag and push
git tag extension-v1.2.0
git push --tags

# CI handles everything from here:
# → bun run build
# → GitHub Release created with auto-generated notes from merged PRs
# → yt-dedupe-chrome.zip and yt-dedupe-firefox.zip attached
# → README download links auto-resolve to new version
```

---

## Out of Scope

- Store submissions (Chrome Web Store, Firefox Add-ons) — covered in `PUBLISHING.md`
- Migrating CLI releases from Changesets to `release-please` — separate project
- Automated manifest version bumping script — can be added later
- `apps/extension/CHANGELOG.md` — GitHub Release notes are sufficient for now

---

## Files Changed

| File | Action |
|---|---|
| `.github/workflows/extension-release.yml` | Create |
| `.github/workflows/release.yml` | Remove broken extension upload steps |
| `.github/release.yml` | Create |
| `README.md` | Add download section near top |
| `apps/extension/README.md` | Add pre-built download note |
