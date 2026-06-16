# Chrome Web Store Listing

## Name

Context Capture

## Summary

Select part of a page and copy URL, text, links, images, and DOM context as Markdown.

## Description

Context Capture helps you give web page context to AI tools, notes, bug reports, and research workflows without taking screenshots or copying a whole page.

Click the toolbar icon, drag over the page area you care about, and the extension copies a compact Markdown summary to your clipboard. The Markdown includes the page URL, title, selected visible text, nearby headings, relevant links, image alt text, and a small DOM summary.

The extension runs only when you click it or use its keyboard shortcut. It does not use a local server, native app, remote API, analytics, or account login.

## Single Purpose

Let users select a visible region of the active Chrome page and copy structured Markdown context from that region.

## Permission Justification

- `activeTab`: Required to read the active page only after the user clicks the extension or presses the shortcut.
- `scripting`: Required to inject the drag-selection overlay and page context collector into the active tab.
- `clipboardWrite`: Required to copy the captured Markdown result to the clipboard.

The extension does not request persistent host permissions.

## Privacy Disclosure

Context Capture processes selected page content locally in Chrome and copies the result to the clipboard. It does not collect, transmit, sell, or share user data.

## Reviewer Test Instructions

1. Install the uploaded extension package.
2. Open any normal webpage, such as `https://example.com`.
3. Click the Context Capture toolbar icon.
4. Drag over a visible area of the page.
5. Confirm a "Captured to clipboard." message appears.
6. Paste into a text editor and confirm Markdown containing the page URL, title, selected text, and DOM summary appears.

Chrome internal pages such as `chrome://extensions` are intentionally unsupported because Chrome blocks extension injection there.
