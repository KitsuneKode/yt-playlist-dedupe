# @kitsunekode/yt-ddp

`yt-ddp` is a safe CLI for finding and removing duplicate videos from one YouTube playlist.

Default behavior is a dry run. Nothing is deleted unless you pass `--execute` and either confirm with `yes` or explicitly opt into `--yes`.

It accepts either a raw playlist ID or a full YouTube playlist/watch URL, includes a guided `setup` command for first-run OAuth configuration, and is ready to publish as a scoped npm package.

## Install

Global install from npm:

```bash
npm install -g @kitsunekode/yt-ddp
```

Run without installing:

```bash
npx @kitsunekode/yt-ddp --help
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

Local repo:

```bash
bun run setup
bun run start -- "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

The setup wizard asks for the Google Desktop app OAuth JSON you downloaded from Google Cloud Console, then saves the client ID and secret into a local `.env` file.

## Commands

- `yt-ddp setup`
- `yt-ddp <playlist-id-or-url>`
- `yt-ddp scan --playlist <playlist-id-or-url>`

### Useful flags

- `--playlist` for explicit input
- `--execute` to delete duplicates
- `--yes` to skip the final delete confirmation
- `--help` to print usage

## Setup

### 1. Create a Google Cloud project

1. Open the Google Cloud Console.
2. Create or select a project.
3. Enable the YouTube Data API v3 for that project.

### 2. Configure the OAuth consent screen

1. Go to `APIs & Services` -> `OAuth consent screen`.
2. Configure the app name and required contact details.
3. Add yourself as a test user if the app is still in testing.

### 3. Create Desktop app OAuth credentials

1. Go to `APIs & Services` -> `Credentials`.
2. Create `OAuth client ID`.
3. Choose `Desktop app`.
4. Download the JSON file.

### 4. Run the setup wizard

```bash
yt-ddp setup
```

Or locally:

```bash
bun run setup
```

Paste the path to the downloaded Desktop app OAuth JSON file when prompted.

### 5. Optional manual configuration

If you prefer not to use the wizard, you can still configure credentials manually.

Option A: provide the values directly:

```bash
export YT_DDP_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
export YT_DDP_OAUTH_CLIENT_SECRET=your-client-secret
```

Option B: provide the downloaded Desktop app JSON via env as base64:

```bash
export YT_DDP_OAUTH_CLIENT_JSON_BASE64="$(base64 -w 0 /absolute/path/to/oauth-client.json)"
```

Option C: point to the downloaded Desktop app JSON file:

```bash
export YT_DDP_OAUTH_CLIENT_FILE=/absolute/path/to/oauth-client.json
```

Backward-compatible legacy `YOUTUBE_*` and `YT_PLAYLIST_DEDUPE_*` env vars are still accepted.

## Examples

Dry run with a playlist ID:

```bash
yt-ddp PLAYLIST_ID
```

Dry run with a playlist URL:

```bash
yt-ddp "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

Dry run with a watch URL that includes `list=...`:

```bash
yt-ddp "https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID"
```

Use the explicit playlist flag:

```bash
yt-ddp --playlist PLAYLIST_ID
```

Execute deletions:

```bash
yt-ddp PLAYLIST_ID --execute
```

Skip the final confirmation prompt:

```bash
yt-ddp PLAYLIST_ID --execute --yes
```

## Global Link / Unlink

Make the local repo available globally as `yt-ddp`:

```bash
bun run link:global
yt-ddp --help
```

Remove the global link:

```bash
bun run unlink:global
```

## Production Scripts

- `bun run check` runs Biome checks, typecheck, and tests.
- `bun run build` creates the publishable `dist/` output.
- `bun run smoke:built` verifies the built CLI runs under Node.
- `bun run pack:dry-run` verifies the npm tarball contents.
- `bun run publish:check` runs the full release gate.
- `npm publish --access public` publishes the package.

## Example Output

```text
yt-ddp

Mode: Dry run
Playlist: PLxxxxxxxxxxxxxxxx
Scope: only the playlist above will be scanned or modified.
Scanning playlist items...

Scan summary
Videos scanned: 248
Unique videos kept: 245
Duplicates found: 3

Duplicate items to remove:
- [18] Example Video Title -> keep item #4
- [57] Another Video Title -> keep item #12
- [103] Example Video Title -> keep item #4
```

## Token Storage

By default the OAuth token is saved to:

```text
~/.config/yt-ddp/oauth-token.json
```

Override that location with:

```bash
export YT_DDP_CONFIG_DIR=/custom/config/dir
```

If the saved token becomes invalid, the CLI removes it and starts a fresh authorization flow automatically.

## Notes

- Use a regular playlist ID such as one starting with `PL`, or pass a full YouTube URL that includes `list=...`.
- This tool refuses to run against known system playlist prefixes like `LL`, `WL`, and `HL`.
- Deleted or private playlist items without a usable `videoId` are reported but not deduplicated.
- Large playlists are handled page by page using `nextPageToken`.
- For local development, copy [.env.example](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/.env.example) to `.env` and fill in your own values.

## Development

Run the full production-oriented gate:

```bash
bun run publish:check
```

Auto-fix formatting and safe lint issues:

```bash
bun run fix
```

## License

MIT. See [LICENSE](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/LICENSE).
