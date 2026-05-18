# @kitsunekode/yt-ddp

## 0.2.1

### Patch Changes

- c31367d: Reduce unnecessary YouTube Data API quota usage by caching recent dry-run playlist scans locally, always forcing live data before deletions, and tracking local estimated quota usage. Add a new `yt-ddp quota` command plus scan output updates so it is easier to understand cached reads, estimated API cost, and when to refresh.
- 5f977cc: Speed up duplicate removal with a small bounded delete worker pool while keeping per-item retries and early circuit breaking for auth, quota, and rate-limit failures. Update GitHub Actions to the latest major `checkout` and `setup-node` releases and move workflow Node setup to 24.
