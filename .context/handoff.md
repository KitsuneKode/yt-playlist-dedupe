---
updated: 2026-04-14T00:00:00Z
branch: main
session_name: 'Monorepo Restructure, Extension Upgrade & Next.js Website'
context_pressure: high
---

## Done

- Transitioned the project to a Turborepo monorepo managed by Bun.
- Extracted shared logic into `packages/core`.
- Restructured the CLI into `apps/cli`.
- Rebuilt `apps/extension` with React, Vite, Shadcn UI, and full Chrome + Firefox MV3 cross-compatibility.
- Created `apps/web` with Next.js 15 App Router, GSAP animations, Brutalist aesthetic, and full SEO/JSON-LD optimization.
- Swapped Biome out for Oxc (`oxlint` and `oxfmt`) for extreme performance.
- Configured Husky, lint-staged, and Commitlint.
- Configured Playwright for E2E testing the extension.
- Added global `dev` and `build` scripts to the root `package.json`.

## In Progress

- Project is currently stable and passing all checks (`bun run check`). 

## Blocked

- None.

## Next

- [ ] Connect the actual deduplication logic to the Shadcn UI inside `apps/extension/src/popup/App.tsx` (the UI currently simulates the states).
- [ ] Implement `@changesets/cli` release workflows for automated NPM and Chrome Web Store publishing.
- [ ] Add more comprehensive Playwright tests for the extension DOM interaction.

## Decisions

- **Oxc over Biome:** Decided to use Oxc as it provides unmatched linting and formatting speed in a monorepo setup.
- **GSAP over Framer Motion:** Replaced Framer Motion with GSAP in the browser extension to match the Web App's animation stack and respect the user's explicit preference for GSAP.
- **Dynamic Manifest V3:** Chose a dynamic `manifest.config.ts` for the extension to cleanly support Firefox's specific ID requirements without maintaining two separate repositories or branches.
- **Next.js App Router:** Picked Next.js over TanStack Start to guarantee the absolute highest tier of SSR SEO performance for the marketing site.

## Key Files

- `package.json` (Root monorepo scripts)
- `apps/extension/src/popup/App.tsx` (Shadcn UI implementation for the extension)
- `apps/extension/manifest.config.ts` (Dynamic browser target resolution)
- `apps/web/src/app/page.tsx` (GSAP animated brutalist landing page)
- `turbo.json` (Monorepo pipeline configuration)
