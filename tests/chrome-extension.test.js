import assert from "node:assert/strict";
import test from "node:test";

import { findContextCaptureEntries } from "../src/chrome-extension.js";

test("findContextCaptureEntries detects enabled unpacked extension by path", () => {
  const entries = findContextCaptureEntries(
    {
      extensions: {
        settings: {
          abc: {
            path: "/tmp/context-capture/extension",
            state: 1,
            manifest: { name: "Context Capture" },
          },
        },
      },
    },
    "/tmp/context-capture/extension",
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, "abc");
  assert.equal(entries[0].enabled, true);
});

test("findContextCaptureEntries ignores unrelated extensions", () => {
  const entries = findContextCaptureEntries(
    {
      extensions: {
        settings: {
          abc: {
            path: "/tmp/other/extension",
            state: 1,
            manifest: { name: "Other Extension" },
          },
        },
      },
    },
    "/tmp/context-capture/extension",
  );

  assert.deepEqual(entries, []);
});

test("findContextCaptureEntries detects enabled unpacked extension in Secure Preferences shape", () => {
  const entries = findContextCaptureEntries(
    {
      extensions: {
        settings: {
          abc: {
            path: "/tmp/context-capture/extension",
            location: 4,
            disable_reasons: [],
          },
        },
      },
    },
    "/tmp/context-capture/extension",
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].enabled, true);
});

test("findContextCaptureEntries can include context capture from another checkout", () => {
  const entries = findContextCaptureEntries(
    {
      extensions: {
        settings: {
          abc: {
            path: "/tmp/other/this-is-it/extension",
            disable_reasons: [],
          },
        },
      },
    },
    "/tmp/current/this-is-it/extension",
    { includeOtherContextCapturePaths: true },
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].enabled, true);
  assert.equal(entries[0].matchesCurrentPath, false);
});
