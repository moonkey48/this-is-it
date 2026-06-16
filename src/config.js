import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERSION = "0.1.0";
export const STATE_DIR =
  process.env.CONTEXT_CAPTURE_STATE_DIR || path.join(os.tmpdir(), "context-capture");
export const LATEST_MARKDOWN_PATH = path.join(STATE_DIR, "latest.md");
export const LATEST_JSON_PATH = path.join(STATE_DIR, "latest.json");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PROJECT_ROOT = root;
export const EXTENSION_DIR = path.join(root, "extension");
