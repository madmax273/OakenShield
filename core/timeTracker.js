var TimeTracker = {
  currentSession: null,

  init: async function() {
    this.startTracking();
    this.listenToChanges();
    
    // Create alarm for periodic pulse
    chrome.alarms.create('trackerHeartbeat', { periodInMinutes: 0.5 });
  },

  handleAlarm: function(alarm) {
    if (alarm.name === 'trackerHeartbeat') {
        this.pulse();
    }
  },


  startTracking: async function() {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length > 0) {
      await this.endSession(); // Ensure any zombie sessions are recorded
      this.startSession(tabs[0]);
    }
  },


  listenToChanges: function() {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await this.endSession();
        this.startSession(tab);
      } catch(e) {}
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (tab.active && (changeInfo.url || changeInfo.title)) {
        await this.endSession();
        this.startSession(tab);
      }
    });

    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await this.endSession();
      } else {
        await this.startTracking();
      }
    });
  },

  startSession: function(tab) {
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('chrome-extension://')) return;
    const domain = this.getExtendedDomain(tab);
    
    // Think-First Intervener
    const aiDomains = ['chatgpt.com', 'gemini.google.com', 'claude.ai', 'perplexity.ai', 'mistral.ai'];
    const baseDomain = domain.split('/')[0];
    if (aiDomains.includes(baseDomain)) {
       StorageManager.get({ skipThinkFirst: false }).then(data => {
         if (!data.skipThinkFirst && tab && tab.id) {
           chrome.tabs.sendMessage(tab.id, { 
               type: "INJECT_THINK_FIRST", 
               payload: { domain: baseDomain } 
           }).catch(() => {});
         }
       });
    }

    this.currentSession = {
      domain: domain,
      iconUrl: tab.favIconUrl,
      startTime: Date.now(),
      lastPulseTime: Date.now()
    };
  },


  pulse: async function() {
    const session = this.currentSession;
    if (!session) return;
    const now = Date.now();
    const totalDuration = (now - session.startTime) / 1000 / 60;
    const threshold = await this.getThreshold();

    if (totalDuration >= threshold) {
      const deltaSincePulse = (now - session.lastPulseTime) / 1000 / 60;
      if (deltaSincePulse >= 0.5) { // Record at least 30s increments
        this.recordSession(session.domain, deltaSincePulse, session.iconUrl);
        session.lastPulseTime = now;
      }
    }
  },

  endSession: async function() {
    const session = this.currentSession;
    if (!session) return;
    this.currentSession = null; // Clear immediately to avoid race conditions
    
    const now = Date.now();
    const totalDuration = (now - session.startTime) / 1000 / 60;
    const threshold = await this.getThreshold();
    const domain = session.domain;
    
    if (totalDuration >= threshold) {
      const remainingDelta = (now - session.lastPulseTime) / 1000 / 60;
      this.recordSession(domain, remainingDelta, session.iconUrl);
    }
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
    if (isNaN(duration) || duration <= 0) return;

    const today = StorageManager.getTodayDate();
    const data = await StorageManager.get({ dailySessions: {}, lastShowDate: '', domainIcons: {} });
    const dailySessions = data.dailySessions;
    const domainIcons = data.domainIcons;
    
    // Save icon if provided and not already saved
    const baseDomain = domain.split('/')[0];
    if (iconUrl && !domainIcons[baseDomain]) {
      domainIcons[baseDomain] = iconUrl;
    }

    // Check if new day started
    if (data.lastShowDate && data.lastShowDate !== today) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    }

    if (!dailySessions[today]) dailySessions[today] = {};
    if (!dailySessions[today][domain]) dailySessions[today][domain] = 0;
    
    dailySessions[today][domain] += duration;
    
    await StorageManager.set({ 
        dailySessions: dailySessions,
        lastShowDate: today,
        domainIcons: domainIcons
    });
  }

};

// Global alarm listener for MV3 Service Worker persistence
chrome.alarms.onAlarm.addListener((alarm) => {
    TimeTracker.handleAlarm(alarm);
});
