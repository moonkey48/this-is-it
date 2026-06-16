import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const extensionDir = join(root, "extension");
const manifestPath = join(extensionDir, "manifest.json");
const allowedPermissions = new Set(["activeTab", "clipboardWrite", "scripting"]);
const iconSizes = ["16", "32", "48", "128"];
const forbiddenExtensionText = [
  "nativeMessaging",
  "sendNativeMessage",
  "context-capture:save",
  "Claude",
  "Claude Code",
  "Codex",
];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`[FAIL] ${message}`);
}

function pass(message) {
  console.log(`[OK] ${message}`);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.manifest_version === 3) pass("manifest_version is 3");
else fail("manifest_version must be 3");

if (manifest.description && manifest.description.length <= 132) pass("description is present and under 132 characters");
else fail("description must be present and under 132 characters");

for (const permission of manifest.permissions || []) {
  if (!allowedPermissions.has(permission)) fail(`unexpected permission: ${permission}`);
}
if ((manifest.permissions || []).every((permission) => allowedPermissions.has(permission))) {
  pass("permissions are limited to activeTab, clipboardWrite, and scripting");
}

if (!manifest.host_permissions?.length) pass("no persistent host permissions");
else fail("host_permissions must be removed for store-ready click-to-capture mode");

if (!manifest.content_scripts?.length) pass("no always-on content scripts");
else fail("content_scripts must be removed; inject only after user action");

if (manifest.background?.service_worker && (await exists(join(extensionDir, manifest.background.service_worker)))) {
  pass("background service worker exists");
} else {
  fail("background service worker is missing");
}

if (await exists(join(extensionDir, "content-script.js"))) pass("content script exists");
else fail("content-script.js is missing");

for (const size of iconSizes) {
  const iconPath = manifest.icons?.[size];
  if (!iconPath) {
    fail(`manifest icon ${size} is missing`);
    continue;
  }
  if (!iconPath.endsWith(".png")) fail(`manifest icon ${size} must be PNG`);
  else if (await exists(join(extensionDir, iconPath))) pass(`manifest icon ${size} exists`);
  else fail(`manifest icon ${size} file is missing: ${iconPath}`);

  const actionIconPath = manifest.action?.default_icon?.[size];
  if (!actionIconPath) {
    fail(`action icon ${size} is missing`);
  } else if (await exists(join(extensionDir, actionIconPath))) {
    pass(`action icon ${size} exists`);
  } else {
    fail(`action icon ${size} file is missing: ${actionIconPath}`);
  }
}

for (const file of ["manifest.json", "background.js", "content-script.js"]) {
  const text = await readFile(join(extensionDir, file), "utf8");
  for (const needle of forbiddenExtensionText) {
    if (text.includes(needle)) fail(`${file} still contains forbidden release text: ${needle}`);
  }
}

if (failures > 0) {
  console.error(`\nChrome extension validation failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("\nChrome extension validation passed.");
