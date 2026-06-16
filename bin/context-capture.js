#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  EXTENSION_DIR,
  LATEST_MARKDOWN_PATH,
  VERSION,
} from "../src/config.js";
import { readClipboard } from "../src/clipboard.js";
import { getChromeExtensionStatus } from "../src/chrome-extension.js";
import { readLatestMarkdown } from "../src/store.js";

function usage() {
  return `context-capture ${VERSION}

Usage:
  context-capture capture
  context-capture latest
  context-capture doctor

Commands:
  capture   Show how to capture from Chrome extension.
  latest    Print the latest captured Markdown.
  doctor    Check local prerequisites and installation paths.
`;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      args._.push(value);
      continue;
    }

    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (key === "noClipboard" || key === "help") {
      args[key] = true;
      continue;
    }

    const next = inlineValue ?? argv[i + 1];
    if (inlineValue === undefined) i += 1;
    args[key] = next;
  }
  return args;
}

function numberArg(value, fallback, label) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return parsed;
}

function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-lc", `command -v ${command}`], {
      stdio: "ignore",
    });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

async function capture() {
  const extensionStatus = await getChromeExtensionStatus();
  if (!extensionStatus.enabled) {
    throw new Error(
      [
        "Context Capture extension is not loaded in this Chrome profile.",
        `Load it from: ${EXTENSION_DIR}`,
        "Chrome: chrome://extensions > Developer mode > Load unpacked",
      ].join("\n"),
    );
  }

  process.stdout.write(
    [
      "Open Chrome and click the pinned Context Capture C icon.",
      "Drag the page area you want to capture.",
      "The result will be copied to clipboard and saved to /tmp/context-capture/latest.md.",
      "",
      "After capture, run:",
      "context-capture latest",
      "",
    ].join("\n"),
  );
}

async function latest() {
  const clipboard = await readClipboard();
  let markdown = "";
  if (clipboard.trimStart().startsWith("# Captured Web Context")) {
    markdown = clipboard;
  } else {
    markdown = await readLatestMarkdown();
  }
  if (!markdown) {
    throw new Error(
      `No latest capture found at ${LATEST_MARKDOWN_PATH}, and clipboard does not contain a Context Capture result.`,
    );
  }
  process.stdout.write(`${markdown.trimEnd()}\n`);
}

async function doctor() {
  const rows = [];
  let ok = true;

  rows.push(["Node", process.version, true]);
  rows.push(["CLI", new URL(import.meta.url).pathname, true]);

  const pbcopy = await commandExists("pbcopy");
  rows.push(["pbcopy", pbcopy ? "found" : "missing", pbcopy]);
  if (!pbcopy) ok = false;

  const pbpaste = await commandExists("pbpaste");
  rows.push(["pbpaste", pbpaste ? "found" : "missing", pbpaste]);
  if (!pbpaste) ok = false;

  const extensionExists = await fs
    .access(EXTENSION_DIR)
    .then(() => true)
    .catch(() => false);
  rows.push(["Chrome extension source", EXTENSION_DIR, extensionExists]);
  if (!extensionExists) ok = false;

  const extensionStatus = await getChromeExtensionStatus();
  rows.push([
    "Chrome extension loaded",
    extensionStatus.enabled ? extensionStatus.message : extensionStatus.message,
    extensionStatus.enabled,
  ]);
  if (!extensionStatus.enabled) ok = false;

  const nativeHost = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "Google",
    "Chrome",
    "NativeMessagingHosts",
    "com.moonkey48.context_capture.json",
  );
  const nativeHostExists = await fs
    .access(nativeHost)
    .then(() => true)
    .catch(() => false);
  rows.push([
    "Native messaging host",
    nativeHostExists ? `${nativeHost} (optional)` : "not installed (optional)",
    true,
  ]);

  const home = os.homedir();
  const codexSkill = path.join(home, ".codex", "skills", "capture-web-context", "SKILL.md");
  const claudeSkill = path.join(home, ".claude", "skills", "capture-web-context", "SKILL.md");
  const claudeCommand = path.join(home, ".claude", "commands", "capture-context.md");
  for (const [label, file] of [
    ["Codex skill", codexSkill],
    ["Claude skill", claudeSkill],
    ["Claude command", claudeCommand],
  ]) {
    const exists = await fs
      .access(file)
      .then(() => true)
      .catch(() => false);
    rows.push([label, exists ? file : "not installed", exists]);
  }

  for (const [label, detail, passed] of rows) {
    process.stdout.write(`${passed ? "[OK]" : "[!!]"} ${label}: ${detail}\n`);
  }

  process.stdout.write(`\nLoad this unpacked extension in Chrome:\n${EXTENSION_DIR}\n`);
  process.stdout.write("Chrome: chrome://extensions -> Developer mode -> Load unpacked\n");
  process.stdout.write("Then pin the Context Capture C icon and click it to capture.\n");

  if (!ok) process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "help";

  if (args.help || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "capture" || command === "request") {
    await capture(args);
    return;
  }

  if (command === "latest") {
    await latest();
    return;
  }

  if (command === "doctor") {
    await doctor(args);
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
