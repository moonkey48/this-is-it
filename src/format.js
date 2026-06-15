const MAX_SELECTED_TEXT = 8000;
const MAX_ELEMENT_TEXT = 220;
const MAX_DOM_ELEMENTS = 35;
const MAX_LINKS = 15;
const MAX_IMAGES = 12;
const MAX_HEADINGS = 10;

function normalizeSpace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max) {
  const text = normalizeSpace(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}...`;
}

function cleanUrl(value) {
  return normalizeSpace(value).replace(/[)\]]/g, encodeURIComponent);
}

function line(value) {
  return normalizeSpace(value).replace(/\|/g, "\\|");
}

function formatLink(item) {
  const text = truncate(item.text || item.href || "link", 120).replace(/\]/g, "\\]");
  const href = cleanUrl(item.href || "");
  return href ? `[${text}](${href})` : text;
}

function compactElement(element) {
  const attributes = [];
  if (element.role) attributes.push(`role="${line(element.role)}"`);
  if (element.label) attributes.push(`label="${line(element.label)}"`);
  if (element.href) attributes.push(`href="${line(element.href)}"`);
  if (element.src) attributes.push(`src="${line(element.src)}"`);
  if (element.alt) attributes.push(`alt="${line(element.alt)}"`);

  const tag = normalizeSpace(element.tag || "element").toLowerCase();
  const selector = normalizeSpace(element.selector || tag);
  const attrText = attributes.length ? ` ${attributes.join(" ")}` : "";
  const text = truncate(element.text || element.value || "", MAX_ELEMENT_TEXT);
  return `- \`${selector}\` <${tag}${attrText}>${text ? ` ${text}` : ""}`;
}

export function normalizeCapturePayload(payload) {
  const page = payload.page || {};
  const selection = payload.selection || {};
  return {
    requestId: payload.requestId || "",
    capturedAt: payload.capturedAt || new Date().toISOString(),
    page: {
      url: normalizeSpace(page.url || payload.url || ""),
      title: normalizeSpace(page.title || payload.title || ""),
    },
    selection: {
      x: Math.round(Number(selection.x || 0)),
      y: Math.round(Number(selection.y || 0)),
      width: Math.round(Number(selection.width || 0)),
      height: Math.round(Number(selection.height || 0)),
      viewport: {
        width: Math.round(Number(selection.viewport?.width || 0)),
        height: Math.round(Number(selection.viewport?.height || 0)),
        devicePixelRatio: Number(selection.viewport?.devicePixelRatio || 1),
      },
    },
    text: truncate(payload.text || payload.selectedText || "", MAX_SELECTED_TEXT),
    headings: Array.isArray(payload.headings)
      ? payload.headings.slice(0, MAX_HEADINGS).map((heading) => ({
          level: Number(heading.level || 0),
          text: truncate(heading.text, 180),
        }))
      : [],
    links: Array.isArray(payload.links)
      ? payload.links.slice(0, MAX_LINKS).map((linkItem) => ({
          text: truncate(linkItem.text, 160),
          href: normalizeSpace(linkItem.href),
        }))
      : [],
    images: Array.isArray(payload.images)
      ? payload.images.slice(0, MAX_IMAGES).map((image) => ({
          alt: truncate(image.alt, 160),
          src: normalizeSpace(image.src),
        }))
      : [],
    elements: Array.isArray(payload.elements)
      ? payload.elements.slice(0, MAX_DOM_ELEMENTS).map((element) => ({
          selector: truncate(element.selector, 180),
          tag: truncate(element.tag, 40),
          role: truncate(element.role, 80),
          label: truncate(element.label, 120),
          href: normalizeSpace(element.href),
          src: normalizeSpace(element.src),
          alt: truncate(element.alt, 120),
          value: truncate(element.value, 120),
          text: truncate(element.text, MAX_ELEMENT_TEXT),
        }))
      : [],
  };
}

export function formatCapture(payload) {
  const capture = normalizeCapturePayload(payload);
  const lines = [];
  const viewport = capture.selection.viewport;

  lines.push("# Captured Web Context");
  lines.push("");
  lines.push(`- URL: ${capture.page.url || "(unknown)"}`);
  lines.push(`- Title: ${capture.page.title || "(untitled)"}`);
  lines.push(`- Captured: ${capture.capturedAt}`);
  lines.push(
    `- Area: x=${capture.selection.x}, y=${capture.selection.y}, width=${capture.selection.width}, height=${capture.selection.height}, viewport=${viewport.width}x${viewport.height}, dpr=${viewport.devicePixelRatio}`,
  );

  lines.push("");
  lines.push("## Selected Text");
  lines.push("");
  lines.push(capture.text || "(no visible text captured)");

  if (capture.headings.length) {
    lines.push("");
    lines.push("## Nearby Headings");
    lines.push("");
    for (const heading of capture.headings) {
      const prefix = heading.level ? `H${heading.level}` : "Heading";
      lines.push(`- ${prefix}: ${heading.text}`);
    }
  }

  if (capture.links.length) {
    lines.push("");
    lines.push("## Links");
    lines.push("");
    for (const item of capture.links) {
      lines.push(`- ${formatLink(item)}`);
    }
  }

  if (capture.images.length) {
    lines.push("");
    lines.push("## Images");
    lines.push("");
    for (const image of capture.images) {
      const alt = image.alt || "(no alt text)";
      lines.push(`- ${alt}${image.src ? ` — ${image.src}` : ""}`);
    }
  }

  lines.push("");
  lines.push("## DOM Summary");
  lines.push("");
  if (capture.elements.length) {
    for (const element of capture.elements) lines.push(compactElement(element));
  } else {
    lines.push("(no DOM elements captured)");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
