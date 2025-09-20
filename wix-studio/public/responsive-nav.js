let initialised = false;

/**
 * Initialises the responsive navigation toggle for Wix Studio.
 * Ensures the burger button controls the collapsible mobile menu (#menu).
 */
export function initNav() {
  if (initialised) {
    syncAriaState();
    return;
  }

  initialised = true;

  const setup = () => {
    const burger = $w('#burger');
    const menu = $w('#menu');

    if (!burger || !menu) {
      initialised = false;
      return;
    }

    const supportsCollapse = typeof menu.collapse === 'function' && typeof menu.expand === 'function';

    const updateAria = (expanded) => {
      if ('ariaExpanded' in burger) {
        burger.ariaExpanded = expanded;
      }
      if ('ariaLabel' in burger) {
        burger.ariaLabel = expanded ? 'Menü schließen' : 'Menü öffnen';
      }
    };

    const focusFirstInteractive = () => {
      const focusables = gatherInteractives(menu);
      const first = focusables.find((item) => typeof item.focus === 'function');
      if (first) {
        first.focus();
      }
    };

    const openMenu = () => {
      if (supportsCollapse && menu.collapsed) {
        menu.expand();
      }
      updateAria(true);
      focusFirstInteractive();
    };

    const closeMenu = () => {
      if (supportsCollapse && !menu.collapsed) {
        menu.collapse();
      }
      updateAria(false);
    };

    const toggleMenu = () => {
      if (!supportsCollapse) {
        updateAria(true);
        focusFirstInteractive();
        return;
      }

      if (menu.collapsed) {
        openMenu();
      } else {
        closeMenu();
      }
    };

    burger.onClick(toggleMenu);

    attachCloseHandlers(menu, closeMenu, burger);

    if (supportsCollapse) {
      closeMenu();
    }

    updateAria(false);
  };

  if (typeof $w.onReady === 'function') {
    $w.onReady(setup);
  } else {
    setup();
  }
}

function syncAriaState() {
  const burger = $w('#burger');
  const menu = $w('#menu');

  if (!burger || !menu) {
    return;
  }

  const expanded = typeof menu.collapsed === 'boolean' ? !menu.collapsed : false;
  if ('ariaExpanded' in burger) {
    burger.ariaExpanded = expanded;
  }
  if ('ariaLabel' in burger) {
    burger.ariaLabel = expanded ? 'Menü schließen' : 'Menü öffnen';
  }
}

function attachCloseHandlers(container, close, ignore) {
  if (!container) {
    return;
  }

  const visit = (element, isRoot = false) => {
    if (!element || element === ignore) {
      return;
    }

    if (!isRoot && typeof element.onClick === 'function') {
      element.onClick(() => close());
    }

    const children = element.children;
    if (Array.isArray(children)) {
      children.forEach((child) => visit(child, false));
    }
  };

  visit(container, true);
}

function gatherInteractives(container) {
  const items = [];

  const visit = (element) => {
    if (!element) {
      return;
    }

    if (typeof element.focus === 'function') {
      items.push(element);
    }

    const children = element.children;
    if (Array.isArray(children)) {
      children.forEach(visit);
    }
  };

  visit(container);
  return items;
}
