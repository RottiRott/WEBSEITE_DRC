// backend/http-functions.js
import { ok, badRequest, serverError } from 'wix-http-functions';

function json(body, statusFn = ok) {
  return statusFn({ headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
}

// GET /_functions/testadminemail?do=ping
export function get_testadminemail(request) {
  const isPing = String(request.query?.do || '').toLowerCase() === 'ping';
  return json({ ok: true, pong: isPing, ts: Date.now() }, ok);
}

// POST /_functions/echo
export async function post_echo(request) {
  try {
    const body = await request.body.json();
    return json({ ok: true, youSent: body }, ok);
  } catch (e) {
    return json({ ok: false, error: 'BAD_REQUEST', detail: String(e) }, badRequest);
  }
}

// POST /_functions/webhookbridge
export async function post_webhookbridge(request) {
  try {
    const body = await request.body.json();
    const ip = request?.context?.ip || request?.headers?.['x-real-ip'] || '';
    const ua = request?.headers?.['user-agent'] || '';

    let mod;
    try {
      mod = await import('backend/processor.jsw');
    } catch (impErr) {
      return json({ ok: false, error: 'IMPORT_FAILED', detail: String(impErr) }, serverError);
    }
    if (!mod?.handleIncoming) {
      return json({ ok: false, error: 'MISSING_HANDLE_INCOMING' }, badRequest);
    }

    const res = await mod.handleIncoming({ ...body, ip, userAgent: ua });
    return json(res, res?.ok ? ok : badRequest);
  } catch (e) {
    return json({ ok: false, error: 'SERVER_ERROR', detail: String(e) }, serverError);
  }
}

// POST /_functions/mailtest  -> sendet NUR eine Testmail (ohne DB/CRM)
export async function post_mailtest(request) {
  try {
    const { mailAdmin } = await import('backend/resend.jsw');
    const r = await mailAdmin({
      contact: { vorname: 'Mail', nachname: 'Test', email: 'test@example.com', telefon: '+4900000', wunschtermin: '' },
      payload: { typ: 'Test', endpreis: 0 },
      meta: { source: 'mailtest', version: '1.0', timestamp: new Date().toISOString() }
    });
    return json({ ok: !!r?.ok, detail: r }, r?.ok ? ok : badRequest);
  } catch (e) {
    return json({ ok: false, error: String(e) }, serverError);
  }
}
