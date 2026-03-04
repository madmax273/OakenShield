document.addEventListener('DOMContentLoaded', async () => {
    // Load state
    const isFocusEnabled = await StateManager.getFocusStatus();
    document.getElementById('focusToggle').checked = isFocusEnabled;

    // Load stats
    const stats = await StatsManager.getStats();
    document.getElementById('statBlocked').innerText = stats.blocked || 0;
    document.getElementById('statResisted').innerText = stats.resisted || 0;
    document.getElementById('statContinued').innerText = stats.continued || 0;

    // Toggle logic
    document.getElementById('focusToggle').addEventListener('change', async (e) => {
        await StateManager.setFocusStatus(e.target.checked);
    });

    // Option page redirect
    document.getElementById('manageBtn').addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options/options.html'));
        }
    });
});
