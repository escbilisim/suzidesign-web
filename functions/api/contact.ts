/// <reference types="@cloudflare/workers-types" />

/**
 * Suzi Design - Contact form endpoint
 * POST /api/contact
 *
 * Cloudflare Pages Function (NOT Astro SSR).
 * Site geri kalanı static; T6 (sıfır runtime JS varsayılan) korunur.
 *
 * Env vars (CF Pages → Settings → Environment variables):
 *   RESEND_API_KEY     — Resend API key (required)
 *   CONTACT_TO         — opsiyonel; default: info@suzidesign.com
 *   CONTACT_FROM       — opsiyonel; default: form@suzidesign.com (Resend verified domain)
 *
 * Spam koruması: honeypot field ("website") boş olmalı.
 * Rate limit: CF default (bu function için spesifik kurulum sonradan eklenir).
 */

interface Env {
  RESEND_API_KEY: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  topic: 'bireysel' | 'toptan' | 'diger';
  message: string;
  website?: string; // honeypot
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const TOPIC_LABEL: Record<string, string> = {
  bireysel: 'Bireysel: kişiye özel dikim',
  toptan:   'Toptan / butik siparişi',
  diger:    'Diğer',
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 1. Parse body (multipart/form-data OR application/json)
  let payload: ContactPayload;
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const form = await request.formData();
      payload = {
        name:    String(form.get('name')    ?? '').trim(),
        email:   String(form.get('email')   ?? '').trim(),
        phone:   String(form.get('phone')   ?? '').trim(),
        topic:   String(form.get('topic')   ?? 'diger').trim() as ContactPayload['topic'],
        message: String(form.get('message') ?? '').trim(),
        website: String(form.get('website') ?? '').trim(),
      };
    }
  } catch {
    return jsonResponse({ ok: false, error: 'Geçersiz istek formatı.' }, 400);
  }

  // 2. Honeypot — bot doldurmuş ise sessizce başarı dön (botu uyarma)
  if (payload.website && payload.website.length > 0) {
    return jsonResponse({ ok: true });
  }

  // 3. Validation
  const errors: string[] = [];
  if (!payload.name    || payload.name.length    < 2)   errors.push('Adınızı yazın.');
  if (!payload.email   || !isEmail(payload.email))      errors.push('Geçerli bir e-posta adresi yazın.');
  if (!payload.topic   || !TOPIC_LABEL[payload.topic])  errors.push('Konu seçin.');
  if (!payload.message || payload.message.length < 10)  errors.push('Mesajınızı biraz daha detaylandırın (en az 10 karakter).');
  if (payload.message  && payload.message.length > 5000) errors.push('Mesaj çok uzun (maks 5000 karakter).');

  if (errors.length) {
    return jsonResponse({ ok: false, error: errors.join(' ') }, 400);
  }

  // 4. Env check
  if (!env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY missing');
    return jsonResponse({ ok: false, error: 'Sunucu yapılandırma hatası. Lütfen daha sonra tekrar deneyin.' }, 500);
  }

  const to   = env.CONTACT_TO   ?? 'info@suzidesign.com';
  const from = env.CONTACT_FROM ?? 'form@suzidesign.com';

  // 5. Compose mail
  const topicLabel = TOPIC_LABEL[payload.topic];
  const subject    = `[Suzi Design] ${topicLabel} - ${payload.name}`;

  const text = [
    `Yeni iletişim formu mesajı`,
    ``,
    `Konu:    ${topicLabel}`,
    `Ad:      ${payload.name}`,
    `E-posta: ${payload.email}`,
    payload.phone ? `Telefon: ${payload.phone}` : null,
    ``,
    `Mesaj:`,
    payload.message,
    ``,
    `---`,
    `User-Agent: ${request.headers.get('user-agent') ?? '-'}`,
    `IP (CF):    ${request.headers.get('cf-connecting-ip') ?? '-'}`,
    `Country:    ${request.headers.get('cf-ipcountry') ?? '-'}`,
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px;">
      <h2 style="color: #0A0A0A; border-bottom: 2px solid #C9A87C; padding-bottom: 8px;">Yeni iletişim formu mesajı</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px 6px 0; color: #8B6F3F; font-weight: 600; vertical-align: top;">Konu</td><td style="padding: 6px 0;">${escapeHtml(topicLabel)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #8B6F3F; font-weight: 600; vertical-align: top;">Ad</td><td style="padding: 6px 0;">${escapeHtml(payload.name)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #8B6F3F; font-weight: 600; vertical-align: top;">E-posta</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a></td></tr>
        ${payload.phone ? `<tr><td style="padding: 6px 12px 6px 0; color: #8B6F3F; font-weight: 600; vertical-align: top;">Telefon</td><td style="padding: 6px 0;">${escapeHtml(payload.phone)}</td></tr>` : ''}
      </table>
      <h3 style="color: #0A0A0A; margin-top: 24px;">Mesaj</h3>
      <div style="white-space: pre-wrap; background: #F5F1EA; padding: 16px; border-radius: 4px; line-height: 1.6;">${escapeHtml(payload.message)}</div>
      <p style="color: #888; font-size: 12px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
        IP: ${escapeHtml(request.headers.get('cf-connecting-ip') ?? '-')}
        &middot; Country: ${escapeHtml(request.headers.get('cf-ipcountry') ?? '-')}
      </p>
    </div>
  `.trim();

  // 6. Send via Resend
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from: `Suzi Design Form <${from}>`,
        to:   [to],
        reply_to: payload.email,
        subject,
        text,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('[contact] Resend error', resendRes.status, errBody);
      return jsonResponse({ ok: false, error: 'Mesaj gönderilemedi. Lütfen birazdan tekrar deneyin.' }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error('[contact] Network error', err);
    return jsonResponse({ ok: false, error: 'Bağlantı hatası. Lütfen tekrar deneyin.' }, 502);
  }
};

// Sadece onRequestPost export edildi.
// CF Pages Functions, GET/PUT/PATCH/DELETE için otomatik 405 döner.
