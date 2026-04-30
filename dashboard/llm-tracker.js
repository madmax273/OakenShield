const LLMTracker = {
    sessions: {},
    labels: {},
    today: StorageManager.getTodayDate(),

    init: async function() {
        await this.loadData();
        this.render();
    },

    loadData: async function() {
        const data = await StorageManager.get({
            dailySessions: {},
            domainLabels: {},
            theme: 'light'
        });
        this.sessions = data.dailySessions[this.today] || {};
        this.labels = data.domainLabels;
        this.applyTheme(data.theme);
    },

    render: function() {
        let aiMinutes = 0;
        let prodMinutes = 0;
        const aiSessions = [];

        // Identify common AI domains even if not tagged
        const defaultAIDomains = ['chatgpt.com', 'gemini.google.com', 'claude.ai', 'perplexity.ai', 'bing.com/chat', 'mistral.ai'];

        Object.entries(this.sessions).forEach(([domain, minutes]) => {
            const baseDomain = domain.split('/')[0];
            const isTaggedAI = this.labels[domain] === 'ai' || this.labels[baseDomain] === 'ai';
            const isDefaultAI = defaultAIDomains.some(d => baseDomain.includes(d));

            if (isTaggedAI || isDefaultAI) {
                aiMinutes += minutes;
                aiSessions.push({ domain, minutes });
            } else if (this.labels[domain] === 'productive' || this.labels[baseDomain] === 'productive') {
                prodMinutes += minutes;
            }
        });

        this.updateUI(aiMinutes, prodMinutes, aiSessions);
    },

    updateUI: function(aiMinutes, prodMinutes, sessions) {
        const thresholdMet = aiMinutes >= 15;
        
        // 1. Cognitive Agency
        const total = aiMinutes + prodMinutes;
        const agency = total > 0 ? Math.round((prodMinutes / total) * 100) : 100;
        
        const percentEl = document.getElementById('agency-percent');
        const circle = document.getElementById('agency-circle');
        
        if (percentEl) {
            percentEl.innerText = thresholdMet ? `${agency}%` : "---";
            percentEl.style.fontSize = thresholdMet ? "42px" : "28px";
        }
        
        if (circle) {
            const offset = thresholdMet ? (565 - (565 * agency) / 100) : 565;
            circle.style.strokeDashoffset = offset;
        }

        // 2. Neural Saturation
        const saturation = Math.min(100, Math.round((aiMinutes / 60) * 100));
        const satEl = document.getElementById('neural-saturation');
        if (satEl) {
            satEl.innerText = thresholdMet ? `${saturation}%` : "Analyzing...";
            satEl.style.color = thresholdMet ? (saturation > 80 ? '#ef4444' : (saturation > 50 ? '#fbbf24' : 'var(--text-primary)')) : 'var(--text-secondary)';
        }

        // 3. Total Time
        const timeEl = document.getElementById('total-ai-time');
        if (timeEl) timeEl.innerText = this.formatTime(aiMinutes);

        // 4. Status Badge
        const statusBadge = document.getElementById('ai-status-badge');
        let status = thresholdMet ? "Sovereign Mind" : "Analyzing Mindset...";
        let color = "var(--ai)";
        
        if (thresholdMet) {
            if (agency < 50) {
                status = "Cognitive Drift";
                color = "#ef4444";
            } else if (agency < 80) {
                status = "Hybrid Focus";
                color = "#fbbf24";
            }
        }
        
        if (statusBadge) {
            statusBadge.innerText = status;
            statusBadge.style.color = color;
            statusBadge.style.borderColor = color;
        }

        // 5. Insights
        this.updateInsights(agency, aiMinutes, thresholdMet);

        // 6. History
        this.updateHistory(sessions);
    },

    updateInsights: function(agency, aiMinutes, thresholdMet) {
        const container = document.getElementById('insights-container');
        if (!container) return;

        if (!thresholdMet) {
            container.innerHTML = `
                <div class="insight-card" style="opacity: 0.7;">
                    <div class="insight-header">⌛ Data Acquisition</div>
                    <div class="insight-desc">OakenShield requires at least 15 minutes of AI interaction to generate a valid cognitive profile. Continue your session.</div>
                </div>
            `;
            return;
        }

        const insights = [];
        if (agency < 50) {
            insights.push({ 
                title: "Critcal Alert: Offloading", 
                desc: "Your agency is low. You are currently 'offloading' core reasoning to AI. Try to finish the next task solo.",
                danger: true 
            });
        }
        if (aiMinutes > 45) {
            insights.push({ 
                title: "Neural Fatigue", 
                desc: "Over 45 minutes of AI interaction. Your ability to synthesize new information independently is likely decreasing.",
                danger: aiMinutes > 90
            });
        }
        if (agency >= 80 && aiMinutes > 0) {
            insights.push({ 
                title: "Brain Scaffolding", 
                desc: "Great job! You are using AI as a scaffold while keeping the core logic in your own mind.",
                danger: false
            });
        }

        container.innerHTML = insights.map(i => `
            <div class="insight-card ${i.danger ? 'danger-zone' : ''}">
                <div class="insight-header">${i.danger ? '⚠️' : '🧠'} ${i.title}</div>
                <div class="insight-desc">${i.desc}</div>
            </div>
        `).join('');
    },

    updateHistory: function(sessions) {
        const list = document.getElementById('ai-history-list');
        if (!list) return;

        if (sessions.length === 0) {
            list.innerHTML = '<div class="empty-state">No AI activity recorded.</div>';
            return;
        }

        list.innerHTML = sessions.sort((a,b) => b.minutes - a.minutes).map(s => `
            <div class="history-item">
                <div class="s-name" style="font-weight: 500;">${s.domain}</div>
                <div class="s-time" style="font-family: var(--font-outfit); font-weight: 700;">${this.formatTime(s.minutes)}</div>
            </div>
        `).join('');
    },

    formatTime: function(minutes) {
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    },

    applyTheme: function(theme) {
        if (theme === 'dark') document.body.classList.add('dark-theme');
        else document.body.classList.remove('dark-theme');
    }
};

LLMTracker.init();
