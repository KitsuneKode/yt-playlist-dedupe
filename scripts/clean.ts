import { rm } from "node:fs/promises";
import { join } from "node:path";
import { Glob } from "bun";

const rootDir = process.cwd();

// Two separate patterns — Bun's Glob does not support nested brace expansion,
// so a single combined pattern like "{...,{apps,packages}/*/{...}}" silently matches nothing.
const cleanPatterns = [
  // Root-level artifact dirs
  "{node_modules,.turbo,.next,coverage,.cache}",
  // Workspace package artifact dirs (apps/* and packages/*)
  "{apps,packages}/*/{node_modules,dist,out,build,.next,.turbo,coverage,.cache}",
];

console.log("🚀 Starting blazing fast deep clean...");
const startTime = performance.now();

async function runDeepClean() {
  const deletePromises: Promise<string | null>[] = [];
  const trackedPaths = new Set<string>();

  // Scan each pattern — Bun Glob doesn't support nested braces, so we use separate patterns
  for (const pattern of cleanPatterns) {
    const glob = new Glob(pattern);
    for await (const match of glob.scan({ cwd: rootDir, onlyFiles: false, dot: true })) {
      if (trackedPaths.has(match)) continue;
      trackedPaths.add(match);

      const fullPath = join(rootDir, match);

      // We start the promise immediately but track it to wait later
      const p = rm(fullPath, { recursive: true, force: true })
        .then(() => match)
        .catch((err) => {
          console.error(`  ❌ Failed to clean ${match}:`, err.message);
          return null;
        });

      deletePromises.push(p);
    }
  }

  const results = await Promise.all(deletePromises);
  const deletedCount = results.filter(Boolean).length;
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  if (deletedCount > 0) {
    results.forEach((res) => res && console.log(`  🗑️  Cleaned: ${res}`));
  }

  console.log(`\n✨ Clean complete. Removed ${deletedCount} directories/files in ${duration}s.`);
}

runDeepClean().catch(console.error);
