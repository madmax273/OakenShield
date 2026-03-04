document.addEventListener('DOMContentLoaded', async () => {
    const keywordInput = document.getElementById('keywordInput');
    const keywordList = document.getElementById('keywordList');
    const addKeywordBtn = document.getElementById('addKeywordBtn');

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
