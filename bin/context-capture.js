#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_PORT,
  EXTENSION_DIR,
  LATEST_MARKDOWN_PATH,
  VERSION,
} from "../src/config.js";
import { copyToClipboard } from "../src/clipboard.js";
import { triggerChromeSelection } from "../src/chrome-trigger.js";
import { readLatestMarkdown } from "../src/store.js";
import { startCaptureServer } from "../src/server.js";

function usage() {
  return `context-capture ${VERSION}

Usage:
  context-capture request [--timeout 60] [--no-clipboard]
  context-capture latest
  context-capture doctor [--port ${DEFAULT_PORT}]

Commands:
  request   Wait for a Chrome region selection, copy Markdown, and print it.
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

function checkPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) => {
      resolve({ available: false, error });
    });
    server.once("listening", () => {
      server.close(() => resolve({ available: true }));
    });
    server.listen(port, host);
  });
}

async function requestCapture(args) {
  if (args.port !== undefined && Number(args.port) !== DEFAULT_PORT) {
    throw new Error(
      `The Chrome extension polls the fixed v1 port ${DEFAULT_PORT}. Custom request ports are not supported yet.`,
    );
  }
  const port = DEFAULT_PORT;
  const timeoutSeconds = numberArg(args.timeout, 60, "timeout");

  const portCheck = await checkPort(port);
  if (!portCheck.available) {
    throw new Error(
      `Port ${port} is not available. Another capture may already be waiting, or another process is using it.`,
    );
  }

  const capture = await startCaptureServer({
    port,
    timeoutMs: timeoutSeconds * 1000,
  });

  const trigger = await triggerChromeSelection({ requestId: capture.requestId, port });

  console.error(
    [
      `Waiting for Chrome selection on http://127.0.0.1:${capture.port}`,
      trigger.ok
        ? "Triggered the active Chrome tab. Select an area in Chrome."
        : `Could not trigger Chrome automatically: ${trigger.error}`,
      "If nothing appears, reload the page or click the Context Capture extension button while this command is waiting.",
    ].join("\n"),
  );

  try {
    const result = await capture.waitForResult();
    if (!args.noClipboard) {
      const copied = await copyToClipboard(result.markdown);
      if (!copied) {
        console.error("Warning: pbcopy was unavailable, so clipboard copy was skipped.");
      }
    }
    process.stdout.write(`${result.markdown.trimEnd()}\n`);
  } finally {
    await capture.close();
  }
}

async function latest() {
  const markdown = await readLatestMarkdown();
  if (!markdown) {
    throw new Error(`No latest capture found at ${LATEST_MARKDOWN_PATH}.`);
  }
  process.stdout.write(`${markdown.trimEnd()}\n`);
}

async function doctor(args) {
  const port = numberArg(args.port, DEFAULT_PORT, "port");
  const rows = [];
  let ok = true;

  rows.push(["Node", process.version, true]);
  rows.push(["CLI", new URL(import.meta.url).pathname, true]);

  const pbcopy = await commandExists("pbcopy");
  rows.push(["pbcopy", pbcopy ? "found" : "missing", pbcopy]);
  if (!pbcopy) ok = false;

  const portCheck = await checkPort(port);
  rows.push([
    `Port ${port}`,
    portCheck.available ? "available" : "busy",
    portCheck.available,
  ]);
  if (!portCheck.available) ok = false;

  const extensionExists = await fs
    .access(EXTENSION_DIR)
    .then(() => true)
    .catch(() => false);
  rows.push(["Chrome extension source", EXTENSION_DIR, extensionExists]);
  if (!extensionExists) ok = false;

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

  if (!ok) process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] ?? "help";

  if (args.help || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "request") {
    await requestCapture(args);
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
