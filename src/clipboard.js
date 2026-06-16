import { spawn } from "node:child_process";

export function copyToClipboard(text) {
  return new Promise((resolve) => {
    const child = spawn("pbcopy", [], { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
    child.stdin.end(text);
  });
}

export function readClipboard() {
  return new Promise((resolve) => {
    const child = spawn("pbpaste", [], { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", () => resolve(""));
    child.on("close", (code) => resolve(code === 0 ? stdout : ""));
  });
}
