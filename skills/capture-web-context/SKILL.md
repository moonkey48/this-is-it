---
name: capture-web-context
description: Capture a selected region of the active Chrome page as URL, page title, visible text, links, image alt text, and compact DOM context for Codex or Claude Code. Use when the user asks to select part of a browser, Chrome page, web page, or on-screen web content and provide that content as context.
allowed-tools: Bash
---

# Capture Web Context

Use the Context Capture Chrome extension for a Claude/Codex-compatible workflow. The user clicks the pinned C icon in Chrome, drags a page area, and the extension copies Markdown to clipboard. `context-capture latest` reads the latest saved capture when available, otherwise it reads the Context Capture result from the clipboard.

## Workflow

1. If the user has not captured yet, ask them to click the pinned Context Capture C icon in Chrome and drag the page area.

2. Read the latest capture:

```bash
context-capture latest
```

3. If `context-capture` is not on `PATH`, ask the user to run `scripts/install.sh` from the context-capture project, or run the project-local CLI with Node when the path is known:

```bash
node /path/to/context-capture/bin/context-capture.js latest
```

4. Treat the command stdout as the captured source context. It includes URL, title, selected text, links, image alt text, and a DOM summary.

## Commands

- `context-capture capture`: show instructions for capturing with the Chrome extension.
- `context-capture latest`: print the latest capture from `/tmp/context-capture/latest.md`.
- `context-capture doctor`: check clipboard support, port availability, extension source path, and installed agent files.

## Constraints

- Support normal Chrome web pages only.
- Do not promise screenshots or OCR; v1 captures text and DOM context.
- If the command times out or Chrome blocks content scripts on the current page, report that clearly and suggest using a normal `https://` page.
