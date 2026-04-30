(function() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "INJECT_MODAL" && message.payload) {
      injectModal(message.payload.keyword);
    } else if (message.type === "INJECT_THINK_FIRST" && message.payload) {
      injectThinkFirst(message.payload.domain);
    }
  });

  function injectModal(keyword) {
    if (document.getElementById('focus-guard-modal-root')) return;

    // Lock body scroll
    document.body.classList.add('focus-guard-locked');

    const overlay = document.createElement('div');
    overlay.id = 'focus-guard-modal-root';
    overlay.className = 'focus-guard-modal-overlay';
    
    // Accessibility and focus trap
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    StorageManager.get({ theme: 'light' }).then(data => {
        if (data.theme === 'dark') {
            overlay.classList.add('dark-theme');
        }
    });

    overlay.innerHTML = `
      <div class="focus-guard-modal-card">
          <h2 class="focus-guard-modal-title">You promised yourself not to search this.</h2>
          <p class="focus-guard-modal-desc" id="focus-guard-strict-timer" style="color: inherit; font-weight: 600; opacity: 0.8; margin-bottom: 16px;">⏳ 10 seconds remaining</p>
          <p class="focus-guard-modal-desc">Stay focused on your goals.<br>
            <span class="focus-guard-keyword-chip">Detected: ${keyword}</span>
          </p>
          <div class="focus-guard-actions">
              <button class="focus-guard-btn-primary" id="focus-guard-goback">Go Back</button>
              <button class="focus-guard-btn-secondary" id="focus-guard-continue" disabled style="opacity: 0.5; cursor: not-allowed;">Continue Anyway</button>
          </div>
          <p style="margin-top: 24px; font-size: 12px; opacity: 0.5; text-align: center;">Disable anytime from extension settings.</p>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    // Animate in
    setTimeout(() => {
        overlay.classList.add('focus-guard-show');
    }, 10);

    // Timer Logic
    let timeLeft = 10;
    const timerElement = document.getElementById('focus-guard-strict-timer');
    const continueBtn = document.getElementById('focus-guard-continue');
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.style.display = 'none';
            continueBtn.disabled = false;
            continueBtn.style.opacity = '1';
            continueBtn.style.cursor = 'pointer';
            continueBtn.innerText = "Continue Anyway";
        } else {
            timerElement.innerText = `⏳ ${timeLeft} seconds remaining`;
        }
    }, 1000);

    // Trap Keyboard Focus
    const focusable = overlay.querySelectorAll('button');
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    overlay.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) { 
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    });
    firstFocusable.focus();

    // Handlers
    document.getElementById('focus-guard-goback').addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: "RESISTED" });
        removeModal();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = "https://www.google.com"; // Fallback
        }
    });

    document.getElementById('focus-guard-continue').addEventListener('click', () => {
        // V1 Confirmation Step: just ask for double confirmation
        if (confirm("Are you absolutely sure you want to break focus?")) {
            chrome.runtime.sendMessage({ type: "CONTINUED" });
            removeModal();
        }
    });

    function removeModal() {
        overlay.classList.remove('focus-guard-show');
        setTimeout(() => {
            overlay.remove();
            document.body.classList.remove('focus-guard-locked');
        }, 400); // Wait for transition
    }
  }

  function injectThinkFirst(domain) {
    if (document.getElementById('think-first-overlay')) return;
    
    document.body.classList.add('focus-guard-locked');
    const overlay = document.createElement('div');
    overlay.id = 'think-first-overlay';
    overlay.className = 'focus-guard-modal-overlay focus-guard-show think-first';
    
    overlay.innerHTML = `
      <div class="focus-guard-modal-card think-card">
          <div class="think-icon">🧠</div>
          <h2 class="focus-guard-modal-title">Cognitive Scaffold Active</h2>
          <p class="focus-guard-modal-desc">
            You are entering <strong>${domain}</strong>. <br>
            Research suggests that independent thinking for just 2 minutes before prompting improves retention by 40%.
          </p>
          <div class="think-timer-bar">
            <div id="think-timer" class="think-timer-progress"></div>
          </div>
          <p class="timer-text">Think for yourself for <span id="think-seconds">10</span>s...</p>
          <div class="focus-guard-actions">
               <button class="focus-guard-btn-secondary" id="think-skip" style="opacity: 0.3; cursor: not-allowed;" disabled>I've already thought it through</button>
          </div>
          <div class="think-preference" style="margin-top: 20px; font-size: 13px; opacity: 0.7; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <input type="checkbox" id="dont-show-think-first">
              <label for="dont-show-think-first" style="cursor: pointer;">Don't show this for AI sites again</label>
          </div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    let seconds = 10;
    const skipBtn = document.getElementById('think-skip');
    const secondsEl = document.getElementById('think-seconds');
    const timerBar = document.getElementById('think-timer');

    const interval = setInterval(() => {
        seconds--;
        if (secondsEl) secondsEl.innerText = seconds;
        if (timerBar) timerBar.style.width = `${(seconds / 10) * 100}%`;

        if (seconds <= 0) {
            clearInterval(interval);
            skipBtn.disabled = false;
            skipBtn.style.opacity = '1';
            skipBtn.style.cursor = 'pointer';
            skipBtn.innerText = "Begin Interaction";
            skipBtn.classList.add('ready');
        }
    }, 1000);

    skipBtn.addEventListener('click', async () => {
        const skipAlways = document.getElementById('dont-show-think-first').checked;
        if (skipAlways) {
            await StorageManager.set({ skipThinkFirst: true });
        }
        overlay.classList.remove('focus-guard-show');
        setTimeout(() => {
            overlay.remove();
            document.body.classList.remove('focus-guard-locked');
        }, 400);
    });
  }
})();
