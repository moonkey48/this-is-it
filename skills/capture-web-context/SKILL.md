---
name: capture-web-context
description: Capture a selected region of the active Chrome page as URL, page title, visible text, links, image alt text, and compact DOM context for Codex or Claude Code. Use when the user asks to select part of a browser, Chrome page, web page, or on-screen web content and provide that content as context.
allowed-tools: Bash
---

# Capture Web Context

Use the local `context-capture` CLI to ask the user to select part of the active Chrome page. The command triggers the active Chrome tab on macOS, prints Markdown context to stdout, and also copies it to the clipboard.

## Workflow

1. Run:

```bash
context-capture request --timeout 60
```

2. If `context-capture` is not on `PATH`, ask the user to run `scripts/install.sh` from the context-capture project, or run the project-local CLI with Node when the path is known:

```bash
node /path/to/context-capture/bin/context-capture.js request --timeout 60
```

3. Tell the user to drag over the target Chrome page area if the overlay appears. If macOS asks for Automation permission to control Google Chrome, tell the user to allow it.

4. If no overlay appears, tell the user to reload the page or click Chrome toolbar puzzle icon > Context Capture while the command is still waiting. If Context Capture is not listed there, the extension is not loaded in the active Chrome profile.

5. Treat the command stdout as the captured source context. It includes URL, title, selected text, links, image alt text, and a DOM summary.

## Commands

- `context-capture request --timeout 60`: wait for a Chrome selection, copy Markdown to clipboard, and print Markdown.
- `context-capture latest`: print the latest capture from `/tmp/context-capture/latest.md`.
- `context-capture doctor`: check clipboard support, port availability, extension source path, and installed agent files.

## Constraints

- Support normal Chrome web pages only.
- Do not promise screenshots or OCR; v1 captures text and DOM context.
- If the command times out or Chrome blocks content scripts on the current page, report that clearly and suggest using a normal `https://` page.
