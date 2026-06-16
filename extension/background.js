function canCaptureUrl(url) {
  return Boolean(url) && !/^(chrome|chrome-extension|edge|about|devtools):/i.test(url);
}

async function startCapture(tab) {
  if (!tab?.id || !canCaptureUrl(tab.url)) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content-script.js"],
  });

  await chrome.tabs.sendMessage(tab.id, { type: "context-capture:start" });
}

chrome.action.onClicked.addListener((tab) => {
  startCapture(tab).catch(() => {});
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "start-capture") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await startCapture(tab).catch(() => {});
});
