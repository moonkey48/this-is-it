import crypto from "node:crypto";
import http from "node:http";

import { DEFAULT_PORT, VERSION } from "./config.js";
import { formatCapture, normalizeCapturePayload } from "./format.js";
import { writeLatest } from "./store.js";

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy(new Error("Request body is too large."));
      }
    });
    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
}

export async function startCaptureServer(options = {}) {
  const port = Number(options.port ?? DEFAULT_PORT);
  const host = options.host || "127.0.0.1";
  const timeoutMs = Number(options.timeoutMs || 60_000);
  const requestId = crypto.randomUUID();
  const deferred = createDeferred();
  const state = {
    requestId,
    status: "pending",
    startedAt: new Date().toISOString(),
    claimedAt: "",
    claimedBy: null,
    settled: false,
  };

  function settleError(message) {
    if (state.settled) return;
    state.settled = true;
    state.status = "error";
    deferred.reject(new Error(message));
  }

  async function settlePayload(rawPayload) {
    if (state.settled) return;
    state.settled = true;
    state.status = "complete";
    const payload = normalizeCapturePayload({
      ...rawPayload,
      requestId,
      capturedAt: rawPayload.capturedAt || new Date().toISOString(),
    });
    const markdown = formatCapture(payload);
    await writeLatest(payload, markdown);
    deferred.resolve({ payload, markdown });
  }

  const timer = setTimeout(() => {
    settleError(`Timed out after ${Math.round(timeoutMs / 1000)} seconds waiting for Chrome selection.`);
  }, timeoutMs);
  timer.unref?.();

  const server = http.createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS") {
        sendJson(response, 204, {});
        return;
      }

      const url = new URL(request.url || "/", `http://${host}:${port}`);

      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, 200, {
          ok: true,
          version: VERSION,
          requestId,
          status: state.status,
        });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/request") {
        if (state.status === "pending") {
          sendJson(response, 200, {
            state: "pending",
            requestId,
            startedAt: state.startedAt,
            instruction: "select-region",
          });
          return;
        }

        sendJson(response, 200, {
          state: state.status,
          requestId,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/claim") {
        const body = await readJson(request);
        if (body.requestId !== requestId) {
          sendJson(response, 409, { ok: false, error: "request-id-mismatch" });
          return;
        }
        if (state.status !== "pending") {
          sendJson(response, 409, { ok: false, error: "already-claimed-or-settled" });
          return;
        }
        state.status = "claimed";
        state.claimedAt = new Date().toISOString();
        state.claimedBy = {
          url: body.url || "",
          title: body.title || "",
        };
        sendJson(response, 200, { ok: true, requestId });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/result") {
        const body = await readJson(request);
        if (body.requestId !== requestId) {
          sendJson(response, 409, { ok: false, error: "request-id-mismatch" });
          return;
        }
        if (body.cancelled || body.error) {
          settleError(body.error || "Capture was cancelled.");
          sendJson(response, 200, { ok: true });
          return;
        }
        await settlePayload(body.payload || body);
        sendJson(response, 200, { ok: true });
        return;
      }

      sendJson(response, 404, { ok: false, error: "not-found" });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  return {
    port: actualPort,
    requestId,
    waitForResult: () => deferred.promise,
    close: () =>
      new Promise((resolve) => {
        clearTimeout(timer);
        server.close(() => resolve());
      }),
  };
}
