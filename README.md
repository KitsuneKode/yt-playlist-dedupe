# yt-playlist-dedupe

Safe Bun + TypeScript CLI for finding and removing duplicate videos from one YouTube playlist.

Default behavior is a dry run. Nothing is deleted unless you pass `--execute` and either confirm with `yes` or explicitly opt into `--yes`.

It accepts either a raw playlist ID or a full YouTube playlist/watch URL, and includes a guided `setup` command for first-run OAuth configuration.

## What It Does

- Authenticates with Google using the installed-app OAuth flow
- Scans exactly one playlist via `playlistItems.list`
- Detects duplicates by `snippet.resourceId.videoId`
- Keeps the first occurrence only
- Deletes duplicates with `playlistItems.delete` only when you opt in
- Persists the OAuth token locally so you do not have to re-authenticate every run
- Retries transient delete failures with exponential backoff and jitter

## Safety Guardrails

- Dry run is the default mode
- Deletion requires `--execute`
- Deletion also requires typing `yes`, unless you deliberately pass `--yes`
- Only the playlist you pass is scanned
- Known protected/system playlist prefixes are blocked, including Liked Videos, Watch Later, Watch History, and Uploads
- OAuth tokens are stored outside the repo by default

## Install

```bash
bun install
```

## Quick Start

```bash
bun run setup
bun run start -- "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

The setup wizard asks for the Google Desktop app OAuth JSON you downloaded from Google Cloud Console, then saves the client ID and secret into a local `.env` file.

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
bun run setup
```

Paste the path to the downloaded Desktop app OAuth JSON file when prompted.

### 5. Optional manual configuration

If you prefer not to use the wizard, you can still configure credentials manually.

Option A: provide the values directly:

```bash
export YOUTUBE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
export YOUTUBE_OAUTH_CLIENT_SECRET=your-client-secret
```

Option B: provide the downloaded Desktop app JSON via env as base64:

```bash
export YOUTUBE_OAUTH_CLIENT_JSON_BASE64="$(base64 -w 0 /absolute/path/to/oauth-client.json)"
```

Option C: point to the downloaded Desktop app JSON file:

```bash
export YOUTUBE_OAUTH_CLIENT_FILE=/absolute/path/to/oauth-client.json
```

Bun automatically loads `.env`, so you can also place those variables in a local `.env` file.

## Run

Dry run with a playlist ID:

```bash
bun run start -- PLAYLIST_ID
```

Dry run with a full playlist URL:

```bash
bun run start -- "https://www.youtube.com/playlist?list=PLAYLIST_ID"
```

Dry run with a watch URL that includes `list=...`:

```bash
bun run start -- "https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID"
```

Use the explicit playlist flag:

```bash
bun run start -- --playlist PLAYLIST_ID
```

Execute deletions:

```bash
bun run start -- PLAYLIST_ID --execute
```

Skip the final confirmation prompt:

```bash
bun run start -- PLAYLIST_ID --execute --yes
```

## First Run

1. Run a dry scan with your playlist ID or playlist URL.
2. The CLI will print an OAuth URL and try to open it in your browser.
3. Sign in with the Google account that owns the playlist.
4. Approve access for the requested YouTube scope.
5. Return to the terminal after the local callback completes.

## Example Output

```text
yt-playlist-dedupe

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
~/.config/yt-playlist-dedupe/oauth-token.json
```

Override that location with:

```bash
export YT_PLAYLIST_DEDUPE_CONFIG_DIR=/custom/config/dir
```

If the saved token becomes invalid, the CLI removes it and starts a fresh authorization flow automatically.

## Notes

- Use a regular playlist ID such as one starting with `PL`, or pass a full YouTube URL that includes `list=...`.
- This tool refuses to run against known system playlist prefixes like `LL`, `WL`, and `HL`.
- Deleted or private playlist items without a usable `videoId` are reported but not deduplicated.
- Large playlists are handled page by page using `nextPageToken`.
- For local development, copy [.env.example](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/.env.example) to `.env` and fill in your own values.

## Development

Run tests:

```bash
bun test
```

Run typechecking:

```bash
bun run typecheck
```

## License

MIT. See [LICENSE](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/LICENSE).
