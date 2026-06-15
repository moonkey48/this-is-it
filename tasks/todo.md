# Context Capture Implementation

## Plan

- [x] Create project scaffold for a Chrome-first context capture tool.
- [x] Implement a Node CLI/server that queues capture requests, waits for Chrome, copies Markdown to clipboard, and prints stdout.
- [x] Implement a Chrome extension that opens a selection overlay and extracts URL, title, text, and compact DOM context.
- [x] Add Codex and Claude Code integrations for the shared CLI.
- [x] Add installation, doctor, tests, and local fixtures.
- [x] Verify formatting, server behavior, and integration files.

## Review

- `npm test` passed with 4 tests after running outside the sandbox so the local HTTP server could bind to `127.0.0.1`.
- `context-capture doctor` passed and confirmed the CLI, port, extension source, Codex skill, Claude skill, and Claude command.
- `quick_validate.py skills/capture-web-context` passed.
- `node --check` passed for the CLI and extension scripts.
- Chrome still requires the manual `Load unpacked` step for `extension/`.
