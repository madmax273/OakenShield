importScripts('../utils/storage.js', '../core/stateManager.js', '../core/statsManager.js', '../core/timeTracker.js');


let cachedKeywords = [];
let isFocusEnabled = true;
let cacheReady = initCache();

// Initialize cache
async function initCache() {
  cachedKeywords = await StateManager.getKeywords();
  isFocusEnabled = await StateManager.getFocusStatus();
}

// Ensure stats reset check on startup
StatsManager.getStats();

// Listen to storage changes to update cache
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.keywords) cachedKeywords = changes.keywords.newValue;
    if (changes.focusEnabled) isFocusEnabled = changes.focusEnabled.newValue;
  }
});

// Detect URL changes for SPA
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.tabs.sendMessage(tabId, { type: "URL_CHANGED", url: changeInfo.url }).catch(() => {});
    }
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "KEYWORD_DETECTED") {
    if (isFocusEnabled) {
      StatsManager.increment('blocked');
      chrome.tabs.sendMessage(sender.tab.id, { 
        type: "INJECT_MODAL", 
        payload: { keyword: message.payload.keyword }
      }).catch(() => {});
    }
  } else if (message.type === "GET_STATE") {
    cacheReady.then(() => {
      sendResponse({ keywords: cachedKeywords, focusEnabled: isFocusEnabled });
    });
  } else if (message.type === "OPEN_DASHBOARD") {
    const createProps = { url: chrome.runtime.getURL("dashboard/dashboard.html") };
    if (sender && sender.tab) {
      createProps.openerTabId = sender.tab.id;
      createProps.index = sender.tab.index + 1;
    }
    chrome.tabs.create(createProps);
  } else if (message.type === "RESISTED") {
    StatsManager.increment('resisted');
  } else if (message.type === "CONTINUED") {
    StatsManager.increment('continued');
  }
  return true; // async response if needed
});

TimeTracker.init();
