(function () {
  const header = document.querySelector('[data-responsive-header]');
  if (!header) {
    return;
  }

  const navInner = header.querySelector('[data-nav-inner]') || header;
  const inlineNav = header.querySelector('[data-nav-inline]');
  const logoLink = header.querySelector('[data-nav-logo]');
  const toggleButton = header.querySelector('[data-nav-toggle]');
  const overlay = header.querySelector('[data-nav-overlay]');
  const dialog = header.querySelector('[data-nav-dialog]');
  const closeControls = header.querySelectorAll('[data-nav-close]');

  if (!inlineNav || !logoLink || !toggleButton || !overlay || !dialog) {
    return;
  }

  let lastFocused = null;
  const focusableSelectors = 'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"])';

  function setAriaState(expanded) {
    toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    const openLabel = toggleButton.dataset.navLabelOpen || 'Menü öffnen';
    const closeLabel = toggleButton.dataset.navLabelClose || 'Menü schließen';
    toggleButton.setAttribute('aria-label', expanded ? closeLabel : openLabel);
    dialog.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(dialog.querySelectorAll(focusableSelectors)).filter((element) => {
      if (element.hasAttribute('disabled')) {
        return false;
      }
      const rects = element.getClientRects();
      return rects.length > 0 && rects[0].width > 0 && rects[0].height > 0;
    });

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === dialog) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openMenu() {
    if (!header.classList.contains('is-collapsed')) {
      return;
    }

    if (header.classList.contains('menu-open')) {
      return;
    }

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    header.classList.add('menu-open');
    overlay.classList.add('is-visible');
    overlay.removeAttribute('hidden');
    document.body.classList.add('nav-is-open');
    setAriaState(true);

    window.requestAnimationFrame(() => {
      dialog.focus({ preventScroll: true });
    });
  }

  function closeMenu() {
    if (!header.classList.contains('menu-open')) {
      setAriaState(false);
      return;
    }

    header.classList.remove('menu-open');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('hidden', '');
    document.body.classList.remove('nav-is-open');
    setAriaState(false);

    const target = lastFocused && document.contains(lastFocused) ? lastFocused : toggleButton;
    lastFocused = null;
    window.requestAnimationFrame(() => {
      target.focus({ preventScroll: true });
    });
  }

  function updateCollapse() {
    const previousState = header.classList.contains('is-collapsed');
    header.classList.remove('is-collapsed');

    const originalStyle = inlineNav.getAttribute('style');
    const computedDisplay = window.getComputedStyle(inlineNav).display;
    let temporarilyVisible = false;

    if (computedDisplay === 'none') {
      inlineNav.style.display = 'flex';
      inlineNav.style.position = 'absolute';
      inlineNav.style.visibility = 'hidden';
      inlineNav.style.pointerEvents = 'none';
      temporarilyVisible = true;
    }

    const logoRect = logoLink.getBoundingClientRect();
    const logoStyles = window.getComputedStyle(logoLink);
    const inlineRectWidth = inlineNav.scrollWidth;
    const inlineStyles = window.getComputedStyle(inlineNav);
    const navWidth = inlineRectWidth + parseFloat(inlineStyles.marginLeft || '0') + parseFloat(inlineStyles.marginRight || '0');
    const logoWidth = logoRect.width + parseFloat(logoStyles.marginLeft || '0') + parseFloat(logoStyles.marginRight || '0');
    const containerWidth = navInner.clientWidth;
    const buffer = 24;
    const shouldCollapse = navWidth + logoWidth + buffer > containerWidth;

    if (temporarilyVisible) {
      inlineNav.removeAttribute('style');
      if (originalStyle) {
        inlineNav.setAttribute('style', originalStyle);
      }
    }

    if (shouldCollapse) {
      header.classList.add('is-collapsed');
    }

    if (!shouldCollapse && previousState) {
      closeMenu();
    }
  }

  function handleDocumentKeydown(event) {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      event.preventDefault();
      closeMenu();
    }
  }

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    if (header.classList.contains('menu-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeMenu();
    }
  });

  dialog.addEventListener('keydown', trapFocus);
  document.addEventListener('keydown', handleDocumentKeydown);
  closeControls.forEach((element) => {
    element.addEventListener('click', () => {
      closeMenu();
    });
  });

  setAriaState(false);

  const resizeHandler = () => {
    updateCollapse();
  };

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(resizeHandler);
    observer.observe(navInner);
    observer.observe(inlineNav);
  }

  window.addEventListener('resize', resizeHandler);
  window.addEventListener('orientationchange', resizeHandler);

  updateCollapse();
})();
