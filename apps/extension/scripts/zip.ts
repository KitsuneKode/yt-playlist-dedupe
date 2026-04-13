import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

if (!fs.existsSync(distDir)) {
  console.error("No dist directory found. Run build first.");
  process.exit(1);
}

const targets = ["chrome", "firefox"];

for (const target of targets) {
  const targetDir = path.join(distDir, target);
  if (!fs.existsSync(targetDir)) {
    console.error(`Target directory ${targetDir} not found. Run build:${target} first.`);
    continue;
  }

  const zip = new AdmZip();
  // Add the contents of the target directory to the zip archive without the parent folder name
  zip.addLocalFolder(targetDir);

  const zipPath = path.join(distDir, `yt-dedupe-${target}.zip`);
  zip.writeZip(zipPath);

  console.log(`Successfully created ${zipPath}`);
}
