(function() {
  if (document.getElementById('oakenshield-floating-icon-container')) return;

  const container = document.createElement('div');
  container.id = 'oakenshield-floating-icon-container';
  
  // Create Icon
  const iconImg = document.createElement('img');
  iconImg.src = chrome.runtime.getURL('assets/icon.png');
  iconImg.alt = 'OakenShield';
  iconImg.className = 'oakenshield-icon';
  iconImg.draggable = false;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.className = 'oakenshield-close-btn';
  closeButton.title = 'Remove OakenShield Icon';
  
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    container.remove();
  });

  // Open Dashboard on click
  container.addEventListener('click', (e) => {
    if (e.target.closest('.oakenshield-close-btn')) return;
    if (isDragging) return; // Prevent click if dragged
    
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
  });

  container.appendChild(iconImg);
  container.appendChild(closeButton);
  document.body.appendChild(container);

  // Load position
  chrome.storage.local.get(['floatingIconPos'], (result) => {
    if (result.floatingIconPos) {
      container.style.top = result.floatingIconPos.top;
      container.style.left = result.floatingIconPos.left;
      container.dataset.edge = result.floatingIconPos.edge;
    } else {
      // Default
      container.style.top = `${window.innerHeight - 70}px`;
      container.style.left = `${window.innerWidth - 45}px`;
      container.dataset.edge = 'right';
    }
    
    container.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease, border-radius 0.3s ease, background-color 0.3s ease';
    resetAutoHide();
  });

  // Dragging logic
  let isDragging = false;
  let startX, startY, initialX, initialY;

  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only left click
    if (e.target.closest('.oakenshield-close-btn')) return;

    e.preventDefault();
    isDragging = false;
    
    const rect = container.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    startX = e.clientX;
    startY = e.clientY;

    container.style.transition = 'none'; // disable transitions while dragging
    container.classList.remove('oakenshield-icon-hidden-right');
    container.classList.remove('oakenshield-icon-hidden-left');

    const mouseMoveHandler = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDragging = true;
      }
      
      if (isDragging) {
        container.style.left = `${initialX + dx}px`;
        container.style.top = `${initialY + dy}px`;
        resetAutoHide(); // Reset timer
      }
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      if (isDragging) {
        snapToEdge();
      }
      resetAutoHide();
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  });

  function snapToEdge() {
    const rect = container.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    const isRightHalf = (rect.left + rect.width / 2) > (windowWidth / 2);
    
    container.style.transition = 'left 0.3s ease, top 0.3s ease';
    
    // Constrain top/bottom bounds
    let finalTop = rect.top;
    if (finalTop < 0) finalTop = 0;
    if (finalTop > windowHeight - rect.height) finalTop = windowHeight - rect.height;
    container.style.top = `${finalTop}px`;

    if (isRightHalf) {
      container.style.left = `${windowWidth - rect.width}px`;
      container.dataset.edge = 'right';
    } else {
      container.style.left = '0px';
      container.dataset.edge = 'left';
    }
    
    // Save position
    chrome.storage.local.set({
      floatingIconPos: {
        top: container.style.top,
        left: container.style.left,
        edge: container.dataset.edge
      }
    });
    
    // Restore base transitions after snapping
    setTimeout(() => {
      container.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease, border-radius 0.3s ease, background-color 0.3s ease';
    }, 300);
  }

  // Auto-hide logic
  let hideTimeout;
  const HIDE_DELAY = 3000; // 3 seconds

  function resetAutoHide() {
    clearTimeout(hideTimeout);
    container.classList.remove('oakenshield-icon-hidden-right');
    container.classList.remove('oakenshield-icon-hidden-left');
    
    hideTimeout = setTimeout(() => {
      if (container.dataset.edge === 'left') {
        container.classList.add('oakenshield-icon-hidden-left');
      } else {
        container.classList.add('oakenshield-icon-hidden-right');
      }
    }, HIDE_DELAY);
  }

  container.addEventListener('mouseenter', resetAutoHide);
  container.addEventListener('mouseleave', resetAutoHide);
  
  // Recalculate on resize
  window.addEventListener('resize', () => {
    if (!isDragging) snapToEdge();
  });
})();
