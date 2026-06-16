import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { EXTENSION_DIR } from "./config.js";

function normalizePath(value) {
  return path.resolve(String(value || "")).replace(/\/+$/, "");
}

export function findContextCaptureEntries(preferences, extensionDir = EXTENSION_DIR) {
  const settings = preferences?.extensions?.settings;
  if (!settings || typeof settings !== "object") return [];

  const wantedPath = normalizePath(extensionDir);
  const entries = [];
  for (const [id, setting] of Object.entries(settings)) {
    const manifestName = setting?.manifest?.name || "";
    const extensionPath = setting?.path || "";
    const pathMatches = extensionPath && normalizePath(extensionPath) === wantedPath;
    const nameMatches = manifestName === "Context Capture";
    if (!pathMatches && !nameMatches) continue;

    entries.push({
      id,
      name: manifestName || "Context Capture",
      path: extensionPath,
      enabled: setting?.state === 1,
      state: setting?.state,
    });
  }
  return entries;
}

export async function getChromeExtensionStatus(extensionDir = EXTENSION_DIR) {
  if (process.platform !== "darwin") {
    return {
      supported: false,
      found: false,
      enabled: false,
      entries: [],
      message: "Chrome profile inspection is only implemented on macOS.",
    };
  }

  const chromeRoot = path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
  let profileDirs = [];
  try {
    profileDirs = await fs.readdir(chromeRoot, { withFileTypes: true });
  } catch {
    return {
      supported: true,
      found: false,
      enabled: false,
      entries: [],
      message: "Chrome profile directory was not found.",
    };
  }

  const entries = [];
  for (const dirent of profileDirs) {
    if (!dirent.isDirectory()) continue;
    const preferencesPath = path.join(chromeRoot, dirent.name, "Preferences");
    let preferences;
    try {
      preferences = JSON.parse(await fs.readFile(preferencesPath, "utf8"));
    } catch {
      continue;
    }

    for (const entry of findContextCaptureEntries(preferences, extensionDir)) {
      entries.push({ ...entry, profile: dirent.name });
    }
  }

  const enabledEntries = entries.filter((entry) => entry.enabled);
  return {
    supported: true,
    found: entries.length > 0,
    enabled: enabledEntries.length > 0,
    entries,
    message: enabledEntries.length
      ? enabledEntries.map((entry) => `${entry.profile}/${entry.id}`).join(", ")
      : entries.length
        ? entries.map((entry) => `${entry.profile}/${entry.id} disabled`).join(", ")
        : "not loaded in any Chrome profile",
  };
}
