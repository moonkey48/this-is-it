# Context Capture Chrome Store Prep

## Plan

- [x] Identify CLI, Claude, native messaging, and agent integration dependencies.
- [x] Convert the extension to Chrome-only clipboard capture.
- [x] Remove Claude/Codex skill, CLI, native host, and installer surfaces.
- [x] Add Chrome Web Store validation, packaging, icons, and listing notes.
- [x] Verify the release package and update review notes.

## Review

- `npm test` passed and now runs `npm run validate:chrome`.
- `node --check` passed for `extension/background.js`, `extension/content-script.js`, `scripts/validate-extension.mjs`, and `scripts/package-extension.mjs`.
- `npm run package:chrome` passed and created `dist/context-capture-0.2.0.zip`.
- `unzip -l dist/context-capture-0.2.0.zip` confirmed the upload package contains only `manifest.json`, `background.js`, `content-script.js`, and PNG icons.
