import assert from "node:assert/strict";
import test from "node:test";

import { startCaptureServer } from "../src/server.js";

test("capture server exposes request, accepts claim and result, then resolves markdown", async () => {
  const server = await startCaptureServer({ port: 0, timeoutMs: 5000 });
  try {
    const requestResponse = await fetch(`http://127.0.0.1:${server.port}/api/request`);
    const requestBody = await requestResponse.json();
    assert.equal(requestBody.state, "pending");
    assert.equal(requestBody.requestId, server.requestId);

    const claimResponse = await fetch(`http://127.0.0.1:${server.port}/api/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: server.requestId,
        url: "https://example.com",
        title: "Example",
      }),
    });
    assert.equal(claimResponse.status, 200);

    const wait = server.waitForResult();
    const resultResponse = await fetch(`http://127.0.0.1:${server.port}/api/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: server.requestId,
        payload: {
          page: { url: "https://example.com", title: "Example" },
          selection: { x: 1, y: 2, width: 3, height: 4 },
          text: "Captured text",
          elements: [{ selector: "main", tag: "main", text: "Captured text" }],
        },
      }),
    });
    assert.equal(resultResponse.status, 200);

    const result = await wait;
    assert.match(result.markdown, /Captured text/);
    assert.equal(result.payload.page.url, "https://example.com");
  } finally {
    await server.close();
  }
});

test("capture server rejects mismatched request ids", async () => {
  const server = await startCaptureServer({ port: 0, timeoutMs: 5000 });
  try {
    const response = await fetch(`http://127.0.0.1:${server.port}/api/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: "wrong" }),
    });
    assert.equal(response.status, 409);
  } finally {
    await server.close();
  }
});
