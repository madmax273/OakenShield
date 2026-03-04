document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keywordInput');
    const keywordList = document.getElementById('keywordList');
    const addKeywordBtn = document.getElementById('addKeywordBtn');

    const themeBtn = document.getElementById('themeToggle');
    const closeBtn = document.getElementById('closeBtn');

    // Handle close button
    closeBtn.addEventListener('click', () => {
        window.close();
    });

    // Load theme
    const theme = await StateManager.getTheme();
    const sunIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
    const moonIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

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

    async function renderKeywords() {
        const keywords = await StateManager.getKeywords();
        keywordList.innerHTML = '';
        if (keywords.length === 0) {
            keywordList.innerHTML = '<li class="empty-state">No keywords added yet. Start protecting your focus!</li>';
            return;
        }

        keywords.forEach(kw => {
            const li = document.createElement('li');
            li.className = 'keyword-item';
            li.innerHTML = `
                <span class="keyword-text">${kw}</span>
                <button class="remove-btn" data-keyword="${kw}">&times;</button>
            `;
            keywordList.appendChild(li);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const kwToRemove = e.target.getAttribute('data-keyword');
                await StateManager.removeKeyword(kwToRemove);
                renderKeywords();
            });
        });
    }

    async function addKeyword() {
        const val = keywordInput.value.trim().toLowerCase();
        if (val) {
            await StateManager.addKeyword(val);
            keywordInput.value = '';
            renderKeywords();
        }
    }

    addKeywordBtn.addEventListener('click', addKeyword);
    keywordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addKeyword();
    });

    renderKeywords();
});
