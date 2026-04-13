# Agent Guide

Read this before making changes in this repo. Keep it concise and current.

## Project

- Package name: `@kitsunekode/yt-ddp`
- Public CLI command: `yt-ddp`
- Purpose: safely find and remove duplicate videos from one YouTube playlist
- Runtime for published package: Node 18+
- Local development workflow: Bun

## Current Status

As of 2026-04-08, the repo has already been upgraded from a local Bun script into a publishable npm CLI.

Implemented:

- Guided `setup` command for first-run OAuth onboarding
- `login` alias and `completion zsh` command for nicer CLI ergonomics
- Intuitive playlist input handling for both raw IDs and full YouTube URLs
- Safer execution flow with dry-run default and `--yes` support
- Pretty interactive scan output, grouped duplicate summaries, and `--json` output
- Publishable package metadata for `@kitsunekode/yt-ddp`
- Built CLI output in `dist/` via Bun's Node-targeted build
- Biome-based formatting and linting scripts
- Changesets-based versioning workflow
- Local global-link workflow for `yt-ddp`

Pending release state:

- There is a pending changeset in `.changeset/blue-chefs-shout.md`
- `changeset status` currently indicates the next bump would be `0.1.1`

## File Map

- [index.ts](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/index.ts): CLI entrypoint and argument parsing
- [setup.ts](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/setup.ts): interactive OAuth setup wizard and app-config persistence
- [auth.ts](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/auth.ts): shared OAuth source resolution, token persistence, browser auth flow
- [dedupe.ts](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/dedupe.ts): duplicate detection and protected playlist logic
- [youtube.ts](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/youtube.ts): YouTube API access, retries, error mapping
- [README.md](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/README.md): user-facing install, setup, usage, release docs
- [docs/google-oauth-setup.md](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/docs/google-oauth-setup.md): deeper Google Cloud and privacy walkthrough
- [completions/_yt-ddp](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/completions/_yt-ddp): zsh completion script
- [package.json](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/package.json): scripts, package metadata, publish config
- [biome.json](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/biome.json): formatting/lint config
- [.changeset/config.json](/home/kitsunekode/Projects/cli-tools/yt-playlist-dedupe/.changeset/config.json): Changesets config

## Key Commands

- `bun install`: install dependencies
- `bun run start -- ...`: run the source CLI locally
- `bun run setup`: local setup wizard
- `bun run start -- completion zsh`: print zsh completion script
- `bun test`: run tests
- `bun run typecheck`: run TypeScript checks
- `bun run fix`: auto-format and apply safe Biome fixes
- `bun run check`: run Biome, typecheck, and tests
- `bun run build`: create publishable `dist/`
- `bun run smoke:built`: verify built CLI runs
- `bun run pack:dry-run`: preview npm package contents
- `bun run publish:check`: run the full prepublish gate
- `bun run link:global`: globally link local repo as `yt-ddp`
- `bun run unlink:global`: remove global link
- `bun run changeset`: create a release note + version intent
- `bun run changeset:status`: inspect pending version bumps
- `bun run version-packages`: apply version bumps from pending changesets
- `bun run release`: run checks then publish with Changesets

## Release Workflow

Use this when preparing a real release:

1. Make the code and docs changes.
2. Run `bun run fix`.
3. Run `bun run check`.
4. Create a changeset with `bun run changeset` if the change is user-facing.
5. Inspect pending release state with `bun run changeset:status`.
6. Apply the version bump with `bun run version-packages`.
7. Review the resulting package/version/changelog diffs.
8. Run `bun run publish:check`.
9. Confirm registry auth with `bun pm whoami` or `bun publish --dry-run`.
10. Publish with `bun publish --access public` or `bun run release`.
11. Push the release commit and tag if you are tagging releases manually.

## CI Workflow

GitHub Actions now covers both validation and release automation.

- `.github/workflows/ci.yml`: runs `bun run ci:validate` on pull requests and pushes to `main`
- `.github/workflows/release.yml`: runs Changesets on `main`

Release workflow behavior:

1. If unreleased changesets exist on `main`, the workflow creates or updates the `Version Packages` PR.
2. After that PR is merged, the same workflow publishes to npm using `bun run release`.

Required repo secret:

- `NPM_TOKEN`: npm token allowed to publish `@kitsunekode/yt-ddp`

## Local Smoke Workflow

Use this when validating the CLI like a user would:

1. Run `bun run link:global`.
2. Run `yt-ddp --help`.
3. Optionally run `yt-ddp setup`.
4. Optionally dry-run against a real playlist URL.
5. Run `bun run unlink:global` when done.

## Environment Variables

Preferred current names:

- `YT_DDP_OAUTH_CLIENT_ID`
- `YT_DDP_OAUTH_CLIENT_SECRET`
- `YT_DDP_OAUTH_CLIENT_JSON_BASE64`
- `YT_DDP_OAUTH_CLIENT_FILE`
- `YT_DDP_CONFIG_DIR`

Backward-compatible legacy names are still accepted:

- `YOUTUBE_*`
- `YT_PLAYLIST_DEDUPE_*`
- `GOOGLE_OAUTH_CLIENT_*`

## Guardrails

- Keep dry run as the default behavior
- Do not loosen the protected playlist checks
- Preserve support for full YouTube playlist/watch URLs
- Keep package output usable as a published CLI because the published bin points to `dist/index.js`
- Prefer small, production-oriented scripts over tool sprawl
- Update this file when release flow, package name, or core commands change

## Notes For Future Agents

- Prefer reading this file and `package.json` first; use `README.md` for user-facing wording and release guidance
- `CLAUDE.md` is currently longer than ideal; avoid duplicating its content here
- If you change release tooling, update both `README.md` and this file in the same commit
