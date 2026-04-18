# YT Dedupe Monorepo - Agent Guidelines

## Architecture Overview

This project is a high-performance **Turborepo** monorepo using **Bun**. It consists of a shared core, a CLI, a browser extension, and a landing page.

- **`packages/core`**: Framework-agnostic deduplication logic and shared types.
- **`apps/cli`**: The headless NPM package that consumes `@yt-ddp/core`. Uses a smart local quota ledger to prevent API exhaustion.
- **`apps/extension`**: A Manifest V3 Chrome & Firefox extension that parses the YouTube DOM and completely bypasses the API quota. Uses React, Tailwind, and Shadcn UI.
- **`apps/web`**: A Next.js 16 App Router landing page showcasing the product, styled with a Brutalism Retro Premium aesthetic, highly optimized for SEO.

## Core Tooling & Best Practices

- **Task Runner:** Turborepo (`turbo`). Run global tasks from the root: `bun run build`, `bun run dev`, `bun run check`, `bun run clean`. The scripts are configured to use Turborepo's Terminal UI (`--ui=tui`) for clean, interactive logs.
- **Package Manager:** Bun (`bun install`, `bun add`). Do NOT use `npm` or `yarn`.
- **Linting & Formatting:** Oxc (`oxlint` and `oxfmt`). Do NOT use Biome. Run `bun run check` to execute `oxlint`, `tsc`, and `bun test` concurrently across all packages.
- **Testing:**
  - Core & CLI: `bun test`
  - Extension E2E: Playwright (`bunx playwright test` inside `apps/extension`).
- **Commit Standards:** Husky + Commitlint + lint-staged are active. Ensure conventional commit messages are used.

## Design System (UI/UX Pro Max)

- **Extension:** Uses Shadcn UI and GSAP for animations. Stick to the refined dark mode utility aesthetic. Maintain 8dp spacing rhythms and use semantic colors.
- **Web App:** Uses raw Tailwind with custom Brutalist overrides in `globals.css` (e.g., thick borders, SVG noise). Use GSAP for all scroll and entrance animations. Do NOT introduce generic component libraries here; it must remain highly custom and impactful.

## How to Continue Work

1. When starting a new session, ALWAYS read `.context/handoff.md` to see where the last session left off.
2. If making cross-cutting changes, ensure you update `@yt-ddp/core` and test both `cli` and `extension` consumers.
3. Before committing or finishing a task, ALWAYS run `bun run check` at the root.
4. If adding new UI components to the extension, use the `shadcn` skill via `bunx --bun shadcn@latest add <component>`.
