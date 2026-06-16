#!/usr/bin/env node
import { readNativeMessage, writeNativeMessage } from "../src/native-protocol.js";
import { formatCapture, normalizeCapturePayload } from "../src/format.js";
import { writeLatest } from "../src/store.js";

async function handleMessage(message) {
  if (message?.type !== "capture-result") {
    return { ok: false, error: "unsupported-message-type" };
  }

  const payload = normalizeCapturePayload(message.payload || {});
  const markdown = formatCapture(payload);
  await writeLatest(payload, markdown);
  return { ok: true, markdown };
}

async function main() {
  while (true) {
    const message = await readNativeMessage();
    if (!message) return;
    try {
      writeNativeMessage(await handleMessage(message));
    } catch (error) {
      writeNativeMessage({ ok: false, error: error.message });
    }
  }
}

main().catch((error) => {
  writeNativeMessage({ ok: false, error: error.message });
});
