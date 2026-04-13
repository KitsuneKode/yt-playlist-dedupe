import { $ } from "bun";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const rootDir = process.cwd();

const pathsToClean = [
  "node_modules",
  ".turbo",
  ".next",
  "apps/*/node_modules",
  "packages/*/node_modules",
  "apps/*/dist",
  "apps/*/out",
  "apps/*/build",
  "apps/web/.next",
  "packages/*/dist",
  "packages/*/out",
  "packages/*/build",
];

console.log("🚀 Starting deep clean...");

// We use Bun's glob to find actual existing paths to avoid "no matches found" shell errors
const glob = new Bun.Glob("{apps,packages}/*/{node_modules,dist,out,build,.next}");

const matchedPaths = Array.from(glob.scanSync({ cwd: rootDir, onlyFiles: false }));
const allPaths = [...new Set([...matchedPaths, "node_modules", ".turbo", ".next"])];

let deletedCount = 0;

for (const p of allPaths) {
  const fullPath = join(rootDir, p);
  if (existsSync(fullPath)) {
    try {
      await rm(fullPath, { recursive: true, force: true });
      console.log(`  - Cleaned: ${p}`);
      deletedCount++;
    } catch (err) {
      console.error(`  - Failed to clean ${p}:`, err);
    }
  }
}

console.log(`\n✨ Clean complete. Removed ${deletedCount} directories.`);
