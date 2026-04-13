# @kitsunekode/yt-ddp

`yt-ddp` is a production-ready CLI for safely finding and removing duplicate videos from a single YouTube playlist.

It is dry-run by default, accepts either a playlist ID or full YouTube URL, includes a guided OAuth setup flow, and is packaged for npm as `@kitsunekode/yt-ddp`.

See [CHANGELOG.md](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/CHANGELOG.md) for release notes.

## Install

Global install:

```bash
npm install -g @kitsunekode/yt-ddp
```

Run once without installing:

```bash
bunx @kitsunekode/yt-ddp --help
```

Local development:

```bash
bun install
```

## Quick Start

Published package:

```bash
yt-ddp setup
yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

If the downloaded Google Desktop app OAuth JSON is already in your current directory with a name like `client_secret*.json` or `client*.json`, `yt-ddp setup` will detect it and pressing Enter will use it.

Local repo:

```bash
bun run setup
bun run start -- "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

## What It Does

- Authenticates with Google using the installed-app OAuth flow
- Scans exactly one playlist
- Detects duplicates by video ID
- Keeps the first occurrence of each video
- Deletes duplicates only when you explicitly opt in
- Stores refreshed OAuth tokens locally so re-auth is not needed every run
- Retries transient delete failures
- Deletes duplicate items with small bounded parallelism, per-item retries, and circuit breaking for quota or rate-limit failures

## Safety

- Dry run is the default
- Deletion requires `--execute`
- Deletion also requires a confirmation prompt unless you pass `--yes`
- Known protected/system playlists are blocked
- Only the playlist you pass is scanned or modified

## Commands

- `yt-ddp setup`
- `yt-ddp login`
- `yt-ddp <playlist-id-or-url>`
- `yt-ddp scan --playlist <playlist-id-or-url>`
- `yt-ddp completion zsh`

Useful flags:

- `--playlist` for explicit input
- `--execute` to delete duplicates
- `--yes` to skip the final prompt
- `--json` for machine-readable output
- `--help` to print usage

## OAuth Setup

1. Create or select a Google Cloud project.
2. Enable the YouTube Data API v3.
3. Configure the OAuth consent screen.
4. Create `Desktop app` OAuth credentials.
5. Download the JSON file.
6. Run `yt-ddp setup` and paste the JSON path when prompted, or just press Enter if the downloaded file is already in the current directory.
7. `yt-ddp` stores the normalized client config in its local app config directory for future runs.

By default the saved client config and OAuth token live here:

```text
~/.config/yt-ddp/
```

Advanced overrides are still supported when you need them:

```bash
export YT_DDP_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
export YT_DDP_OAUTH_CLIENT_SECRET=your-client-secret
```

Other supported env options:

- `YT_DDP_OAUTH_CLIENT_JSON_BASE64`
- `YT_DDP_OAUTH_CLIENT_FILE`
- `YT_DDP_CONFIG_DIR`

Legacy `YOUTUBE_*` and `YT_PLAYLIST_DEDUPE_*` env vars are still accepted.

Need a walkthrough for the Google Cloud side? See [docs/google-oauth-setup.md](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/docs/google-oauth-setup.md).

## Usage Examples

Dry run:

```bash
yt-ddp PLAYLIST_ID
```

Playlist URL:

```bash
yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

Watch URL with `list=`:

```bash
yt-ddp "https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID"
```

Execute deletions:

```bash
yt-ddp PLAYLIST_ID --execute
```

Non-interactive execute:

```bash
yt-ddp PLAYLIST_ID --execute --yes
```

JSON output:

```bash
yt-ddp PLAYLIST_ID --json
```

Zsh completion:

```bash
mkdir -p ~/.zfunc
yt-ddp completion zsh > ~/.zfunc/_yt-ddp
fpath=(~/.zfunc $fpath)
autoload -Uz compinit && compinit
```

## Privacy

`yt-ddp` is designed to run locally. In the normal CLI flow there is no hosted `yt-ddp` backend that receives your playlist data.

- your OAuth token is stored locally on your machine
- your playlist scan happens locally on your machine
- your downloaded OAuth client JSON stays local unless you share it

Google still handles the sign-in and API authorization, but the tool itself is meant to be a local utility.

## Local Global Linking

Make the local repo available globally as `yt-ddp`:

```bash
bun run link:global
yt-ddp --help
```

Remove the global link:

```bash
bun run unlink:global
```

## Versioning With Changesets

This repo uses Changesets for release versioning.

Create a changeset after a user-facing change:

```bash
bun run changeset
```

Preview pending release state:

```bash
bun run changeset:status
```

Apply version bumps and changelog updates from pending changesets:

```bash
bun run version-packages
```

Recommended release flow:

```bash
bun run changeset
bun run version-packages
bun run publish:check
bun publish --access public
```

If you want Changesets to publish directly:

```bash
bun run release
```

## Production Scripts

- `bun run fix` auto-formats and applies safe Biome fixes
- `bun run lint` runs Biome lint rules
- `bun run check` runs Biome checks, typecheck, and tests
- `bun run build` creates the publishable `dist/` output
- `bun run smoke:built` verifies the built CLI runs
- `bun run pack:dry-run` shows exactly what npm would publish
- `bun run publish:check` runs the full prepublish gate

## CI And Release Automation

This repo now includes two GitHub Actions workflows:

- `.github/workflows/ci.yml`: runs the full validation gate on pull requests, pushes to `main`, and manual dispatch
- `.github/workflows/release.yml`: runs on `main` and uses Changesets to open or update the release PR, then publish to npm after that PR is merged

Required GitHub secret for automated publishing:

- `NPM_TOKEN`: npm token with permission to publish `@kitsunekode/yt-ddp`

Expected release behavior:

1. Add a changeset in your feature PR.
2. Merge the PR to `main`.
3. The release workflow opens or updates a `Version Packages` PR.
4. Merge that PR when the version/changelog looks right.
5. The release workflow publishes the new version to npm.

## Config Storage

By default `yt-ddp` stores both the saved OAuth client config and OAuth token here:

```text
~/.config/yt-ddp/
```

Override that location with:

```bash
export YT_DDP_CONFIG_DIR=/custom/config/dir
```

## Notes

- Use a playlist ID such as one starting with `PL`, or a full YouTube URL that includes `list=...`
- Private/deleted items without a usable video ID are skipped
- Large playlists are processed page by page

## Development

Run the full release gate:

```bash
bun run publish:check
```

Use [.env.example](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/.env.example) only for advanced local development overrides if you want Bun to auto-load credentials.

## License

MIT. See [LICENSE](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/LICENSE).
