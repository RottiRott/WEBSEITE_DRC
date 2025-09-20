(function () {
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shouldReduceMotion = () => reduceMotionQuery.matches;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const heroSection = document.querySelector('[data-hero-parallax]');
  let detachHeroParallax = null;

  const setupHeroParallax = () => {
    if (!heroSection || shouldReduceMotion()) {
      return null;
    }

    const media = heroSection.querySelector('[data-hero-parallax-media]');
    const content = heroSection.querySelector('[data-hero-parallax-content]');
    const overlay = heroSection.querySelector('[data-hero-overlay]');

    if (!media || !content) {
      return null;
    }

    let heroHeight = heroSection.getBoundingClientRect().height || heroSection.offsetHeight || 1;
    let maxMediaShift = 0;
    let maxContentShift = 0;
    let rafId = null;

    const updateMetrics = () => {
      const rect = heroSection.getBoundingClientRect();
      heroHeight = rect.height || heroSection.offsetHeight || 1;
      maxMediaShift = Math.min(heroHeight * 0.28, 140);
      maxContentShift = Math.min(heroHeight * 0.42, 160);
    };

    const applyTransforms = () => {
      rafId = null;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const heroTop = heroSection.getBoundingClientRect().top + scrollY;
      const relativeScroll = clamp(scrollY - heroTop, 0, heroHeight);
      const progress = heroHeight > 0 ? relativeScroll / heroHeight : 0;
      const eased = progress * (2 - progress);

      media.style.setProperty('--hero-media-offset', `${(maxMediaShift * eased).toFixed(2)}px`);
      content.style.setProperty('--hero-content-offset', `${(-maxContentShift * eased).toFixed(2)}px`);

      if (overlay) {
        const overlayValue = Math.max(0.48, 0.92 - eased * 0.35);
        overlay.style.setProperty('--hero-overlay-opacity', overlayValue.toFixed(3));
      }
    };

    const requestUpdate = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(applyTransforms);
    };

    const handleScroll = () => requestUpdate();
    const handleResize = () => {
      updateMetrics();
      requestUpdate();
    };

    updateMetrics();
    applyTransforms();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }

      media.style.removeProperty('--hero-media-offset');
      content.style.removeProperty('--hero-content-offset');

      if (overlay) {
        overlay.style.removeProperty('--hero-overlay-opacity');
      }
    };
  };

  const refreshHeroParallax = () => {
    if (detachHeroParallax) {
      detachHeroParallax();
      detachHeroParallax = null;
    }

    if (!shouldReduceMotion()) {
      detachHeroParallax = setupHeroParallax();
    }
  };

  if (heroSection) {
    refreshHeroParallax();
    reduceMotionQuery.addEventListener('change', refreshHeroParallax);
  }

  const animatedElements = Array.from(document.querySelectorAll('[data-scroll-animate]'));
  let detachScrollAnimations = null;

  const setupScrollAnimations = () => {
    if (!animatedElements.length || shouldReduceMotion()) {
      document.body.removeAttribute('data-scroll-animations');
      return null;
    }

    document.body.setAttribute('data-scroll-animations', 'enabled');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-animated');
            return;
          }

          if (entry.boundingClientRect.top > (window.innerHeight || 0)) {
            entry.target.classList.remove('is-animated');
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -12% 0px'
      }
    );

    animatedElements.forEach((element) => {
      const delay = element.dataset.scrollDelay;
      if (delay) {
        const parsedDelay = Number.parseFloat(delay);
        if (Number.isFinite(parsedDelay)) {
          element.style.setProperty('--scroll-animate-delay', `${parsedDelay}ms`);
        }
      }

      const staggerSelector = element.dataset.scrollAnimateStagger;
      if (staggerSelector) {
        const children = element.querySelectorAll(staggerSelector);
        children.forEach((child, index) => {
          child.style.setProperty('--scroll-animate-delay', `${index * 90}ms`);
        });
      }

      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      animatedElements.forEach((element) => element.classList.remove('is-animated'));
      document.body.removeAttribute('data-scroll-animations');
    };
  };

  detachScrollAnimations = setupScrollAnimations();

  if (animatedElements.length) {
    reduceMotionQuery.addEventListener('change', () => {
      if (detachScrollAnimations) {
        detachScrollAnimations();
        detachScrollAnimations = null;
      }

      detachScrollAnimations = setupScrollAnimations();
    });
  }
})();
