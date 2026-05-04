const Dashboard = {
  sessions: {},
  labels: {},
  domainIcons: {},
  threshold: 30,
  today: StorageManager.getTodayDate(),

  escapeHtml: function(value) {
    return String(value || '').replace(/[&<>"']/g, function(char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  },

  getSafeImageUrl: function(value) {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch (e) {
      return '';
    }
  },

  init: async function() {
    await this.loadData();
    this.render();
    this.attachListeners();
  },

  loadData: async function() {
    const data = await StorageManager.get({
      dailySessions: {},
      domainLabels: {},
      timeThreshold: 30,
      theme: 'light',
      domainIcons: {}
    });
    this.sessions = data.dailySessions[this.today] || {};
    this.labels = data.domainLabels;
    this.threshold = data.timeThreshold;
    this.domainIcons = data.domainIcons;

    this.applyTheme(data.theme);

    // Set initial threshold input
    const threshInput = document.getElementById('threshold-input');
    if (threshInput) threshInput.value = this.threshold;
    
    // Set date text (e.g., "April 3, 2026")
    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const dateEl = document.getElementById('current-date');
    if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-US', dateOptions);
  },

  render: function() {
    const container = document.getElementById('sessions-container');
    container.innerHTML = '';

    // Grouping logic for tree structure
    const groupedSessions = {};
    Object.entries(this.sessions).forEach(([domain, minutes]) => {
        const parts = domain.split('/');
        const parent = parts[0];
        const child = parts.length > 1 ? parts.slice(1).join('/') : null;

        if (!groupedSessions[parent]) {
            groupedSessions[parent] = { total: 0, children: [] };
        }
        groupedSessions[parent].total += minutes;
        if (child) {
            groupedSessions[parent].children.push({ name: child, minutes: minutes, fullDomain: domain });
        }
    });

    const entries = Object.entries(groupedSessions).sort((a, b) => b[1].total - a[1].total);

    if (entries.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No activity tracked yet exceeding your ${this.threshold}m threshold.</p></div>`;
      this.updateStats(0, 0, 0, 0, 0);
      this.updateSovereignBadge(0, 0);
      return;
    }

    let totalMinutes = 0;
    let productiveMinutes = 0;
    let wasteMinutes = 0;
    let llmMinutes = 0;
    let neutralMinutes = 0;

    // Granular stats calculation
    Object.entries(this.sessions).forEach(([domain, minutes]) => {
      totalMinutes += minutes;
      const parts = domain.split('/');
      const parent = parts[0];
      
      // Label priority: explicit domain label > parent domain label > default 'neutral'
      let dLabel = this.labels[domain];
      if (!dLabel && parts.length > 1) {
          dLabel = this.labels[parent];
      }
      if (!dLabel) dLabel = 'neutral';

      if (dLabel === 'productive') productiveMinutes += minutes;
      else if (dLabel === 'waste') wasteMinutes += minutes;
      else if (dLabel === 'ai') llmMinutes += minutes;
      else neutralMinutes += minutes;
    });

    entries.forEach(([parent, data]) => {
      // Resultant Label Logic: Parent explicit label > Majority child label > Neutral
      let resultantLabel = this.labels[parent];
      
      if (!resultantLabel && data.children.length > 0) {
          const weights = { productive: 0, waste: 0, ai: 0, neutral: 0 };
          data.children.forEach(child => {
              const cLabel = this.labels[child.fullDomain] || 'neutral';
              weights[cLabel] += child.minutes;
          });

          // Also account for the parent's base minutes (if any)
          // In our grouping, 'parent' might have been a domain itself with time
          const parentBaseMinutes = this.sessions[parent] || 0;
          weights['neutral'] += parentBaseMinutes;

          let maxMins = -1;
          for (const [cat, mins] of Object.entries(weights)) {
              if (mins > maxMins) {
                  maxMins = mins;
                  resultantLabel = cat;
              }
          }
      }

      if (!resultantLabel) resultantLabel = 'neutral';

      const groupItem = document.createElement('div');
      groupItem.className = `session-group ${resultantLabel}`;
      
      const safeParent = this.escapeHtml(parent);
      const parentInitial = this.escapeHtml((parent[0] || '?').toUpperCase());
      const iconUrl = this.getSafeImageUrl(this.domainIcons[parent]);
      const iconHtml = iconUrl ? `<img src="${this.escapeHtml(iconUrl)}" class="site-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : '';
      const fallbackIconHtml = `<div class="site-icon" style="${iconUrl ? 'display:none' : 'display:flex'}">${parentInitial}</div>`;

      const hasChildren = data.children.length > 0;
      const chevronHtml = hasChildren ? `
        <button class="expand-btn" title="Toggle Sub-tabs">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>
        </button>
      ` : '';

      let childrenHtml = '';
      if (hasChildren) {
          childrenHtml = `<div class="children-list collapsed">
            ${data.children.sort((a,b) => b.minutes - a.minutes).map(child => {
                const cLabel = this.labels[child.fullDomain] || 'neutral';
                const safeChildName = this.escapeHtml(child.name);
                const safeChildDomain = this.escapeHtml(child.fullDomain);
                return `
                <div class="child-item">
                    <div class="child-name" title="${safeChildName}">${safeChildName}</div>
                    <div class="child-right">
                        <div class="child-time">${this.formatTime(child.minutes)}</div>
                        <div class="label-controls mini">
                            <button class="label-btn mini ${cLabel === 'productive' ? 'active productive' : ''}" data-domain="${safeChildDomain}" data-type="productive" title="Productive">P</button>
                            <button class="label-btn mini ${cLabel === 'ai' ? 'active ai' : ''}" data-domain="${safeChildDomain}" data-type="ai" title="AI Interaction">A</button>
                            <button class="label-btn mini ${cLabel === 'neutral' ? 'active neutral' : ''}" data-domain="${safeChildDomain}" data-type="neutral" title="Neutral">N</button>
                            <button class="label-btn mini ${cLabel === 'waste' ? 'active waste' : ''}" data-domain="${safeChildDomain}" data-type="waste" title="Waste">W</button>
                        </div>
                    </div>
                </div>
            `}).join('')}
          </div>`;
      }

      groupItem.innerHTML = `
        <div class="session-item main-item ${hasChildren ? 'has-children' : ''}">
          <div class="main-left">
            ${chevronHtml}
            <div class="icon-container">
              ${iconHtml}
              ${fallbackIconHtml}
            </div>
            <div class="site-info">
              <h4>${safeParent}</h4>
            </div>
          </div>
          <div class="main-right">
            <div class="session-time">${this.formatTime(data.total)}</div>
            <div class="label-controls">
              <button class="label-btn ${resultantLabel === 'productive' ? 'active productive' : ''}" data-domain="${safeParent}" data-type="productive" title="Productive">P</button>
              <button class="label-btn ${resultantLabel === 'ai' ? 'active ai' : ''}" data-domain="${safeParent}" data-type="ai" title="AI Interaction">A</button>
              <button class="label-btn ${resultantLabel === 'neutral' ? 'active neutral' : ''}" data-domain="${safeParent}" data-type="neutral" title="Neutral">N</button>
              <button class="label-btn ${resultantLabel === 'waste' ? 'active waste' : ''}" data-domain="${safeParent}" data-type="waste" title="Waste">W</button>
            </div>
          </div>
        </div>
        ${childrenHtml}
      `;

      // Attach toggle listener if has children
      if (hasChildren) {
          const mainItem = groupItem.querySelector('.main-item');
          
          // Restore expanded state
          if (this.expandedGroups && this.expandedGroups.has(parent)) {
              groupItem.querySelector('.children-list').classList.remove('collapsed');
              groupItem.querySelector('.expand-btn').style.transform = 'rotate(180deg)';
          }

          mainItem.addEventListener('click', (e) => {
              if (e.target.closest('.label-btn') || e.target.closest('.label-controls')) return;
              
              const list = groupItem.querySelector('.children-list');
              const btn = groupItem.querySelector('.expand-btn');
              const isCollapsed = list.classList.toggle('collapsed');
              btn.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
              
              if (!this.expandedGroups) this.expandedGroups = new Set();
              if (isCollapsed) {
                  this.expandedGroups.delete(parent);
              } else {
                  this.expandedGroups.add(parent);
              }
          });
      }

      container.appendChild(groupItem);
    });

    this.updateStats(totalMinutes, productiveMinutes, wasteMinutes, llmMinutes, neutralMinutes);
    this.updateSovereignBadge(productiveMinutes, llmMinutes);
  },

  updateStats: function(total, productive, waste, llm, neutral) {
    const totalEl = document.getElementById('total-time');
    const prodEl = document.getElementById('productive-time');
    const wasteEl = document.getElementById('waste-time');
    const neutralEl = document.getElementById('neutral-time');
    if (totalEl) totalEl.innerText = this.formatTime(total);
    if (prodEl) prodEl.innerText = this.formatTime(productive);
    if (wasteEl) wasteEl.innerText = this.formatTime(waste);
    if (neutralEl) neutralEl.innerText = this.formatTime(neutral);
  },

  updateSovereignBadge: function(prod, llm) {
    const badge = document.getElementById('sovereign-badge');
    if (!badge) return;

    const total = prod + llm;
    const agency = total > 0 ? (prod / total) * 100 : 100;

    if (agency >= 80) {
        badge.innerText = "Sovereign Mind";
        badge.style.background = "linear-gradient(135deg, #10b981, #3b82f6)";
    } else if (agency >= 50) {
        badge.innerText = "Hybrid Focus";
        badge.style.background = "linear-gradient(135deg, #f59e0b, #6366f1)";
    } else {
        badge.innerText = "Cognitive Drift";
        badge.style.background = "linear-gradient(135deg, #ef4444, #8b5cf6)";
    }
  },

  formatTime: function(minutes) {
    if (isNaN(minutes) || minutes === undefined || minutes === null) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  },

  attachListeners: function() {
    // Back button listener
    const backBtn = document.getElementById('dashboard-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {

            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        });
    }

    // Threshold listener
    const llmLink = document.getElementById('llm-link-card');
    if (llmLink) {
        llmLink.addEventListener('click', () => {
            window.location.href = 'llm-tracker.html';
        });
    }
    const threshInput = document.getElementById('threshold-input');
    if (threshInput) {
        threshInput.addEventListener('change', async (e) => {
          const val = parseInt(e.target.value);
          if (isNaN(val) || val < 1) return;
          this.threshold = val;
          await StorageManager.set({ timeThreshold: val });
          this.render();
        });
    }

    // Label click listener
    const container = document.getElementById('sessions-container');
    if (container) {
        container.addEventListener('click', async (e) => {
          if (e.target.classList.contains('label-btn')) {
            const domain = e.target.getAttribute('data-domain');
            const type = e.target.getAttribute('data-type');
            
            // Toggle label
            if (this.labels[domain] === type) {
              delete this.labels[domain];
            } else {
              this.labels[domain] = type;
            }

            await StorageManager.set({ domainLabels: this.labels });
            this.render();
          }
        });
    }

    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', async () => {
          const isDark = document.body.classList.toggle('dark-theme');
          const theme = isDark ? 'dark' : 'light';
          await StateManager.setTheme(theme);
        });
    }

    // Reset today's stats listener
    const resetBtn = document.getElementById('reset-today-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to clear ALL activity tracked for today? This cannot be undone.")) {
                const data = await StorageManager.get({ dailySessions: {} });
                const dailySessions = data.dailySessions;
                
                // Clear today's entry
                if (dailySessions[this.today]) {
                    dailySessions[this.today] = {};
                }
                
                // Also reset the stats from StatsManager (blocked, resisted, etc)
                const statsData = await StorageManager.get({ stats: {} });
                if (statsData.stats) {
                    statsData.stats.blocked = 0;
                    statsData.stats.resisted = 0;
                    statsData.stats.continued = 0;
                }

                await StorageManager.set({ 
                    dailySessions: dailySessions,
                    stats: statsData.stats
                });

                // Update local state and re-render
                this.sessions = {};
                this.render();
                
                // Show feedback
                resetBtn.innerText = "Cleared!";
                resetBtn.style.background = "#10b981";
                resetBtn.style.color = "white";
                setTimeout(() => {
                    resetBtn.innerText = "Reset Today's Stats";
                    resetBtn.style.background = "rgba(239, 68, 68, 0.1)";
                    resetBtn.style.color = "#ef4444";
                }, 2000);
            }
        });
    }

    // Storage change listener
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.theme) {
          this.applyTheme(changes.theme.newValue);
        }
        if (changes.dailySessions || changes.domainLabels || changes.domainIcons) {
          this.loadData().then(() => this.render());
        }
      }
    });
  },

  applyTheme: function(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
};

Dashboard.init();
