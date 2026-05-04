var StateManager = {
  getKeywords: async function() {
    var data = await StorageManager.get({ keywords: [] });
    return data.keywords;
  },
  setKeywords: async function(keywords) {
    await StorageManager.set({ keywords: keywords });
  },
  addKeyword: async function(keyword) {
    var keywords = await this.getKeywords();
    if (!keywords.includes(keyword)) {
        keywords.push(keyword);
        await this.setKeywords(keywords);
    }
  },
  removeKeyword: async function(keyword) {
    var keywords = await this.getKeywords();
    var newKeywords = keywords.filter(function(k) { return k !== keyword; });
    await this.setKeywords(newKeywords);
  },
  getFocusStatus: async function() {
    var data = await StorageManager.get({ focusEnabled: true });
    return data.focusEnabled;
  },
  setFocusStatus: async function(focusEnabled) {
    await StorageManager.set({ focusEnabled: focusEnabled });
  },
  getTheme: async function() {
    var data = await StorageManager.get({ theme: 'light' });
    return data.theme;
  },
  setTheme: async function(theme) {
    await StorageManager.set({ theme: theme });
  },
  getFloatingIconStatus: async function() {
    var data = await StorageManager.get({ floatingIconEnabled: true });
    return data.floatingIconEnabled;
  },
  setFloatingIconStatus: async function(floatingIconEnabled) {
    await StorageManager.set({ floatingIconEnabled: floatingIconEnabled });
  }
};
