# Context Capture

Context Capture is a Chrome extension that lets you drag-select part of the current page and copy useful page context as Markdown.

It captures:

- Page URL and title
- Visible text inside the selected area
- Nearby headings
- Links and image alt text
- A compact DOM summary

The extension does not require a terminal command, native app, browser automation setting, or local server. After capture, paste the copied Markdown into any tool you use.

## Install For Local Testing

```bash
git clone https://github.com/moonkey48/this-is-it.git
cd this-is-it
npm run icons
npm test
```

Then load the extension in Chrome:

1. Open `chrome://extensions`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select this repo's `extension/` folder
5. Pin `Context Capture` from the Chrome toolbar puzzle menu

## Use

1. Open the page you want to capture.
2. Click the `Context Capture` toolbar icon, or press `Alt+Shift+C`.
3. Drag over the page area you want.
4. Release the mouse.
5. Paste the copied Markdown wherever you need it.

Unsupported pages include `chrome://`, `chrome-extension://`, `about:`, `edge://`, and DevTools pages because Chrome blocks extension injection there.

## Prepare A Chrome Web Store Package

```bash
npm run package:chrome
```

This validates the extension and creates:

```text
dist/context-capture-0.2.0.zip
```

Upload that ZIP in the Chrome Web Store Developer Dashboard.

## Store Listing Draft

Store copy, permission justification, privacy notes, and reviewer test instructions are in:

```text
store/listing.md
PRIVACY.md
```

## Development

Useful files:

| Purpose | File |
| --- | --- |
| Chrome manifest and permissions | `extension/manifest.json` |
| Toolbar button and keyboard shortcut | `extension/background.js` |
| Selection UI and Markdown capture | `extension/content-script.js` |
| PNG icon generation | `scripts/generate-icons.mjs` |
| Release validation | `scripts/validate-extension.mjs` |
| Web Store ZIP packaging | `scripts/package-extension.mjs` |

Validation:

```bash
npm test
node --check extension/background.js
node --check extension/content-script.js
node --check scripts/validate-extension.mjs
node --check scripts/package-extension.mjs
```
