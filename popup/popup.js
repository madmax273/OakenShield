document.addEventListener('DOMContentLoaded', async () => {
    // Load floating icon state
    const isFloatingIconEnabled = await StateManager.getFloatingIconStatus();
    document.getElementById('floatingIconToggle').checked = isFloatingIconEnabled;

    // Load theme
    const theme = await StateManager.getTheme();
    const themeBtn = document.getElementById('themeToggle');
    const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
    const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeBtn.innerHTML = sunIcon;
    } else {
        themeBtn.innerHTML = moonIcon;
    }

    themeBtn.addEventListener('click', async () => {
        const isDark = document.body.classList.toggle('dark-theme');
        await StateManager.setTheme(isDark ? 'dark' : 'light');
        themeBtn.innerHTML = isDark ? sunIcon : moonIcon;
    });

    // Load stats
    const stats = await StatsManager.getStats();
    document.getElementById('statBlocked').innerText = stats.blocked || 0;
    document.getElementById('statResisted').innerText = stats.resisted || 0;
    document.getElementById('statContinued').innerText = stats.continued || 0;

    // Toggle logic
    document.getElementById('floatingIconToggle').addEventListener('change', async (e) => {
        await StateManager.setFloatingIconStatus(e.target.checked);
        // Notify all tabs to update floating icon visibility
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                type: 'FLOATING_ICON_TOGGLE', 
                enabled: e.target.checked 
            }).catch(() => {});
        });
    });

    
    // Option page redirect
    document.getElementById('manageBtn').addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });

    document.getElementById('dashBtn').addEventListener('click', () => {
        window.open(chrome.runtime.getURL('dashboard/dashboard.html'));
    });

});
