(function() {
  let detectorKeywords = [];
  let focusEnabled = true;

  // Get initial state
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response) {
      detectorKeywords = response.keywords || [];
      focusEnabled = response.focusEnabled !== false;
    }
    checkUrl(window.location.href);
  });

  // Listen to storage changes to remain synced instantly
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.keywords) detectorKeywords = changes.keywords.newValue;
      if (changes.focusEnabled) focusEnabled = changes.focusEnabled.newValue;
    }
  });

  function checkText(text, context) {
    if (!focusEnabled) return;
    const match = KeywordMatcher.checkMatch(text, detectorKeywords);
    if (match) {
        chrome.runtime.sendMessage({
            type: "KEYWORD_DETECTED",
            payload: { keyword: match, url: window.location.href, context: context }
        });
    }
  }
  
  function checkUrl(url) {
    let decoded = url;
    try {
        decoded = decodeURIComponent(url);
    } catch(e) {}
    checkText(decoded, 'url');
  }

  // A) URL Monitoring (handled by message from background)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "URL_CHANGED") {
        checkUrl(message.url);
    }
  });

  // B) Form Submission Monitoring
  document.addEventListener("submit", (e) => {
      let text = "";
      const inputs = e.target.querySelectorAll("input, textarea");
      inputs.forEach(i => text += i.value + " ");
      if (text.trim()) checkText(text, 'form_submit');
  }, true);

  // C) Input Field Monitoring
  document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
          const tagName = e.target.tagName;
          if (tagName === "INPUT" || tagName === "TEXTAREA" || e.target.isContentEditable) {
              const text = e.target.value || e.target.innerText;
              if (text) checkText(text, 'input_enter');
          }
      }
  }, true);

})();
