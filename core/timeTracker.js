var TimeTracker = {
  currentSession: null,

  init: async function() {
    this.startTracking();
    this.listenToChanges();
    // Heartbeat to check for long-running sessions
    setInterval(() => this.pulse(), 30000); // Check every 30 seconds
  },


  startTracking: async function() {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length > 0) {
      this.startSession(tabs[0]);
    }
  },


  listenToChanges: function() {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        this.endSession();
        this.startSession(tab);
      } catch(e) {}
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tab.active && (changeInfo.url || changeInfo.title)) {
        this.endSession();
        this.startSession(tab);
      }
    });

    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        this.endSession();
      } else {
        this.startTracking();
      }
    });
  },

  startSession: function(tab) {
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('chrome-extension://')) return;
    const domain = this.getExtendedDomain(tab);
    this.currentSession = {
      domain: domain,
      iconUrl: tab.favIconUrl,
      startTime: Date.now(),
      lastPulseTime: Date.now()
    };
  },


  pulse: async function() {
    if (!this.currentSession) return;
    const now = Date.now();
    const totalDuration = (now - this.currentSession.startTime) / 1000 / 60;
    const threshold = await this.getThreshold();

    if (totalDuration >= threshold) {
      const deltaSincePulse = (now - this.currentSession.lastPulseTime) / 1000 / 60;
      if (deltaSincePulse >= 0.5) { // Record at least 30s increments
        this.recordSession(this.currentSession.domain, deltaSincePulse, this.currentSession.iconUrl);
        this.currentSession.lastPulseTime = now;
      }
    }
  },

  endSession: async function() {
    if (!this.currentSession) return;
    const now = Date.now();
    const totalDuration = (now - this.currentSession.startTime) / 1000 / 60;
    const threshold = await this.getThreshold();
    const domain = this.currentSession.domain;
    
    if (totalDuration >= threshold) {
      const remainingDelta = (now - this.currentSession.lastPulseTime) / 1000 / 60;
      this.recordSession(domain, remainingDelta, this.currentSession.iconUrl);
    }
    this.currentSession = null;
  },


  getExtendedDomain: function(tab) {
    try {
      const urlObj = new URL(tab.url);
      let hostname = urlObj.hostname;
      if (hostname.startsWith('www.')) hostname = hostname.slice(4);

      if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
        let title = tab.title ? tab.title : 'General';
        // Clean title
        title = title.replace(' - YouTube', '').trim();
        const lowTitle = title.toLowerCase();

        if (lowTitle.includes('bgmi')) return 'youtube.com/BGMI';
        if (lowTitle.includes('music')) return 'youtube.com/Music';
        if (lowTitle.includes('coding') || lowTitle.includes('programming') || lowTitle.includes('tutorial')) return 'youtube.com/Learning';
        
        // Search query extraction
        if (urlObj.pathname === '/results') {
           const query = urlObj.searchParams.get('search_query');
           if (query) return `youtube.com/Search: ${query}`;
        }
        
        // If it's a specific channel or something common
        if (urlObj.pathname.includes('/@')) {
           const channel = urlObj.pathname.split('/')[1];
           return `youtube.com/Channel: ${channel}`;
        }

        // If it's a watch page, return the video title
        if (urlObj.pathname === '/watch') {
           return `youtube.com/${title}`;
        }

        return 'youtube.com/General';
      }

      return hostname;
    } catch (e) {
      return tab.url;
    }
  },

  getThreshold: async function() {
    const data = await StorageManager.get({ timeThreshold: 30 }); // Default 30 min
    return data.timeThreshold;
  },

  recordSession: async function(domain, duration, iconUrl) {
    const today = new Date().toISOString().split('T')[0];
    const data = await StorageManager.get({ dailySessions: {}, lastShowDate: '', domainIcons: {} });
    const dailySessions = data.dailySessions;
    const domainIcons = data.domainIcons;
    
    // Save icon if provided and not already saved
    const baseDomain = domain.split('/')[0];
    if (iconUrl && !domainIcons[baseDomain]) {
      domainIcons[baseDomain] = iconUrl;
      await StorageManager.set({ domainIcons: domainIcons });
    }

    // Check if new day started
    if (data.lastShowDate && data.lastShowDate !== today) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    }
    await StorageManager.set({ lastShowDate: today });

    if (!dailySessions[today]) dailySessions[today] = {};
    if (!dailySessions[today][domain]) dailySessions[today][domain] = 0;
    
    dailySessions[today][domain] += duration;
    
    await StorageManager.set({ dailySessions: dailySessions });
  }

};
