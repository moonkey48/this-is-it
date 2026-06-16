import { mkdir, rm } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(await readFile(join(root, "extension", "manifest.json"), "utf8"));
const distDir = join(root, "dist");
const zipPath = join(distDir, `context-capture-${manifest.version}.zip`);

const validation = spawnSync(process.execPath, ["scripts/validate-extension.mjs"], {
  cwd: root,
  stdio: "inherit",
});
if (validation.status !== 0) process.exit(validation.status ?? 1);

await mkdir(distDir, { recursive: true });
await rm(zipPath, { force: true });

const zip = spawnSync("zip", ["-r", "-q", zipPath, ".", "-x", "*.DS_Store"], {
  cwd: join(root, "extension"),
  stdio: "inherit",
});

if (zip.error) {
  console.error(`Could not run zip: ${zip.error.message}`);
  process.exit(1);
}
if (zip.status !== 0) process.exit(zip.status ?? 1);

console.log(`Created ${zipPath}`);
