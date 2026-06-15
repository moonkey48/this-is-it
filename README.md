# Context Capture

Capture a selected region of the active Chrome page as Markdown context for Codex or Claude Code.

## Install

```bash
scripts/install.sh
```

Then load the Chrome extension once:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `extension/` from this repo

## Use

From Codex or a terminal:

```bash
context-capture request --timeout 60
```

From Claude Code:

```text
/capture-context --timeout 60
```

When the command is waiting, drag over the target area in Chrome. The tool prints Markdown to stdout and copies the same content to the clipboard.

## Checks

```bash
context-capture doctor
npm test
```

V1 supports normal Chrome web pages and captures URL, title, selected visible text, links, image alt text, and compact DOM context. It does not capture screenshots or OCR arbitrary desktop apps.
