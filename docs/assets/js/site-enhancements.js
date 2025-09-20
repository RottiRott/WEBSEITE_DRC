(function () {
  const globalNamespace = window.DRC || (window.DRC = {});
  const utils = globalNamespace.utils || (globalNamespace.utils = {});

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch (error) {
      return true;
    }
  })();

  utils.isInIframe = () => isInIframe;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  utils.clamp = clamp;

  let embedResizeInitialized = false;

  function ensureEmbedResizer() {
    if (embedResizeInitialized || typeof window.__postHeight === 'function') {
      return;
    }

    if (!isInIframe) {
      return;
    }

    embedResizeInitialized = true;

    let rafHandle = 0;
    let lastHeight = 0;

    const postHeight = () => {
      if (!isInIframe) {
        return;
      }

      const height = Math.max(
        document.documentElement?.scrollHeight || 0,
        document.body?.scrollHeight || 0,
      );

      if (!height || Math.abs(height - lastHeight) < 2) {
        return;
      }

      lastHeight = height;
      try {
        window.parent.postMessage({ type: 'embed:height', height }, '*');
      } catch (error) {
        // ignore postMessage errors – most likely blocked by CSP
      }
    };

    const schedulePostHeight = () => {
      if (rafHandle) {
        return;
      }
      rafHandle = window.requestAnimationFrame(() => {
        rafHandle = 0;
        postHeight();
      });
    };

    window.__postHeight = schedulePostHeight;

    const observers = [];

    if ('ResizeObserver' in window) {
      try {
        const resizeObserver = new ResizeObserver(schedulePostHeight);
        resizeObserver.observe(document.documentElement);
        resizeObserver.observe(document.body);
        observers.push(resizeObserver);
      } catch (error) {
        // ignore
      }
    }

    if ('MutationObserver' in window) {
      try {
        const mutationObserver = new MutationObserver(schedulePostHeight);
        mutationObserver.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
        });
        observers.push(mutationObserver);
      } catch (error) {
        // ignore
      }
    }

    ['load', 'resize', 'orientationchange'].forEach(eventName => {
      window.addEventListener(eventName, schedulePostHeight, {
        passive: true,
      });
    });

    schedulePostHeight();
    window.setTimeout(schedulePostHeight, 300);
    window.setTimeout(schedulePostHeight, 1000);
    window.setTimeout(schedulePostHeight, 2500);
  }

  utils.ensureEmbedResizer = ensureEmbedResizer;

  async function postViaBridge(body, {
    timeout = 15000,
    bridgeType = 'webhookbridge:submit',
    resultType = 'webhookbridge:result',
  } = {}) {
    if (!isInIframe) {
      return { ok: false, status: 0, text: 'not-in-iframe' };
    }

    return new Promise(resolve => {
      const token = Math.random().toString(36).slice(2);

      const handleMessage = event => {
        const data = event?.data;
        if (!data || data.type !== resultType || data.token !== token) {
          return;
        }
        window.removeEventListener('message', handleMessage);
        window.clearTimeout(timeoutId);
        resolve({ ok: !!data.ok, status: data.status, text: data.text || '' });
      };

      window.addEventListener('message', handleMessage);
      try {
        window.parent.postMessage({ type: bridgeType, token, body }, '*');
      } catch (error) {
        window.removeEventListener('message', handleMessage);
        resolve({ ok: false, status: 0, text: error.message || 'bridge postMessage failed' });
        return;
      }

      const timeoutId = window.setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve({ ok: false, status: 408, text: 'Bridge timeout' });
      }, timeout);
    });
  }

  utils.postViaBridge = postViaBridge;

  async function submitWebhook(body, { directUrls = [], signal, preferBridge = false } = {}) {
    const urls = Array.isArray(directUrls) ? directUrls : [];

    if (preferBridge) {
      const bridgeResult = await postViaBridge(body);
      if (bridgeResult.ok || bridgeResult.status > 0) {
        return bridgeResult;
      }
    }

    for (const url of urls) {
      if (!url) {
        continue;
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
          credentials: 'omit',
        });

        const text = await response.text();
        if (response.ok) {
          return { ok: true, status: response.status, text };
        }
        if (response.status >= 500) {
          continue;
        }
        return { ok: false, status: response.status, text };
      } catch (error) {
        if (error?.name === 'AbortError') {
          return { ok: false, status: 499, text: 'aborted' };
        }
      }
    }

    return postViaBridge(body);
  }

  utils.submitWebhook = submitWebhook;

  function setupProgressBar() {
    const progressElement = document.getElementById('scroll-progress');
    if (!progressElement) {
      return;
    }

    const update = () => {
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? clamp(scrollTop / maxScroll, 0, 1) : 0;
      progressElement.style.transform = `scaleX(${progress})`;
    };

    update();

    const handleScroll = () => {
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', update);
  }

  function setupBackToTop() {
    const button = document.getElementById('back-to-top');
    if (!button) {
      return;
    }

    const toggleVisibility = () => {
      const show = window.scrollY > window.innerHeight * 0.5;
      button.classList.toggle('is-visible', show);
    };

    window.addEventListener('scroll', () => {
      window.requestAnimationFrame(toggleVisibility);
    }, { passive: true });
    window.addEventListener('resize', toggleVisibility);
    toggleVisibility();

    button.addEventListener('click', event => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function setupRevealAnimations() {
    const revealElements = document.querySelectorAll('[data-animate]');
    if (!revealElements.length) {
      return;
    }

    const makeVisible = element => {
      element.classList.add('is-visible');
    };

    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(makeVisible);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          makeVisible(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -10%',
    });

    revealElements.forEach(element => observer.observe(element));
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupProgressBar();
    setupBackToTop();
    setupRevealAnimations();
    ensureEmbedResizer();
  });
})();
