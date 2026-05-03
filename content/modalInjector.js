(function() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "INJECT_MODAL" && message.payload) {
      injectModal(String(message.payload.keyword || ""));
    } else if (message.type === "INJECT_THINK_FIRST" && message.payload) {
      injectThinkFirst(String(message.payload.domain || ""));
    }
  });

  function applySavedTheme(overlay) {
    StorageManager.get({ theme: 'light' }).then(data => {
      if (data.theme === 'dark') {
        overlay.classList.add('dark-theme');
      }
    });
  }

  function removeOverlay(overlay, onBeforeRemove) {
    if (onBeforeRemove) onBeforeRemove();
    overlay.classList.remove('focus-guard-show');
    setTimeout(() => {
      overlay.remove();
      document.body.classList.remove('focus-guard-locked');
    }, 400);
  }

  function injectModal(keyword) {
    if (document.getElementById('focus-guard-modal-root')) return;

    document.body.classList.add('focus-guard-locked');

    const overlay = document.createElement('div');
    overlay.id = 'focus-guard-modal-root';
    overlay.className = 'focus-guard-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    applySavedTheme(overlay);

    const card = document.createElement('div');
    card.className = 'focus-guard-modal-card';

    const title = document.createElement('h2');
    title.className = 'focus-guard-modal-title';
    title.textContent = 'You promised yourself not to search this.';

    const timer = document.createElement('p');
    timer.className = 'focus-guard-modal-desc';
    timer.id = 'focus-guard-strict-timer';
    timer.style.cssText = 'color: inherit; font-weight: 600; opacity: 0.8; margin-bottom: 16px;';
    timer.textContent = '10 seconds remaining';

    const desc = document.createElement('p');
    desc.className = 'focus-guard-modal-desc';
    desc.append('Stay focused on your goals.');
    desc.appendChild(document.createElement('br'));

    const chip = document.createElement('span');
    chip.className = 'focus-guard-keyword-chip';
    chip.append('Detected: ');
    const keywordText = document.createElement('span');
    keywordText.textContent = keyword;
    chip.appendChild(keywordText);
    desc.appendChild(chip);

    const actions = document.createElement('div');
    actions.className = 'focus-guard-actions';

    const goBackBtn = document.createElement('button');
    goBackBtn.className = 'focus-guard-btn-primary';
    goBackBtn.id = 'focus-guard-goback';
    goBackBtn.textContent = 'Go Back';

    const continueBtn = document.createElement('button');
    continueBtn.className = 'focus-guard-btn-secondary';
    continueBtn.id = 'focus-guard-continue';
    continueBtn.disabled = true;
    continueBtn.style.opacity = '0.5';
    continueBtn.style.cursor = 'not-allowed';
    continueBtn.textContent = 'Continue Anyway';

    actions.append(goBackBtn, continueBtn);

    const footer = document.createElement('p');
    footer.style.cssText = 'margin-top: 24px; font-size: 12px; opacity: 0.5; text-align: center;';
    footer.textContent = 'Disable anytime from extension settings.';

    card.append(title, timer, desc, actions, footer);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);

    setTimeout(() => overlay.classList.add('focus-guard-show'), 10);

    let timeLeft = 10;
    const timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timer.style.display = 'none';
        continueBtn.disabled = false;
        continueBtn.style.opacity = '1';
        continueBtn.style.cursor = 'pointer';
      } else {
        timer.textContent = `${timeLeft} seconds remaining`;
      }
    }, 1000);

    const focusable = overlay.querySelectorAll('button');
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    overlay.addEventListener('keydown', function(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    });
    firstFocusable.focus();

    goBackBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: "RESISTED" });
      removeOverlay(overlay, () => clearInterval(timerInterval));
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "https://www.google.com";
      }
    });

    continueBtn.addEventListener('click', () => {
      if (confirm("Are you absolutely sure you want to break focus?")) {
        chrome.runtime.sendMessage({ type: "CONTINUED" });
        removeOverlay(overlay, () => clearInterval(timerInterval));
      }
    });
  }

  function injectThinkFirst(domain) {
    if (document.getElementById('think-first-overlay')) return;

    document.body.classList.add('focus-guard-locked');
    const overlay = document.createElement('div');
    overlay.id = 'think-first-overlay';
    overlay.className = 'focus-guard-modal-overlay focus-guard-show think-first';

    const card = document.createElement('div');
    card.className = 'focus-guard-modal-card think-card';

    const icon = document.createElement('div');
    icon.className = 'think-icon';
    icon.textContent = 'Think';

    const title = document.createElement('h2');
    title.className = 'focus-guard-modal-title';
    title.textContent = 'Cognitive Scaffold Active';

    const desc = document.createElement('p');
    desc.className = 'focus-guard-modal-desc';
    desc.append('You are entering ');
    const strong = document.createElement('strong');
    strong.textContent = domain;
    desc.appendChild(strong);
    desc.append('.');
    desc.appendChild(document.createElement('br'));
    desc.append('Research suggests that independent thinking before prompting improves retention.');

    const timerBarWrap = document.createElement('div');
    timerBarWrap.className = 'think-timer-bar';
    const timerBar = document.createElement('div');
    timerBar.id = 'think-timer';
    timerBar.className = 'think-timer-progress';
    timerBarWrap.appendChild(timerBar);

    const timerText = document.createElement('p');
    timerText.className = 'timer-text';
    timerText.append('Think for yourself for ');
    const secondsEl = document.createElement('span');
    secondsEl.id = 'think-seconds';
    secondsEl.textContent = '10';
    timerText.appendChild(secondsEl);
    timerText.append('s...');

    const actions = document.createElement('div');
    actions.className = 'focus-guard-actions';
    const skipBtn = document.createElement('button');
    skipBtn.className = 'focus-guard-btn-secondary';
    skipBtn.id = 'think-skip';
    skipBtn.style.opacity = '0.3';
    skipBtn.style.cursor = 'not-allowed';
    skipBtn.disabled = true;
    skipBtn.textContent = "I've already thought it through";
    actions.appendChild(skipBtn);

    const preference = document.createElement('div');
    preference.className = 'think-preference';
    preference.style.cssText = 'margin-top: 20px; font-size: 13px; opacity: 0.7; display: flex; align-items: center; justify-content: center; gap: 8px;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'dont-show-think-first';
    const label = document.createElement('label');
    label.htmlFor = 'dont-show-think-first';
    label.style.cursor = 'pointer';
    label.textContent = "Don't show this for AI sites again";
    preference.append(checkbox, label);

    card.append(icon, title, desc, timerBarWrap, timerText, actions, preference);
    overlay.appendChild(card);
    document.documentElement.appendChild(overlay);

    let seconds = 10;
    const interval = setInterval(() => {
      seconds--;
      secondsEl.textContent = seconds;
      timerBar.style.width = `${(seconds / 10) * 100}%`;

      if (seconds <= 0) {
        clearInterval(interval);
        skipBtn.disabled = false;
        skipBtn.style.opacity = '1';
        skipBtn.style.cursor = 'pointer';
        skipBtn.textContent = 'Begin Interaction';
        skipBtn.classList.add('ready');
      }
    }, 1000);

    skipBtn.addEventListener('click', async () => {
      if (checkbox.checked) {
        await StorageManager.set({ skipThinkFirst: true });
      }
      removeOverlay(overlay, () => clearInterval(interval));
    });
  }
})();
