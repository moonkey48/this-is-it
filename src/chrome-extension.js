import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { EXTENSION_DIR } from "./config.js";

function normalizePath(value) {
  return path.resolve(String(value || "")).replace(/\/+$/, "");
}

function looksLikeContextCapturePath(value) {
  const normalized = normalizePath(value);
  return /(^|\/)this-is-it\/extension$/.test(normalized);
}

export function findContextCaptureEntries(preferences, extensionDir = EXTENSION_DIR, options = {}) {
  const settings = preferences?.extensions?.settings;
  if (!settings || typeof settings !== "object") return [];

  const wantedPath = normalizePath(extensionDir);
  const entries = [];
  for (const [id, setting] of Object.entries(settings)) {
    const manifestName = setting?.manifest?.name || "";
    const extensionPath = setting?.path || "";
    const pathMatches = extensionPath && normalizePath(extensionPath) === wantedPath;
    const nameMatches = manifestName === "Context Capture";
    const candidatePathMatches = options.includeOtherContextCapturePaths && looksLikeContextCapturePath(extensionPath);
    if (!pathMatches && !nameMatches && !candidatePathMatches) continue;
    const disableReasons = Array.isArray(setting?.disable_reasons) ? setting.disable_reasons : [];
    const enabled =
      setting?.state === 1 ||
      (setting?.state === undefined && disableReasons.length === 0 && Boolean(extensionPath));

    entries.push({
      id,
      name: manifestName || "Context Capture",
      path: extensionPath,
      enabled,
      matchesCurrentPath: Boolean(pathMatches || nameMatches),
      state: setting?.state,
      disableReasons,
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
    for (const file of ["Preferences", "Secure Preferences"]) {
      const preferencesPath = path.join(chromeRoot, dirent.name, file);
      let preferences;
      try {
        preferences = JSON.parse(await fs.readFile(preferencesPath, "utf8"));
      } catch {
        continue;
      }

      for (const entry of findContextCaptureEntries(preferences, extensionDir, {
        includeOtherContextCapturePaths: true,
      })) {
        entries.push({ ...entry, profile: dirent.name, file });
      }
    }
  }

  const byProfileAndId = new Map();
  for (const entry of entries) {
    const key = `${entry.profile}/${entry.id}`;
    const existing = byProfileAndId.get(key);
    if (!existing || (!existing.enabled && entry.enabled)) byProfileAndId.set(key, entry);
  }
  const uniqueEntries = [...byProfileAndId.values()];
  const matchingEntries = uniqueEntries.filter((entry) => entry.matchesCurrentPath);
  const enabledEntries = matchingEntries.filter((entry) => entry.enabled);
  const otherEnabledEntries = uniqueEntries.filter((entry) => !entry.matchesCurrentPath && entry.enabled);
  return {
    supported: true,
    found: matchingEntries.length > 0,
    enabled: enabledEntries.length > 0,
    entries: uniqueEntries,
    message: enabledEntries.length
      ? enabledEntries.map((entry) => `${entry.profile}/${entry.id}`).join(", ")
      : matchingEntries.length
        ? matchingEntries.map((entry) => `${entry.profile}/${entry.id} disabled`).join(", ")
        : otherEnabledEntries.length
          ? `loaded from another checkout: ${otherEnabledEntries.map((entry) => entry.path).join(", ")}`
        : "not loaded in any Chrome profile",
  };
}
