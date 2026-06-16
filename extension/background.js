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

function nativeHostName() {
  return "com.moonkey48.context_capture";
}

chrome.action.onClicked.addListener((tab) => {
  startManualCapture(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-context") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await startManualCapture(tab);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "context-capture:save") return false;

  chrome.runtime.sendNativeMessage(
    nativeHostName(),
    { type: "capture-result", payload: message.payload },
    async (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        sendResponse({
          ok: false,
          error: chrome.runtime.lastError?.message || response?.error || "native-host-failed",
        });
        return;
      }

      try {
        await navigator.clipboard.writeText(response.markdown);
        sendResponse({ ok: true, copied: true });
      } catch {
        sendResponse({ ok: true, copied: false });
      }
    },
  );
  return true;
});
