# yt-playlist-dedupe

Safe Bun + TypeScript CLI for finding and removing duplicate videos from one YouTube playlist.

Default behavior is a dry run. Nothing is deleted unless you pass `--execute` and then type `yes` at the confirmation prompt.

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
- Deletion also requires typing `yes`
- Only the playlist ID you pass is scanned
- Known protected/system playlist prefixes are blocked, including Liked Videos, Watch Later, Watch History, and Uploads
- OAuth tokens are stored outside the repo by default
- Confirmation is required even in `--execute` mode

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

### 4. Provide credentials to the CLI

Preferred: use environment variables for confidential values.

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

Example `.env`:

```bash
YOUTUBE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
YOUTUBE_OAUTH_CLIENT_SECRET=your-client-secret
```

## Install

```bash
bun install
```

## Run

Dry run:

```bash
bun run index.ts PLAYLIST_ID
```

Explicit dry run:

```bash
bun run index.ts PLAYLIST_ID --dry-run
```

Execute deletions:

```bash
bun run index.ts PLAYLIST_ID --execute
```

Or via the script:

```bash
bun run start -- PLAYLIST_ID --execute
```

## First Run

1. Run a dry scan with your playlist ID.
2. The CLI will print an OAuth URL and try to open it in your browser.
3. Sign in with the Google account that owns the playlist.
4. Approve access for the requested YouTube scope.
5. Return to the terminal after the local callback completes.

## Example Output

```text
Mode: DRY RUN
Target playlist: PLxxxxxxxxxxxxxxxx

Total videos scanned: 248
Total duplicates found: 3

Duplicates:
- [18] Example Video Title (keeping item #4)
- [57] Another Video Title (keeping item #12)
- [103] Example Video Title (keeping item #4)
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

- Use a regular playlist ID such as one starting with `PL`.
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
