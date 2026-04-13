# Contributing to YT Dedupe

First off, thank you for considering contributing to YT Dedupe! 

This document provides guidelines and instructions for setting up your development environment, navigating the monorepo architecture, and submitting your contributions.

## Prerequisites

- [Bun](https://bun.sh/) (v1.3.9 or higher) - We use Bun as our package manager and test runner. Do not use `npm`, `yarn`, or `pnpm`.
- Node.js (v18 or higher) - Required for certain build tools.

## Monorepo Architecture

This project is structured as a **Turborepo** monorepo:

- `packages/core`: Contains the core deduplication algorithms and shared TypeScript interfaces. Framework agnostic.
- `apps/cli`: The Node.js command-line interface. Consumes `@yt-ddp/core`.
- `apps/extension`: The browser extension (Manifest V3) for Chrome and Firefox. Built with React, Vite, and Shadcn UI. Consumes `@yt-ddp/core`.
- `apps/web`: The marketing landing page. Built with Next.js 15 and Tailwind CSS.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KitsuneKode/yt-playlist-dedupe.git
   cd yt-playlist-dedupe
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Start development servers:**
   ```bash
   bun run dev
   ```
   This will use Turborepo to spin up the dev servers for both the Extension (Vite) and the Web app (Next.js) simultaneously.

## Global Commands

We use Turborepo to orchestrate tasks across all packages from the root directory.

- `bun run build`: Compiles all packages (CLI, Chrome Extension, Firefox Extension, Web).
- `bun run test`: Runs unit and E2E tests across all packages.
- `bun run lint`: Runs the Oxc linter across the monorepo.
- `bun run format`: Formats code using `oxfmt`.
- `bun run check`: The ultimate validation script. Concurrently runs linting, type-checking (`tsc`), unit tests, and Playwright E2E tests. **Always run this before committing.**

## Code Quality & Tooling

We employ strict, high-performance tooling to maintain code quality:

- **Linting & Formatting:** We use [Oxc](https://oxc.rs/) (`oxlint` and `oxfmt`). It is significantly faster than ESLint or Prettier. Do not use Biome.
- **Git Hooks:** Husky and `lint-staged` are configured to automatically format and lint your staged files before a commit.
- **Commit Messages:** We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Husky enforces this via `commitlint`.
  - Example: `feat(extension): add new settings page`
  - Example: `fix(cli): resolve quota calculation bug`
  - Example: `docs: update readme instructions`

## Developing the CLI (`apps/cli`)

To test CLI changes locally:
1. Navigate to `apps/cli`.
2. Run `bun run build`.
3. Link it globally: `bun link`.
4. You can now use the `yt-ddp` command locally on your machine to test your changes.

## Developing the Extension (`apps/extension`)

The extension uses React, Tailwind CSS, and Shadcn UI. 

1. **Running Dev:** `bun run dev` (from root) or `cd apps/extension && bun run dev`.
2. **Adding UI Components:** We use Shadcn UI. If you need a new component, use the CLI:
   ```bash
   cd apps/extension
   bunx --bun shadcn@latest add <component-name>
   ```
3. **Testing:** We use Playwright for E2E testing the popup UI. Run tests via `bun run test` in the extension directory.

## Releasing (Maintainers Only)

We use [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

1. When you make a user-facing change, run:
   ```bash
   bunx changeset
   ```
2. Follow the prompts to select the packages to bump and provide a changelog entry.
3. Commit the generated markdown file in the `.changeset` directory.
4. CI/CD pipelines will automatically handle version bumping and publishing when changesets are merged to the `main` branch.

## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Make your changes.
3. Run `bun run check` to ensure all tests, linting, and type checks pass.
4. If your changes are user-facing, run `bunx changeset` to generate a release note.
5. Submit a pull request!
