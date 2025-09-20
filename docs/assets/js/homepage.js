(function () {
  const { utils = {} } = window.DRC || {};

  function setupHeroParallax() {
    const rootElement = document.documentElement;
    const heroSection = document.querySelector('[data-parallax="hero"]');

    if (!rootElement || !heroSection) {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let heroTop = heroSection.offsetTop;
    let heroHeight = heroSection.offsetHeight;
    let targetOffset = 0;
    let currentOffset = 0;
    let rafId = null;

    const setOffset = value => {
      rootElement.style.setProperty('--hero-parallax-offset', `${value.toFixed(2)}px`);
    };

    const cancelAnimation = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const animateOffset = () => {
      const difference = targetOffset - currentOffset;

      if (Math.abs(difference) <= 0.5) {
        currentOffset = targetOffset;
        setOffset(currentOffset);
        rafId = null;
        return;
      }

      currentOffset += difference * 0.15;
      setOffset(currentOffset);
      rafId = requestAnimationFrame(animateOffset);
    };

    const scheduleAnimation = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(animateOffset);
      }
    };

    const updateTargetOffset = () => {
      if (prefersReducedMotion.matches) {
        cancelAnimation();
        targetOffset = 0;
        currentOffset = 0;
        setOffset(0);
        return;
      }

      const scrollPosition = window.scrollY || window.pageYOffset || 0;
      const relativeScroll = utils.clamp
        ? utils.clamp(scrollPosition - heroTop, 0, heroHeight)
        : Math.max(Math.min(scrollPosition - heroTop, heroHeight), 0);
      targetOffset = relativeScroll;
      scheduleAnimation();
    };

    const updateMetrics = () => {
      heroTop = heroSection.offsetTop;
      heroHeight = heroSection.offsetHeight;
      updateTargetOffset();
    };

    updateMetrics();

    window.addEventListener('scroll', updateTargetOffset, { passive: true });
    window.addEventListener('resize', updateMetrics);

    if (typeof prefersReducedMotion.addEventListener === 'function') {
      prefersReducedMotion.addEventListener('change', updateTargetOffset);
    } else if (typeof prefersReducedMotion.addListener === 'function') {
      prefersReducedMotion.addListener(updateTargetOffset);
    }
  }

  function parseJsonScript(id) {
    const element = document.getElementById(id);
    if (!element) {
      return null;
    }

    try {
      return JSON.parse(element.textContent || 'null');
    } catch (error) {
      console.error(`Konnte JSON aus #${id} nicht lesen:`, error);
      return null;
    }
  }

  function sanitizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function parseReviewDate(value) {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    const replaced = String(value)
      .replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3-$2-$1')
      .replace(/\s*([A-Za-z]{3})\.?\s*(\d{4})/, ' $1 $2');

    const fallback = new Date(replaced);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback;
    }

    return null;
  }

  function formatDateValue(date, original) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return typeof original === 'string' ? original : '';
    }

    try {
      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(date);
    } catch (error) {
      return date.toISOString().split('T')[0];
    }
  }

  function clampRating(value) {
    const numeric = typeof value === 'number' ? value : Number.parseFloat(value);
    if (!Number.isFinite(numeric)) {
      return 5;
    }
    return Math.min(Math.max(numeric, 0), 5);
  }

  function prepareReviews() {
    const raw = parseJsonScript('reviews-data');
    if (!Array.isArray(raw)) {
      return [];
    }

    const normalized = raw.map((item, index) => {
      const safeItem = item || {};
      const name = sanitizeString(safeItem.name) || 'MyHammer-Kunde';
      const text = sanitizeString(safeItem.text);
      const city = sanitizeString(safeItem.city);
      const source = sanitizeString(safeItem.source);
      const link = sanitizeString(safeItem.link);
      const parsedDate = parseReviewDate(safeItem.date);

      return {
        id: safeItem.id || `static-review-${index}`,
        name,
        text,
        rating: clampRating(safeItem.rating),
        city,
        source,
        link,
        highlighted: Boolean(safeItem.highlighted),
        verified: Boolean(safeItem.verified),
        timestamp: parsedDate ? parsedDate.getTime() : null,
        formattedDate: formatDateValue(parsedDate, safeItem.date),
      };
    });

    return normalized
      .filter(review => review.text.length > 0)
      .sort((a, b) => {
        if (a.highlighted !== b.highlighted) {
          return a.highlighted ? -1 : 1;
        }
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        if (a.timestamp) {
          return -1;
        }
        if (b.timestamp) {
          return 1;
        }
        return a.name.localeCompare(b.name, 'de');
      });
  }

  const REVIEWS = prepareReviews();

  window.reviewsCarousel = function reviewsCarousel() {
    return {
      reviews: [],
      activeIndex: 0,
      ready: false,
      error: '',
      autoRotateId: null,
      init() {
        this.stopAutoRotate();
        this.error = '';
        this.activeIndex = 0;

        if (!REVIEWS.length) {
          this.ready = false;
          this.error = 'Noch keine Kundenstimmen verfügbar.';
          return;
        }

        this.reviews = REVIEWS;
        this.ready = true;
        this.startAutoRotate();
      },
      next() {
        if (!this.reviews.length) {
          return;
        }
        this.activeIndex = (this.activeIndex + 1) % this.reviews.length;
        this.startAutoRotate();
      },
      previous() {
        if (!this.reviews.length) {
          return;
        }
        this.activeIndex = (this.activeIndex - 1 + this.reviews.length) % this.reviews.length;
        this.startAutoRotate();
      },
      goTo(index) {
        if (typeof index !== 'number' || index < 0 || index >= this.reviews.length) {
          return;
        }
        this.activeIndex = index;
        this.startAutoRotate();
      },
      startAutoRotate() {
        this.stopAutoRotate();
        if (this.reviews.length <= 1) {
          return;
        }
        this.autoRotateId = setInterval(() => {
          if (document.hidden) {
            return;
          }
          this.activeIndex = (this.activeIndex + 1) % this.reviews.length;
        }, 9000);
      },
      stopAutoRotate() {
        if (this.autoRotateId) {
          clearInterval(this.autoRotateId);
          this.autoRotateId = null;
        }
      },
      starIcon(star, rating) {
        if (rating >= star) {
          return 'star';
        }
        if (rating >= star - 0.5) {
          return 'star_half';
        }
        return 'grade';
      },
      formatMeta(review) {
        const parts = [];
        if (review.city) {
          parts.push(review.city);
        }
        if (review.formattedDate) {
          parts.push(review.formattedDate);
        }
        return parts.join(' • ');
      },
    };
  };

  function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) {
      return;
    }

    form.setAttribute('novalidate', 'novalidate');

    const firstNameInput = form.querySelector('#first-name');
    const lastNameInput = form.querySelector('#last-name');
    const emailInput = form.querySelector('#email');
    const phoneInput = form.querySelector('#phone');
    const addressInput = form.querySelector('#address');
    const heightInput = form.querySelector('#gutter-height');
    const lengthInput = form.querySelector('#gutter-length');
    const consentInput = form.querySelector('#consent');
    const reasonInputs = Array.from(form.querySelectorAll('input[name="reasons"]'));
    const guardInputs = Array.from(form.querySelectorAll('input[name="guards"]'));
    const submitButton = form.querySelector('button[type="submit"]');
    const errorContainer = document.getElementById('contact-feedback');
    const successContainer = document.getElementById('contact-success');

    if (
      !firstNameInput ||
      !lastNameInput ||
      !emailInput ||
      !phoneInput ||
      !addressInput ||
      !heightInput ||
      !lengthInput ||
      !consentInput ||
      !submitButton ||
      !errorContainer ||
      !successContainer
    ) {
      return;
    }

    const parseNumberInput = input => {
      if (!input) {
        return null;
      }
      const rawValue = input.value.replace(',', '.').trim();
      if (!rawValue) {
        return null;
      }
      const numericValue = Number.parseFloat(rawValue);
      return Number.isFinite(numericValue) ? numericValue : null;
    };

    const directUrls = [
      '/_functions/webhookbridge',
      '/_functions-dev/webhookbridge',
      'https://www.dachrinnecheck.de/_functions/webhookbridge',
    ];

    const resetMessages = () => {
      errorContainer.classList.add('hidden');
      errorContainer.textContent = '';
      successContainer.classList.add('hidden');
      successContainer.textContent = '';
    };

    const showErrors = messages => {
      if (!messages.length) {
        return;
      }
      const list = document.createElement('ul');
      list.className = 'list-disc list-inside space-y-1 text-left';
      messages.forEach(message => {
        const item = document.createElement('li');
        item.textContent = message;
        list.appendChild(item);
      });
      errorContainer.innerHTML = '';
      errorContainer.appendChild(list);
      errorContainer.classList.remove('hidden');
      errorContainer.focus({ preventScroll: false });
      if (typeof window.__postHeight === 'function') {
        window.__postHeight();
      }
    };

    const showSuccess = message => {
      successContainer.textContent = message;
      successContainer.classList.remove('hidden');
      if (typeof window.__postHeight === 'function') {
        window.__postHeight();
      }
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      resetMessages();

      const errors = [];
      const firstName = firstNameInput.value.trim();
      const lastName = lastNameInput.value.trim();
      const emailValue = emailInput.value.trim();
      const phoneValue = phoneInput.value.trim();
      const addressValue = addressInput.value.trim();
      const heightValue = parseNumberInput(heightInput);
      const lengthValue = parseNumberInput(lengthInput);

      if (!firstName) {
        errors.push('Bitte geben Sie Ihren Vornamen an.');
      }

      if (!lastName) {
        errors.push('Bitte geben Sie Ihren Nachnamen an.');
      }

      if (!emailValue) {
        errors.push('Bitte geben Sie Ihre E-Mail-Adresse an.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        errors.push('Bitte geben Sie eine gültige E-Mail-Adresse an.');
      }

      if (!phoneValue) {
        errors.push('Bitte geben Sie eine Telefonnummer an.');
      } else if (!/^\+?[0-9 ()\-\/]{6,20}$/.test(phoneValue)) {
        errors.push('Bitte prüfen Sie die Telefonnummer.');
      }

      if (!addressValue) {
        errors.push('Bitte geben Sie eine Adresse an.');
      }

      if (heightValue === null || heightValue <= 0) {
        errors.push('Bitte geben Sie die geschätzte Höhe der Dachrinne an.');
      }

      if (lengthValue === null || lengthValue <= 0) {
        errors.push('Bitte geben Sie die geschätzte Länge der Dachrinne an.');
      }

      if (!consentInput.checked) {
        errors.push('Bitte bestätigen Sie die Datenschutzerklärung.');
      }

      if (errors.length) {
        showErrors(errors);
        return;
      }

      const selectedReasons = reasonInputs.filter(input => input.checked).map(input => input.value);
      const selectedGuards = guardInputs.filter(input => input.checked).map(input => input.value);
      const messageParts = [];
      if (selectedReasons.length) {
        messageParts.push(`Grund für die Reinigung: ${selectedReasons.join(', ')}`);
      }
      if (selectedGuards.length) {
        messageParts.push(`Dachrinnenschutz: ${selectedGuards.join(', ')}`);
      }
      const messageValue = messageParts.join(' | ');

      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.setAttribute('aria-disabled', 'true');
      submitButton.classList.add('opacity-60', 'cursor-not-allowed');
      submitButton.textContent = 'Wird gesendet…';

      const contact = {
        vorname: firstName,
        nachname: lastName,
        email: emailValue,
        telefon: phoneValue,
        nachricht: messageValue,
        wunschtermin: '',
      };

      const payload = {
        typ: 'Homepage-Anfrage',
        adresse: addressValue,
        hoehe: heightValue,
        lfm: lengthValue,
        gruende: selectedReasons,
        schutzOptionen: selectedGuards,
      };

      const requestBody = {
        meta: {
          source: 'homepage-form',
          version: '2.1.0',
          timestamp: new Date().toISOString(),
        },
        contact,
        payload,
        consent: consentInput.checked ? 'ja' : 'nein',
      };

      try {
        const preferBridge = typeof utils.isInIframe === 'function' ? utils.isInIframe() : false;
        const response = await utils.submitWebhook(requestBody, {
          directUrls,
          preferBridge,
        });

        if (!response.ok) {
          throw new Error(response.text || `Status ${response.status}`);
        }

        form.reset();
        showSuccess('Vielen Dank für Ihre Anfrage! Wir melden uns schnellstmöglich bei Ihnen.');
        window.scrollTo({ top: form.offsetTop - 120, behavior: 'smooth' });
      } catch (error) {
        console.error('Fehler beim Senden des Formulars:', error);
        showErrors(['Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.']);
      } finally {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-disabled');
        submitButton.classList.remove('opacity-60', 'cursor-not-allowed');
        submitButton.textContent = originalButtonText;
        if (typeof window.__postHeight === 'function') {
          window.__postHeight();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupHeroParallax();
    setupContactForm();
  });
})();
