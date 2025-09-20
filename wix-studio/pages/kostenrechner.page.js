import wixWindow from 'wix-window';
import { initNav } from 'public/responsive-nav.js';
import { calculateQuote } from 'backend/calc.jsw';
import { sendCalcSummary } from 'backend/resend.jsw';

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
let currentQuote = null;
let calcBusy = false;

$w.onReady(async () => {
  initNav();
  hideCalcStatus();
  await updateQuote();
  attachListeners();
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

function gatherCalculatorInput() {
  const typ = valueOf('#leistung') || valueOf('#typ') || 'Erstreinigung';
  const lfm = numberOf('#umfang');
  const lfmFallback = numberOf('#lfm');
  const hoehe = numberOf('#hoehe');
  const km = numberOf('#km');
  const schutz = checkboxValue('#schutzVorhanden') || checkboxValue('#optionExpress');
  const schutzClean = numberOf('#schutzReinigung');
  const schutzMont = numberOf('#schutzMontage');
  const schutzDemont = numberOf('#schutzDemontage');

  return {
    typ,
    lfm: lfm !== null ? lfm : lfmFallback,
    hoehe: hoehe ?? 0,
    km,
    schutz,
    schutz_clean: schutzClean ?? 0,
    schutz_mont: schutzMont ?? 0,
    schutz_demont: schutzDemont ?? 0
  };
}

function formatCurrency(value) {
  try {
    return euro.format(Number(value));
  } catch (error) {
    return `${Number(value).toFixed(2)} €`.replace('.', ',');
  }
}

async function updateQuote() {
  try {
    const input = gatherCalculatorInput();
    const quote = await calculateQuote({
      typ: input.typ,
      lfm: input.lfm ?? 0,
      hoehe: input.hoehe ?? 0,
      km: input.km ?? 0,
      schutz: input.schutz,
      schutz_clean: input.schutz_clean,
      schutz_mont: input.schutz_mont,
      schutz_demont: input.schutz_demont
    });

    currentQuote = quote;
    const totalText = formatCurrency(quote.total || 0);

    const sumField = element('#summe') || element('#endpreis');
    if (sumField && typeof sumField.text === 'string') {
      sumField.text = totalText;
    }
    const mobileSum = element('#endpreis_mobile');
    if (mobileSum && typeof mobileSum.text === 'string') {
      mobileSum.text = totalText;
    }
    const minNote = element('#minnote');
    if (minNote) {
      if (quote?.breakdown?.minimumApplied) {
        minNote.show?.();
        minNote.expand?.();
      } else {
        minNote.hide?.();
        minNote.collapse?.();
      }
    }
  } catch (error) {
    console.error('Berechnung fehlgeschlagen:', error);
    showCalcStatus('error', 'Die Kalkulation konnte nicht aktualisiert werden.');
  }
}

function attachListeners() {
  const ids = [
    '#leistung',
    '#typ',
    '#umfang',
    '#lfm',
    '#hoehe',
    '#km',
    '#schutzVorhanden',
    '#optionExpress',
    '#schutzReinigung',
    '#schutzMontage',
    '#schutzDemontage'
  ];

  ids.forEach((id) => {
    const el = element(id);
    if (!el) {
      return;
    }
    if (typeof el.onChange === 'function') {
      el.onChange(() => {
        updateQuote();
      });
    }
    if (typeof el.onInput === 'function') {
      el.onInput(() => {
        updateQuote();
      });
    }
  });

  const submit = element('#calcSubmit');
  if (submit && typeof submit.onClick === 'function') {
    submit.onClick(handleCalcSubmit);
  }
}

function hideCalcStatus() {
  const statusBox = element('#calcStatus');
  if (statusBox) {
    statusBox.hide?.();
    statusBox.collapse?.();
  }
}

function showCalcStatus(type, message) {
  const statusBox = element('#calcStatus');
  const statusText = element('#calcStatusText') || statusBox;
  if (statusText && typeof statusText.text === 'string') {
    statusText.text = message;
  }
  if (statusBox) {
    statusBox.expand?.();
    statusBox.show?.();
    if (typeof statusBox.backgroundColor === 'string') {
      const map = {
        success: '#DCFCE7',
        error: '#FEE2E2',
        info: '#DBEAFE'
      };
      statusBox.backgroundColor = map[type] || '#DBEAFE';
    }
  } else {
    wixWindow.openLightbox?.('Rechnerstatus', { type, message });
  }
}

function disableCalcSubmit(disabled) {
  const submit = element('#calcSubmit');
  if (!submit || typeof submit.disable !== 'function') {
    return;
  }
  if (disabled) {
    submit.disable();
    if (!submit._originalLabel && typeof submit.label === 'string') {
      submit._originalLabel = submit.label;
    }
    if (typeof submit.label === 'string') {
      submit.label = 'Wird gesendet…';
    }
  } else {
    submit.enable();
    if (typeof submit._originalLabel === 'string') {
      submit.label = submit._originalLabel;
    }
  }
}

function collectSummaryPayload() {
  const address = valueOf('#adresse').trim();
  const input = gatherCalculatorInput();
  const payload = {
    adresse: address,
    typ: input.typ,
    lfm: input.lfm ?? 0,
    hoehe: input.hoehe ?? 0,
    km_einfach: input.km ?? 0,
    schutz: input.schutz ? 'ja' : 'nein',
    schutz_clean: input.schutz_clean ?? 0,
    schutz_mont: input.schutz_mont ?? 0,
    schutz_demont: input.schutz_demont ?? 0
  };

  if (currentQuote) {
    payload.endpreis = currentQuote.total;
    const km = input.km ?? 0;
    const baseRate = km > 0 ? currentQuote.breakdown?.travel / (km * 2) : 1;
    payload.eur_km = Number.isFinite(baseRate) ? Number(baseRate.toFixed(2)) : 1;
    payload.setup = 40;
    payload.ladder = 40;
    payload.steiger = 340;
    payload.minpreis = 125;
    payload.ts = new Date().toISOString();
  }

  return payload;
}

function collectContact() {
  const first = valueOf('#inFirst').trim();
  const last = valueOf('#inLast').trim();
  const email = valueOf('#inEmail').trim();
  const telefon = valueOf('#inPhone').trim();
  const nachricht = valueOf('#inMsg').trim();
  const wunschtermin = valueOf('#dpWish').trim();
  return { vorname: first, nachname: last, email, telefon, nachricht, wunschtermin };
}

function validateSummary(contact) {
  const errors = [];
  if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push('Bitte geben Sie eine gültige E-Mail-Adresse an.');
  }
  if (!contact.vorname) {
    errors.push('Bitte geben Sie Ihren Vornamen an.');
  }
  if (!contact.nachname) {
    errors.push('Bitte geben Sie Ihren Nachnamen an.');
  }
  const consent = element('#cbConsent');
  if (consent && typeof consent.checked === 'boolean' && !consent.checked) {
    errors.push('Bitte bestätigen Sie die Datenschutzerklärung.');
  }
  return errors;
}

async function handleCalcSubmit() {
  if (calcBusy) {
    return;
  }
  calcBusy = true;
  disableCalcSubmit(true);
  hideCalcStatus();

  try {
    if (!currentQuote) {
      await updateQuote();
    }

    const contact = collectContact();
    const errors = validateSummary(contact);
    if (errors.length) {
      showCalcStatus('error', errors.join(' '));
      return;
    }

    const payload = collectSummaryPayload();
    const meta = {
      source: 'preisrechner-wix',
      version: '1.2.0',
      timestamp: new Date().toISOString()
    };

    const response = await sendCalcSummary({ contact, payload, meta });
    if (!response?.ok) {
      const message = response?.error || 'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.';
      showCalcStatus('error', message);
      return;
    }

    showCalcStatus('success', 'Vielen Dank! Wir haben Ihre Kalkulation erhalten.');
  } catch (error) {
    console.error('Kalkulationsanfrage fehlgeschlagen:', error);
    showCalcStatus('error', 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
  } finally {
    calcBusy = false;
    disableCalcSubmit(false);
  }
}
