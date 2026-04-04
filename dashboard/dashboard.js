const Dashboard = {
  sessions: {},
  labels: {},
  domainIcons: {},
  threshold: 30,
  today: new Date().toISOString().split('T')[0],

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
      this.updateStats(0, 0, 0);
      return;
    }

    let totalMinutes = 0;
    let productiveMinutes = 0;
    let wasteMinutes = 0;
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
      else neutralMinutes += minutes;
    });

    entries.forEach(([parent, data]) => {
      const label = this.labels[parent] || 'neutral';

      const groupItem = document.createElement('div');
      groupItem.className = `session-group ${label}`;
      
      const iconUrl = this.domainIcons[parent];
      const iconHtml = iconUrl ? `<img src="${iconUrl}" class="site-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : '';
      const fallbackIconHtml = `<div class="site-icon" style="${iconUrl ? 'display:none' : 'display:flex'}">${parent[0].toUpperCase()}</div>`;

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
                return `
                <div class="child-item">
                    <div class="child-name" title="${child.name}">${child.name}</div>
                    <div class="child-right">
                        <div class="child-time">${this.formatTime(child.minutes)}</div>
                        <div class="label-controls mini">
                            <button class="label-btn mini ${cLabel === 'productive' ? 'active productive' : ''}" data-domain="${child.fullDomain}" data-type="productive" title="Productive">P</button>
                            <button class="label-btn mini ${cLabel === 'neutral' ? 'active neutral' : ''}" data-domain="${child.fullDomain}" data-type="neutral" title="Neutral">N</button>
                            <button class="label-btn mini ${cLabel === 'waste' ? 'active waste' : ''}" data-domain="${child.fullDomain}" data-type="waste" title="Waste">W</button>
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
              <h4>${parent}</h4>
            </div>
          </div>
          <div class="main-right">
            <div class="session-time">${this.formatTime(data.total)}</div>
            <div class="label-controls">
              <button class="label-btn ${label === 'productive' ? 'active productive' : ''}" data-domain="${parent}" data-type="productive" title="Productive">P</button>
              <button class="label-btn ${label === 'neutral' ? 'active neutral' : ''}" data-domain="${parent}" data-type="neutral" title="Neutral">N</button>
              <button class="label-btn ${label === 'waste' ? 'active waste' : ''}" data-domain="${parent}" data-type="waste" title="Waste">W</button>
            </div>
          </div>
        </div>
        ${childrenHtml}
      `;

      // Attach toggle listener if has children
      if (hasChildren) {
          const mainItem = groupItem.querySelector('.main-item');
          mainItem.addEventListener('click', (e) => {
              // Don't toggle if clicking a label button
              if (e.target.closest('.label-btn') || e.target.closest('.label-controls')) return;
              
              const list = groupItem.querySelector('.children-list');
              const btn = groupItem.querySelector('.expand-btn');
              const isCollapsed = list.classList.toggle('collapsed');
              btn.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
          });
      }

      container.appendChild(groupItem);
    });

    this.updateStats(totalMinutes, productiveMinutes, wasteMinutes, neutralMinutes);
  },

  updateStats: function(total, productive, waste, neutral) {
    const totalEl = document.getElementById('total-time');
    const prodEl = document.getElementById('productive-time');
    const wasteEl = document.getElementById('waste-time');
    const neutralEl = document.getElementById('neutral-time');
    if (totalEl) totalEl.innerText = this.formatTime(total);
    if (prodEl) prodEl.innerText = this.formatTime(productive);
    if (wasteEl) wasteEl.innerText = this.formatTime(waste);
    if (neutralEl) neutralEl.innerText = this.formatTime(neutral);
  },

  formatTime: function(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  },

  attachListeners: function() {
    // Threshold listener
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

    // Storage change listener
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
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
