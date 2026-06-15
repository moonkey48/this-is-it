import assert from "node:assert/strict";
import test from "node:test";

import { formatCapture, normalizeCapturePayload } from "../src/format.js";

test("formatCapture renders compact markdown with page, text, links, images, and DOM", () => {
  const markdown = formatCapture({
    capturedAt: "2026-06-15T00:00:00.000Z",
    page: {
      url: "https://example.com/products",
      title: "Example Products",
    },
    selection: {
      x: 10,
      y: 20,
      width: 300,
      height: 120,
      viewport: { width: 1440, height: 900, devicePixelRatio: 2 },
    },
    text: "Starter plan $19 per month",
    headings: [{ level: 2, text: "Pricing" }],
    links: [{ text: "Learn more", href: "https://example.com/products/starter" }],
    images: [{ alt: "Starter chart", src: "https://example.com/chart.png" }],
    elements: [
      {
        selector: "section.pricing",
        tag: "section",
        role: "region",
        label: "Pricing",
        text: "Starter plan $19 per month",
      },
    ],
  });

  assert.match(markdown, /# Captured Web Context/);
  assert.match(markdown, /URL: https:\/\/example\.com\/products/);
  assert.match(markdown, /Starter plan \$19 per month/);
  assert.match(markdown, /\[Learn more\]\(https:\/\/example\.com\/products\/starter\)/);
  assert.match(markdown, /Starter chart/);
  assert.match(markdown, /`section\.pricing` <section role="region" label="Pricing">/);
});

test("normalizeCapturePayload caps arrays to stable sizes", () => {
  const payload = normalizeCapturePayload({
    links: Array.from({ length: 30 }, (_, index) => ({
      text: `Link ${index}`,
      href: `https://example.com/${index}`,
    })),
    images: Array.from({ length: 30 }, (_, index) => ({
      alt: `Image ${index}`,
      src: `https://example.com/${index}.png`,
    })),
    elements: Array.from({ length: 80 }, (_, index) => ({
      selector: `div:nth-child(${index})`,
      tag: "div",
      text: "x",
    })),
  });

  assert.equal(payload.links.length, 15);
  assert.equal(payload.images.length, 12);
  assert.equal(payload.elements.length, 35);
});
