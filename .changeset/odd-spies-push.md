---
"@kitsunekode/yt-ddp": patch
---

Reduce unnecessary YouTube Data API quota usage by caching recent dry-run playlist scans locally, always forcing live data before deletions, and tracking local estimated quota usage. Add a new `yt-ddp quota` command plus scan output updates so it is easier to understand cached reads, estimated API cost, and when to refresh.
