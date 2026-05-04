document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keywordInput');
    const keywordList = document.getElementById('keywordList');
    const addKeywordBtn = document.getElementById('addKeywordBtn');

    const themeBtn = document.getElementById('themeToggle');
    const closeBtn = document.getElementById('closeBtn');
    const focusToggle = document.getElementById('focusToggle');

    // Handle close button
    closeBtn.addEventListener('click', () => {
        window.close();
    });

    // Load theme
    const theme = await StateManager.getTheme();
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // Load focus mode state
    const isFocusEnabled = await StateManager.getFocusStatus();
    focusToggle.checked = isFocusEnabled;

    themeBtn.addEventListener('click', async () => {
        const isDark = document.body.classList.toggle('dark-theme');
        await StateManager.setTheme(isDark ? 'dark' : 'light');
    });

    // Focus mode toggle
    focusToggle.addEventListener('change', async (e) => {
        await StateManager.setFocusStatus(e.target.checked);
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
            const keywordText = document.createElement('span');
            keywordText.className = 'keyword-text';
            keywordText.textContent = kw;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.dataset.keyword = kw;
            removeBtn.textContent = 'x';

            li.append(keywordText, removeBtn);
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
