import fs from "node:fs/promises";

import { LATEST_JSON_PATH, LATEST_MARKDOWN_PATH, STATE_DIR } from "./config.js";

export async function writeLatest(payload, markdown) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(LATEST_MARKDOWN_PATH, markdown, "utf8"),
    fs.writeFile(LATEST_JSON_PATH, JSON.stringify(payload, null, 2), "utf8"),
  ]);
}

export async function readLatestMarkdown() {
  try {
    return await fs.readFile(LATEST_MARKDOWN_PATH, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}
