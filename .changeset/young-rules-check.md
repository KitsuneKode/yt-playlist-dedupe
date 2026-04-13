---
"@kitsunekode/yt-ddp": patch
---

Speed up duplicate removal with a small bounded delete worker pool while keeping per-item retries and early circuit breaking for auth, quota, and rate-limit failures. Update GitHub Actions to the latest major `checkout` and `setup-node` releases and move workflow Node setup to 24.
