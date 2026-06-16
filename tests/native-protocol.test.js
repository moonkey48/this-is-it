import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";

import { readNativeMessage, writeNativeMessage } from "../src/native-protocol.js";

test("native protocol writes and reads a message", async () => {
  const stream = new PassThrough();
  writeNativeMessage({ ok: true, value: 42 }, stream);
  stream.end();

  const message = await readNativeMessage(stream);
  assert.deepEqual(message, { ok: true, value: 42 });
});
