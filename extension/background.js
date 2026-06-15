async function startManualCapture(tab) {
  if (!tab?.id || !tab.url || /^(chrome|edge|about):/i.test(tab.url)) return;

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content-style.css"],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content-script.js"],
    });
  } catch {
    // Content scripts may already be loaded. Sending the message is still safe.
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "context-capture:start-manual" });
  } catch {
    // Unsupported pages cannot receive content-script messages.
  }
}

chrome.action.onClicked.addListener((tab) => {
  startManualCapture(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-context") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await startManualCapture(tab);
});
