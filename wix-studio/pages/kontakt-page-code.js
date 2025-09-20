import { sendContactEmail } from 'backend/resend.jsw';

$w.onReady(() => {
  const form = $w('#contactForm');
  if (!form) {
    return;
  }

  form.onWixFormSubmitted(async (event) => {
    try {
      const result = await sendContactEmail(event.fields);
      if (!result?.ok) {
        console.error('Kontaktformular konnte nicht versendet werden', result?.error);
      }
    } catch (error) {
      console.error('Kontaktformular konnte nicht versendet werden', error);
    }
  });
});
