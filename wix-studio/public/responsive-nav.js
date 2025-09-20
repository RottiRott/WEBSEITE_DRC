import wixWindow from 'wix-window';

/**
 * Initialise the responsive navigation behaviour for Wix Studio.
 *
 * Expects a hamburger button (#burger) and a collapsible menu container (#menu).
 * The menu should start collapsed on mobile. The helper keeps ARIA attributes
 * in sync and mirrors the legacy focus behaviour by restoring focus to the
 * toggle when the menu closes.
 */
export function initNav() {
  const burger = $w('#burger');
  const menu = $w('#menu');

  if (!burger || !menu || typeof burger.onClick !== 'function') {
    return;
  }

  let isOpen = false;
  let lastFocus = burger;

  const updateAria = () => {
    try {
      burger.ariaExpanded = isOpen;
      burger.ariaLabel = isOpen ? 'Menü schließen' : 'Menü öffnen';
    } catch (error) {
      console.warn('Konnte ARIA-Attribute nicht setzen:', error);
    }
  };

  const focusFirstItem = () => {
    try {
      const children = menu.children || [];
      for (const child of children) {
        if (child && typeof child.focus === 'function') {
          child.focus();
          return;
        }
        if (child && Array.isArray(child.children)) {
          const nested = child.children.find((grandChild) => grandChild && typeof grandChild.focus === 'function');
          if (nested) {
            nested.focus();
            return;
          }
        }
      }
    } catch (error) {
      console.warn('Fokus konnte nicht gesetzt werden:', error);
    }
  };

  const closeMenu = () => {
    if (!isOpen) {
      updateAria();
      return;
    }
    isOpen = false;
    if (typeof menu.collapse === 'function') {
      menu.collapse();
    } else {
      menu.hide?.();
    }
    updateAria();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    } else if (typeof burger.focus === 'function') {
      burger.focus();
    }
  };

  const openMenu = () => {
    if (isOpen) {
      return;
    }
    isOpen = true;
    if (typeof menu.expand === 'function') {
      menu.expand();
    } else {
      menu.show?.();
    }
    updateAria();
    focusFirstItem();
  };

  const toggle = () => {
    lastFocus = burger;
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  burger.onClick(toggle);

  if (typeof burger.onKeyPress === 'function') {
    burger.onKeyPress((event) => {
      if (event.key === 'Enter' || event.key === 'Space') {
        toggle();
      }
      if (event.key === 'Escape') {
        closeMenu();
      }
    });
  }

  wixWindow.onResize(() => {
    if (isOpen && wixWindow.formFactor === 'Desktop') {
      closeMenu();
    }
  });

  updateAria();
  closeMenu();
}
