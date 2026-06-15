(function installContextCapture() {
  if (window.__contextCaptureInstalled && window.__contextCaptureStart) return;
  window.__contextCaptureInstalled = true;

  const PORT = 37421;
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  const POLL_INTERVAL_MS = 900;
  const MAX_TEXT_LENGTH = 8000;
  const MAX_ELEMENTS = 35;
  const MAX_LINKS = 15;
  const MAX_IMAGES = 12;
  let overlayActive = false;
  let lastRequestId = "";
  let pollTimer = 0;

  function normalizeSpace(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncate(value, max) {
    const text = normalizeSpace(value);
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}...` : text;
  }

  function viewportRect(rect) {
    const left = Math.max(0, Math.min(rect.x, rect.x + rect.width));
    const top = Math.max(0, Math.min(rect.y, rect.y + rect.height));
    const right = Math.min(window.innerWidth, Math.max(rect.x, rect.x + rect.width));
    const bottom = Math.min(window.innerHeight, Math.max(rect.y, rect.y + rect.height));
    return {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(Math.max(0, right - left)),
      height: Math.round(Math.max(0, bottom - top)),
    };
  }

  function rectsIntersect(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function elementRect(element) {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }

  function isVisible(element) {
    if (!(element instanceof Element)) return false;
    if (element.closest(".__context_capture_overlay, .__context_capture_box, .__context_capture_toast")) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function textForElement(element) {
    const tag = element.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") {
      return normalizeSpace(element.value || element.placeholder || element.getAttribute("aria-label"));
    }
    if (tag === "select") {
      return normalizeSpace(element.selectedOptions?.[0]?.textContent || element.getAttribute("aria-label"));
    }
    if (tag === "img") {
      return normalizeSpace(element.getAttribute("alt") || element.getAttribute("aria-label"));
    }
    return normalizeSpace(element.innerText || element.textContent || element.getAttribute("aria-label"));
  }

  function cssIdent(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function selectorFor(element) {
    if (element.id) return `${element.tagName.toLowerCase()}#${cssIdent(element.id)}`;
    const testId = element.getAttribute("data-testid") || element.getAttribute("data-test");
    if (testId) return `${element.tagName.toLowerCase()}[data-testid="${testId.replace(/"/g, '\\"')}"]`;
    const classes = Array.from(element.classList || [])
      .filter((name) => !name.startsWith("__context_capture"))
      .slice(0, 2);
    const classText = classes.length ? `.${classes.map(cssIdent).join(".")}` : "";
    const parent = element.parentElement;
    if (!parent) return `${element.tagName.toLowerCase()}${classText}`;
    const sameTagSiblings = Array.from(parent.children).filter(
      (child) => child.tagName === element.tagName,
    );
    const nth =
      sameTagSiblings.length > 1 ? `:nth-of-type(${sameTagSiblings.indexOf(element) + 1})` : "";
    return `${element.tagName.toLowerCase()}${classText}${nth}`;
  }

  function absoluteUrl(value) {
    if (!value) return "";
    try {
      return new URL(value, document.baseURI).href;
    } catch {
      return value;
    }
  }

  function uniqueBy(items, keyFn, max) {
    const seen = new Set();
    const result = [];
    for (const item of items) {
      const key = keyFn(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(item);
      if (result.length >= max) break;
    }
    return result;
  }

  function collectElements(selection) {
    const selected = {
      left: selection.x,
      top: selection.y,
      right: selection.x + selection.width,
      bottom: selection.y + selection.height,
    };
    const candidates = Array.from(
      document.querySelectorAll(
        "a,button,input,textarea,select,img,h1,h2,h3,h4,p,li,article,section,main,nav,header,footer,label,summary,div,span,[role],[aria-label],[data-testid]",
      ),
    );

    return candidates
      .filter((element) => {
        if (!isVisible(element)) return false;
        const rect = elementRect(element);
        return rectsIntersect(rect, selected);
      })
      .map((element) => {
        const rect = elementRect(element);
        const text = textForElement(element);
        return {
          element,
          rect,
          area: Math.min(rect.right, selected.right) - Math.max(rect.left, selected.left),
          text,
        };
      })
      .filter((item) => item.text || item.element.matches("a,img,input,button,[role],[aria-label]"))
      .sort((a, b) => b.area - a.area);
  }

  function selectedTextFrom(items) {
    const parts = [];
    for (const item of items) {
      const text = truncate(item.text, 1000);
      if (!text) continue;
      if (parts.some((part) => part.includes(text) || text.includes(part))) continue;
      parts.push(text);
      if (parts.join("\n").length >= MAX_TEXT_LENGTH) break;
    }
    return truncate(parts.join("\n"), MAX_TEXT_LENGTH);
  }

  function collectHeadings(selection) {
    const centerY = selection.y + selection.height / 2;
    return Array.from(document.querySelectorAll("h1,h2,h3,h4"))
      .filter(isVisible)
      .map((element) => ({
        level: Number(element.tagName.slice(1)),
        text: truncate(textForElement(element), 180),
        distance: Math.abs(element.getBoundingClientRect().top - centerY),
      }))
      .filter((heading) => heading.text)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10)
      .map(({ level, text }) => ({ level, text }));
  }

  function payloadForSelection(selection) {
    const items = collectElements(selection);
    const links = uniqueBy(
      items
        .map((item) => item.element.closest("a"))
        .filter(Boolean)
        .map((element) => ({
          text: truncate(textForElement(element), 160),
          href: absoluteUrl(element.getAttribute("href")),
        })),
      (item) => item.href || item.text,
      MAX_LINKS,
    );

    const images = uniqueBy(
      items
        .map((item) => (item.element.matches("img") ? item.element : item.element.querySelector("img")))
        .filter(Boolean)
        .map((element) => ({
          alt: truncate(element.getAttribute("alt") || element.getAttribute("aria-label"), 160),
          src: absoluteUrl(element.currentSrc || element.getAttribute("src")),
        })),
      (item) => item.src || item.alt,
      MAX_IMAGES,
    );

    const elements = uniqueBy(
      items.map((item) => {
        const element = item.element;
        return {
          selector: selectorFor(element),
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute("role") || "",
          label: element.getAttribute("aria-label") || element.getAttribute("title") || "",
          href: element.matches("a") ? absoluteUrl(element.getAttribute("href")) : "",
          src: element.matches("img") ? absoluteUrl(element.currentSrc || element.getAttribute("src")) : "",
          alt: element.matches("img") ? element.getAttribute("alt") || "" : "",
          value: element.matches("input,textarea,select") ? textForElement(element) : "",
          text: truncate(item.text, 220),
        };
      }),
      (item) => `${item.selector}:${item.text}:${item.href}:${item.src}`,
      MAX_ELEMENTS,
    );

    return {
      capturedAt: new Date().toISOString(),
      page: {
        url: location.href,
        title: document.title,
      },
      selection: {
        ...selection,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio || 1,
        },
      },
      text: selectedTextFrom(items),
      headings: collectHeadings(selection),
      links,
      images,
      elements,
    };
  }

  function localMarkdown(payload) {
    const lines = [
      "# Captured Web Context",
      "",
      `- URL: ${payload.page.url}`,
      `- Title: ${payload.page.title || "(untitled)"}`,
      `- Captured: ${payload.capturedAt}`,
      "",
      "## Selected Text",
      "",
      payload.text || "(no visible text captured)",
      "",
      "## DOM Summary",
      "",
    ];
    for (const element of payload.elements.slice(0, MAX_ELEMENTS)) {
      lines.push(`- \`${element.selector}\` <${element.tag}> ${element.text || element.label || ""}`.trim());
    }
    return `${lines.join("\n").trimEnd()}\n`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.documentElement.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function toast(message) {
    const existing = document.querySelector(".__context_capture_toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "__context_capture_toast";
    node.textContent = message;
    document.documentElement.appendChild(node);
    setTimeout(() => node.remove(), 2800);
  }

  async function postResult(requestId, payload) {
    const response = await fetch(`${BASE_URL}/api/result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, payload }),
    });
    return response.ok;
  }

  function startOverlay(options = {}) {
    if (overlayActive) return;
    overlayActive = true;

    const overlay = document.createElement("div");
    const box = document.createElement("div");
    overlay.className = "__context_capture_overlay";
    box.className = "__context_capture_box";
    document.documentElement.append(overlay, box);

    let startX = 0;
    let startY = 0;
    let dragging = false;

    function renderBox(rect) {
      box.style.left = `${rect.x}px`;
      box.style.top = `${rect.y}px`;
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
    }

    function cleanup() {
      overlay.remove();
      box.remove();
      overlayActive = false;
    }

    overlay.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      startX = event.clientX;
      startY = event.clientY;
      dragging = true;
      overlay.setPointerCapture(event.pointerId);
      renderBox({ x: startX, y: startY, width: 0, height: 0 });
    });

    overlay.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      renderBox(
        viewportRect({
          x: startX,
          y: startY,
          width: event.clientX - startX,
          height: event.clientY - startY,
        }),
      );
    });

    overlay.addEventListener("pointerup", async (event) => {
      if (!dragging) return;
      dragging = false;
      const selection = viewportRect({
        x: startX,
        y: startY,
        width: event.clientX - startX,
        height: event.clientY - startY,
      });
      cleanup();

      if (selection.width < 6 || selection.height < 6) {
        toast("Selection was too small.");
        return;
      }

      const payload = payloadForSelection(selection);
      if (options.requestId) {
        try {
          const posted = await postResult(options.requestId, payload);
          if (posted) {
            toast("Captured for agent.");
            return;
          }
        } catch {
          // Fall back to local clipboard copy below.
        }
      }

      const copied = await copyText(localMarkdown(payload));
      toast(copied ? "Captured to clipboard." : "Capture ready, but clipboard copy failed.");
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        cleanup();
        if (options.requestId) {
          fetch(`${BASE_URL}/api/result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId: options.requestId, cancelled: true }),
          }).catch(() => {});
        }
      }
    });
    overlay.tabIndex = -1;
    overlay.focus();
  }

  async function claimRequest(requestId) {
    const response = await fetch(`${BASE_URL}/api/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, url: location.href, title: document.title }),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return Boolean(body.ok);
  }

  async function poll() {
    if (document.visibilityState !== "visible" || window.top !== window || overlayActive) return;
    try {
      const response = await fetch(`${BASE_URL}/api/request`, { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      if (body.state !== "pending" || !body.requestId || body.requestId === lastRequestId) return;
      lastRequestId = body.requestId;
      const claimed = await claimRequest(body.requestId);
      if (claimed) startOverlay({ requestId: body.requestId });
    } catch {
      // The helper server only exists while an agent command is waiting.
    }
  }

  async function startPendingOrManual() {
    try {
      const response = await fetch(`${BASE_URL}/api/request`, { cache: "no-store" });
      if (response.ok) {
        const body = await response.json();
        if (body.state === "pending" && body.requestId) {
          lastRequestId = body.requestId;
          const claimed = await claimRequest(body.requestId);
          if (claimed) {
            startOverlay({ requestId: body.requestId });
            return;
          }
        }
      }
    } catch {
      // No waiting CLI request; start a standalone clipboard capture.
    }
    startOverlay({});
  }

  globalThis.chrome?.runtime?.onMessage?.addListener((message) => {
    if (message?.type === "context-capture:start-manual") {
      startPendingOrManual();
    }
  });

  window.__contextCaptureStart = startOverlay;
  window.__contextCaptureStartPendingOrManual = startPendingOrManual;

  pollTimer = window.setInterval(poll, POLL_INTERVAL_MS);
  window.addEventListener("beforeunload", () => window.clearInterval(pollTimer));
})();
