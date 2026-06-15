import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { EXTENSION_DIR, STATE_DIR } from "./config.js";

function appleScriptString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function runOsascript(scriptLines) {
  return new Promise((resolve) => {
    const args = scriptLines.flatMap((line) => ["-e", line]);
    const child = spawn("osascript", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolve({ ok: false, error: error.message, stdout, stderr });
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        error: code === 0 ? "" : stderr.trim() || `osascript exited with ${code}`,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

export async function triggerChromeSelection({ requestId }) {
  if (process.platform !== "darwin") {
    return { ok: false, error: "Automatic Chrome triggering is only implemented on macOS." };
  }

  const contentScriptPath = path.join(EXTENSION_DIR, "content-script.js");
  const source = await fs.readFile(contentScriptPath, "utf8");
  const injectedSource = `${source}
if (typeof window.__contextCaptureStart === "function") {
  window.__contextCaptureStart({ requestId: ${JSON.stringify(requestId)} });
} else {
  throw new Error("Context Capture script did not expose a starter.");
}
`;

  await fs.mkdir(STATE_DIR, { recursive: true });
  const injectPath = path.join(STATE_DIR, `inject-${requestId}.js`);
  await fs.writeFile(injectPath, injectedSource, "utf8");

  return runOsascript([
    `set jsPath to ${appleScriptString(injectPath)}`,
    "set jsSource to read POSIX file jsPath as text",
    'tell application "Google Chrome"',
    "if not (exists front window) then error \"No Chrome window is open.\"",
    "set tabUrl to URL of active tab of front window",
    'if tabUrl starts with "chrome://" or tabUrl starts with "chrome-extension://" or tabUrl starts with "about:" then error "The active Chrome tab does not allow page script injection."',
    "execute active tab of front window javascript jsSource",
    "end tell",
  ]);
}
