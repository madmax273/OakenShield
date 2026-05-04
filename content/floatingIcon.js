(function() {
  const ICON_ID = 'oakenshield-floating-icon-container';
  let desiredEnabled = true;
  let floatingIconCleanup = null;

  if (document.getElementById(ICON_ID)) return;

  // Check if floating icon is enabled
  chrome.storage.local.get(['floatingIconEnabled'], (result) => {
    if (result.floatingIconEnabled === false) {
      desiredEnabled = false;
      return; // Don't create the floating icon if disabled
    }
    if (desiredEnabled) {
      createFloatingIcon();
    }
  });

  // Listen for toggle messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FLOATING_ICON_TOGGLE') {
      desiredEnabled = message.enabled;
      const container = document.getElementById(ICON_ID);
      if (message.enabled && !container) {
        createFloatingIcon();
      } else if (!message.enabled && container) {
        destroyFloatingIcon();
      }
    }
  });

  function createFloatingIcon() {
    if (document.getElementById(ICON_ID)) return;

    const ICON_SIZE = 48;
    const SAFE_MARGIN = 16;
    const DRAG_THRESHOLD = 4;
    const DEFAULT_TOP_RATIO = 0.72;
    const STORAGE_KEY = 'floatingIconPos';

    const container = document.createElement('div');
    container.id = ICON_ID;
    container.setAttribute('role', 'button');
    container.setAttribute('aria-label', 'Open OakenShield dashboard');
    container.tabIndex = 0;

    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('assets/icon.png');
    iconImg.alt = 'OakenShield';
    iconImg.className = 'oakenshield-icon';
    iconImg.draggable = false;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'x';
    closeButton.className = 'oakenshield-close-btn';
    closeButton.title = 'Hide OakenShield icon on this page';
    closeButton.setAttribute('aria-label', 'Hide OakenShield icon on this page');

    container.append(iconImg, closeButton);
    document.documentElement.appendChild(container);

    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    let activePointerId = null;

    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (!container.isConnected) return;
      applyStoredPosition(result[STORAGE_KEY]);
    });

    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      destroyFloatingIcon();
    });

    container.addEventListener('click', (e) => {
      if (e.target.closest('.oakenshield-close-btn')) return;
      if (hasMoved) return;
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    });

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
      }
    });

    container.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.oakenshield-close-btn')) return;

      const rect = container.getBoundingClientRect();
      activePointerId = e.pointerId;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      initialX = rect.left;
      initialY = rect.top;

      container.setPointerCapture(activePointerId);
      container.classList.add('oakenshield-dragging');
      container.style.transition = 'none';
      e.preventDefault();
    });

    container.addEventListener('pointermove', (e) => {
      if (!isDragging || e.pointerId !== activePointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasMoved = true;
      }

      if (!hasMoved) return;

      const left = clamp(initialX + dx, SAFE_MARGIN, getMaxLeft());
      const top = clamp(initialY + dy, SAFE_MARGIN, getMaxTop());
      setPosition(left, top);
    });

    container.addEventListener('pointerup', finishDrag);
    container.addEventListener('pointercancel', finishDrag);

    const handleResize = debounce(() => {
      if (isDragging) return;
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (!container.isConnected) return;
        applyStoredPosition(result[STORAGE_KEY]);
      });
    }, 100);

    const handlePageShow = () => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (!container.isConnected) return;
        applyStoredPosition(result[STORAGE_KEY]);
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pageshow', handlePageShow);

    floatingIconCleanup = () => {
      if (isDragging && activePointerId !== null) {
        try {
          container.releasePointerCapture(activePointerId);
        } catch (err) {}
      }

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pageshow', handlePageShow);
      container.remove();

      isDragging = false;
      hasMoved = false;
      activePointerId = null;
      floatingIconCleanup = null;
    };

    function finishDrag(e) {
      if (!isDragging || e.pointerId !== activePointerId) return;

      isDragging = false;
      activePointerId = null;
      container.classList.remove('oakenshield-dragging');

      try {
        container.releasePointerCapture(e.pointerId);
      } catch (err) {}

      container.style.transition = '';

      if (hasMoved) {
        snapToNearestEdge();
        setTimeout(() => {
          hasMoved = false;
        }, 0);
      }
    }

    function applyStoredPosition(position) {
      const edge = position && (position.edge === 'left' || position.edge === 'right')
        ? position.edge
        : 'right';
      const topRatio = position && typeof position.topRatio === 'number'
        ? position.topRatio
        : DEFAULT_TOP_RATIO;

      const top = getTopFromRatio(topRatio);
      const left = edge === 'left' ? SAFE_MARGIN : getMaxLeft();
      container.dataset.edge = edge;
      setPosition(left, top);
    }

    function snapToNearestEdge() {
      const rect = container.getBoundingClientRect();
      const edge = rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
      const top = clamp(rect.top, SAFE_MARGIN, getMaxTop());
      const left = edge === 'left' ? SAFE_MARGIN : getMaxLeft();

      container.dataset.edge = edge;
      setPosition(left, top);

      chrome.storage.local.set({
        [STORAGE_KEY]: {
          edge,
          topRatio: getTopRatio(top)
        }
      });
    }

    function setPosition(left, top) {
      container.style.left = `${Math.round(left)}px`;
      container.style.top = `${Math.round(top)}px`;
    }

    function getTopFromRatio(topRatio) {
      return clamp(SAFE_MARGIN + (getAvailableHeight() * topRatio), SAFE_MARGIN, getMaxTop());
    }

    function getTopRatio(top) {
      const availableHeight = getAvailableHeight();
      if (availableHeight <= 0) return DEFAULT_TOP_RATIO;
      return clamp((top - SAFE_MARGIN) / availableHeight, 0, 1);
    }

    function getAvailableHeight() {
      return Math.max(0, window.innerHeight - ICON_SIZE - (SAFE_MARGIN * 2));
    }

    function getMaxTop() {
      return Math.max(SAFE_MARGIN, window.innerHeight - ICON_SIZE - SAFE_MARGIN);
    }

    function getMaxLeft() {
      return Math.max(SAFE_MARGIN, window.innerWidth - ICON_SIZE - SAFE_MARGIN);
    }

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    function debounce(fn, delay) {
      let timer;
      return function() {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
      };
    }
  }

  function destroyFloatingIcon() {
    if (floatingIconCleanup) {
      floatingIconCleanup();
      return;
    }

    const container = document.getElementById(ICON_ID);
    if (container) {
      container.remove();
    }
  }
})();
