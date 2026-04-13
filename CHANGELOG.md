# @kitsunekode/yt-ddp

## 0.2.1

### Patch Changes

- 5f977cc: Speed up duplicate removal with a small bounded delete worker pool while keeping per-item retries and early circuit breaking for auth, quota, and rate-limit failures. Update GitHub Actions to the latest major `checkout` and `setup-node` releases and move workflow Node setup to 24.

## 0.2.0

### Minor Changes

- Improve the CLI UX with prettier interactive output, JSON mode, safer deletion summaries, login/completion commands, and better Google OAuth onboarding docs.

### Patch Changes

- d60230b: Add Changesets-based versioning workflow and clarify release documentation.
