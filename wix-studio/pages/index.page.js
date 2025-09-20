import wixWindow from 'wix-window';
import { initNav } from 'public/responsive-nav.js';
import { sendContactEmail } from 'backend/resend.jsw';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let contactBusy = false;

$w.onReady(() => {
  initNav();
  hideStatus();
  toggleSubmitButtons(false);
});

function element(id) {
  try {
    return $w(id);
  } catch (error) {
    return undefined;
  }
}

function valueOf(id) {
  const el = element(id);
  if (!el || typeof el.value === 'undefined') {
    return '';
  }
  return el.value;
}

function numberOf(id) {
  const raw = valueOf(id);
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function checkboxValue(id) {
  const el = element(id);
  if (!el) {
    return false;
  }
  if (typeof el.checked === 'boolean') {
    return el.checked;
  }
  if (Array.isArray(el.value)) {
    return el.value.length > 0;
  }
  return Boolean(el.value);
}

function toggleSubmitButtons(disabled) {
  const form = element('#contactForm');
  if (!form || !Array.isArray(form.children)) {
    return;
  }
  form.children.forEach((child) => {
    if (typeof child.disable === 'function' && typeof child.enable === 'function') {
      if (disabled) {
        if (!child._originalLabel && typeof child.label === 'string') {
          child._originalLabel = child.label;
        }
        child.disable();
        if (typeof child.label === 'string') {
          child.label = 'Wird gesendet…';
        }
      } else {
        child.enable();
        if (typeof child._originalLabel === 'string') {
          child.label = child._originalLabel;
        }
      }
    }
  });
}

function hideStatus() {
  const statusBox = element('#contactStatus');
  if (statusBox) {
    statusBox.hide?.();
    statusBox.collapse?.();
  }
}

function showStatus(type, message) {
  const statusBox = element('#contactStatus');
  const statusText = element('#contactStatusText') || statusBox;
  if (statusText && typeof statusText.text === 'string') {
    statusText.text = message;
  }
  if (statusBox) {
    statusBox.expand?.();
    statusBox.show?.();
    if (typeof statusBox.label === 'string') {
      statusBox.label = message;
    }
    if (typeof statusBox.backgroundColor === 'string') {
      const map = {
        success: '#DCFCE7',
        error: '#FEE2E2',
        info: '#DBEAFE'
      };
      statusBox.backgroundColor = map[type] || '#DBEAFE';
    }
  } else {
    wixWindow.openLightbox?.('Formularstatus', { type, message });
  }
}

function splitName(fullName) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) {
    return { vorname: '', nachname: '' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { vorname: parts[0], nachname: parts[0] };
  }
  return { vorname: parts.shift(), nachname: parts.join(' ') };
}

function collectContactPayload() {
  const payload = {};
  const adresse = valueOf('#adresse');
  if (adresse) {
    payload.adresse = adresse;
  }
  const lfm = numberOf('#lfm');
  if (lfm !== null) {
    payload.lfm = lfm;
  }
  const hoehe = numberOf('#hoehe');
  if (hoehe !== null) {
    payload.hoehe = hoehe;
  }
  const km = numberOf('#km');
  if (km !== null) {
    payload.km_einfach = km;
  }
  const schutzVorhanden = checkboxValue('#schutzVorhanden') || checkboxValue('#optionExpress');
  payload.schutz = schutzVorhanden ? 'ja' : 'nein';
  const schutzClean = numberOf('#schutzReinigung');
  const schutzMont = numberOf('#schutzMontage');
  const schutzDemont = numberOf('#schutzDemontage');
  if (schutzClean !== null) {
    payload.schutz_clean = schutzClean;
  }
  if (schutzMont !== null) {
    payload.schutz_mont = schutzMont;
  }
  if (schutzDemont !== null) {
    payload.schutz_demont = schutzDemont;
  }
  const typField = valueOf('#leistung');
  if (typField) {
    payload.typ = typField;
  }
  return payload;
}

function resetForm() {
  const form = element('#contactForm');
  if (form && typeof form.reset === 'function') {
    form.reset();
    return;
  }
  ['#name', '#email', '#nachricht', '#telefon', '#adresse'].forEach((id) => {
    const el = element(id);
    if (el && typeof el.value !== 'undefined') {
      el.value = '';
    }
  });
  ['#datenschutz', '#schutzVorhanden', '#optionExpress'].forEach((id) => {
    const el = element(id);
    if (el && typeof el.checked === 'boolean') {
      el.checked = false;
    }
  });
}

function validateContactForm() {
  const errors = [];
  const nameEl = element('#name');
  const emailEl = element('#email');
  const phoneEl = element('#telefon');
  const consentEl = element('#datenschutz');

  const fullName = valueOf('#name');
  if (!fullName.trim()) {
    errors.push('Bitte geben Sie Ihren Namen an.');
    nameEl?.updateValidityIndication?.();
  }

  const email = valueOf('#email').trim();
  if (!email) {
    errors.push('Bitte geben Sie Ihre E-Mail-Adresse an.');
  } else if (!emailRegex.test(email)) {
    errors.push('Bitte geben Sie eine gültige E-Mail-Adresse an.');
  }
  emailEl?.updateValidityIndication?.();

  if (phoneEl) {
    const phone = valueOf('#telefon').trim();
    if (phone && phone.length < 6) {
      errors.push('Bitte prüfen Sie die Telefonnummer.');
    }
    phoneEl.updateValidityIndication?.();
  }

  if (consentEl && typeof consentEl.checked === 'boolean' && !consentEl.checked) {
    errors.push('Bitte bestätigen Sie die Datenschutzerklärung.');
  }

  return { errors, fullName, email };
}

async function submitContactForm() {
  if (contactBusy) {
    return;
  }
  contactBusy = true;
  toggleSubmitButtons(true);
  hideStatus();

  try {
    const { errors, fullName, email } = validateContactForm();
    if (errors.length) {
      showStatus('error', errors.join(' '));
      return;
    }

    const phone = valueOf('#telefon').trim();
    const message = valueOf('#nachricht').trim();
    const address = valueOf('#adresse').trim();
    const wunschtermin = valueOf('#wunschtermin').trim();
    const { vorname, nachname } = splitName(fullName);

    const contact = {
      vorname,
      nachname,
      email,
      telefon: phone,
      nachricht: message,
      wunschtermin
    };

    const payload = {
      typ: 'Homepage-Anfrage',
      adresse: address,
      ...collectContactPayload()
    };

    const meta = {
      source: 'homepage-form',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    };

    const response = await sendContactEmail({ contact, payload, meta });

    if (!response?.ok) {
      const errorMessage = response?.error || 'Ihre Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.';
      showStatus('error', errorMessage);
      return;
    }

    resetForm();
    toggleSubmitButtons(false);
    showStatus('success', 'Vielen Dank! Wir melden uns schnellstmöglich bei Ihnen.');
  } catch (error) {
    console.error('Kontaktformular fehlgeschlagen:', error);
    showStatus('error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
  } finally {
    contactBusy = false;
    toggleSubmitButtons(false);
  }
}

export async function contactForm_submit(event) {
  event?.preventDefault?.();
  await submitContactForm();
  return false;
}

const submitButton = element('#contactSubmit');
if (submitButton && typeof submitButton.onClick === 'function') {
  submitButton.onClick(submitContactForm);
}
