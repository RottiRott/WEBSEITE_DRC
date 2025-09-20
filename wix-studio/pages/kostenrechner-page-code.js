import { calculateQuote } from 'backend/calc.jsw';
import { sendCalcSummary } from 'backend/resend.jsw';

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});

let latestResult = null;

$w.onReady(() => {
  const leistung = $w('#leistung');
  const umfang = $w('#umfang');
  const express = $w('#optionExpress');
  const summe = $w('#summe');
  const submit = $w('#calcSubmit');

  const update = async () => {
    const input = collectInput(leistung, umfang, express);

    try {
      latestResult = await calculateQuote(input);
      if (summe) {
        summe.text = currencyFormatter.format(latestResult.total);
      }
    } catch (error) {
      latestResult = null;
      if (summe) {
        summe.text = '–';
      }
      console.error('Berechnung fehlgeschlagen', error);
    }
  };

  [leistung, umfang, express].forEach((component) => {
    if (component && typeof component.onChange === 'function') {
      component.onChange(update);
    }
  });

  if (submit && typeof submit.onClick === 'function') {
    submit.onClick(async () => {
      const input = collectInput(leistung, umfang, express);
      const snapshot = latestResult || (await calculateQuote(input));

      if (!submit.enabled) {
        return;
      }

      submit.label = 'Wird gesendet…';
      submit.disable();

      try {
        const response = await sendCalcSummary({
          ...input,
          total: snapshot.total,
          breakdown: snapshot.breakdown,
        });

        if (response?.ok) {
          submit.label = 'Gesendet!';
        } else {
          submit.label = 'Erneut senden';
          console.error('Kontaktversand fehlgeschlagen', response?.error);
        }
      } catch (error) {
        submit.label = 'Erneut senden';
        console.error('Kontaktversand fehlgeschlagen', error);
      } finally {
        setTimeout(() => {
          submit.label = 'Zusammenfassung senden';
          submit.enable();
        }, 2400);
      }
    });
  }

  update();
});

function collectInput(leistung, umfang, express) {
  return {
    leistung: typeof leistung?.value === 'string' && leistung.value ? leistung.value : 'standard',
    umfang: Number(umfang?.value) || 0,
    express: Boolean(express?.checked),
  };
}
