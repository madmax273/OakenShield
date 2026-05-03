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
        const total = aiMinutes + prodMinutes;
        const agency = total > 0 ? Math.round((prodMinutes / total) * 100) : 100;

        const percentEl = document.getElementById('agency-percent');
        const circle = document.getElementById('agency-circle');

        if (percentEl) {
            percentEl.innerText = thresholdMet ? `${agency}%` : '---';
            percentEl.style.fontSize = thresholdMet ? '42px' : '28px';
        }

        if (circle) {
            const offset = thresholdMet ? (565 - (565 * agency) / 100) : 565;
            circle.style.strokeDashoffset = offset;
        }

        const saturation = Math.min(100, Math.round((aiMinutes / 60) * 100));
        const satEl = document.getElementById('neural-saturation');
        if (satEl) {
            satEl.innerText = thresholdMet ? `${saturation}%` : 'Analyzing...';
            satEl.style.color = thresholdMet ? (saturation > 80 ? '#ef4444' : (saturation > 50 ? '#fbbf24' : 'var(--text-primary)')) : 'var(--text-secondary)';
        }

        const timeEl = document.getElementById('total-ai-time');
        if (timeEl) timeEl.innerText = this.formatTime(aiMinutes);

        const statusBadge = document.getElementById('ai-status-badge');
        let status = thresholdMet ? 'Sovereign Mind' : 'Analyzing Mindset...';
        let color = 'var(--ai)';

        if (thresholdMet) {
            if (agency < 50) {
                status = 'Cognitive Drift';
                color = '#ef4444';
            } else if (agency < 80) {
                status = 'Hybrid Focus';
                color = '#fbbf24';
            }
        }

        if (statusBadge) {
            statusBadge.innerText = status;
            statusBadge.style.color = color;
            statusBadge.style.borderColor = color;
        }

        this.updateInsights(agency, aiMinutes, thresholdMet);
        this.updateHistory(sessions);
    },

    updateInsights: function(agency, aiMinutes, thresholdMet) {
        const container = document.getElementById('insights-container');
        if (!container) return;

        container.innerHTML = '';

        if (!thresholdMet) {
            this.appendInsight(container, {
                title: 'Data Acquisition',
                desc: 'OakenShield requires at least 15 minutes of AI interaction to generate a valid cognitive profile. Continue your session.',
                danger: false
            });
            return;
        }

        const insights = [];
        if (agency < 50) {
            insights.push({
                title: 'Critical Alert: Offloading',
                desc: 'Your agency is low. You are currently offloading core reasoning to AI. Try to finish the next task solo.',
                danger: true
            });
        }
        if (aiMinutes > 45) {
            insights.push({
                title: 'Neural Fatigue',
                desc: 'Over 45 minutes of AI interaction. Your ability to synthesize new information independently is likely decreasing.',
                danger: aiMinutes > 90
            });
        }
        if (agency >= 80 && aiMinutes > 0) {
            insights.push({
                title: 'Brain Scaffolding',
                desc: 'Great job. You are using AI as a scaffold while keeping the core logic in your own mind.',
                danger: false
            });
        }

        insights.forEach(i => this.appendInsight(container, i));
    },

    appendInsight: function(container, insight) {
        const card = document.createElement('div');
        card.className = `insight-card ${insight.danger ? 'danger-zone' : ''}`;

        const header = document.createElement('div');
        header.className = 'insight-header';
        header.textContent = `${insight.danger ? 'Alert:' : 'Insight:'} ${insight.title}`;

        const desc = document.createElement('div');
        desc.className = 'insight-desc';
        desc.textContent = insight.desc;

        card.append(header, desc);
        container.appendChild(card);
    },

    updateHistory: function(sessions) {
        const list = document.getElementById('ai-history-list');
        if (!list) return;

        list.innerHTML = '';

        if (sessions.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.textContent = 'No AI activity recorded.';
            list.appendChild(empty);
            return;
        }

        sessions.sort((a,b) => b.minutes - a.minutes).forEach(s => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const name = document.createElement('div');
            name.className = 's-name';
            name.style.fontWeight = '500';
            name.textContent = s.domain;

            const time = document.createElement('div');
            time.className = 's-time';
            time.style.fontFamily = 'var(--font-outfit)';
            time.style.fontWeight = '700';
            time.textContent = this.formatTime(s.minutes);

            item.append(name, time);
            list.appendChild(item);
        });
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
