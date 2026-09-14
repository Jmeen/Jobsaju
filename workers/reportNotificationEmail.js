import { encodeSecurePayload } from './crypto.js';

const DEFAULT_SERVICE_URL = 'https://jobsaju.kr';
const DEFAULT_FROM_EMAIL = '직장인 이직사주 <admin@jobsaju.kr>';

function resolveServiceUrl(env, origin) {
  return String(env.PUBLIC_SERVICE_URL || origin || DEFAULT_SERVICE_URL).replace(/\/$/, '');
}

async function readErrorDetail(response) {
  const detail = await response.text().catch(() => '');
  return detail.replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function sendWithResend(env, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'jobsaju-worker/1.0',
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(`Resend email failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
}

async function sendWithWebhook(env, message) {
  const response = await fetch(env.EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new Error(`Email webhook failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
}

/** 리포트가 처음 완성된 직후 사용자에게 열람 링크를 발송한다. */
export async function sendReportNotificationEmail(env, { email, unlockToken, sajuData, origin }) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { sent: false, provider: null, reason: 'invalid-email' };
  }

  const payload = encodeSecurePayload({ token: unlockToken, email: normalizedEmail });
  if (!payload) throw new Error('Report link payload could not be encoded');

  const reportUrl = `${resolveServiceUrl(env, origin)}/?p=${encodeURIComponent(payload)}`;
  const title = sajuData?.ilgan
    ? `[직장인 이직사주] ${sajuData.ilgan} 일간 맞춤 커리어 리포트가 완성되었습니다`
    : '[직장인 이직사주] 요청하신 커리어 리포트가 완성되었습니다';
  const text = [
    '직장인 이직사주 리포트가 완성되었습니다.',
    '아래 링크에서 전체 리포트를 확인할 수 있습니다.',
    reportUrl,
  ].join('\n\n');
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">
      <h2 style="color: #6d28d9; margin-bottom: 12px;">직장인 이직사주 리포트 완성</h2>
      <p>기다려주셔서 감사합니다. 요청하신 커리어 리포트가 완성되었습니다.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 10px; font-weight: bold; color: #334155;">아래 링크에서 언제든 전체 리포트를 확인할 수 있습니다.</p>
        <a href="${reportUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">내 리포트 확인하기 →</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">본 메일은 리포트 생성 시 입력하신 이메일 주소로 발송된 안내 메일입니다.</p>
    </div>
  `;

  if (env.RESEND_API_KEY) {
    await sendWithResend(env, {
      from: env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL,
      to: [normalizedEmail],
      subject: title,
      html,
      text,
    });
    return { sent: true, provider: 'resend' };
  }

  if (env.EMAIL_WEBHOOK_URL) {
    await sendWithWebhook(env, {
      email: normalizedEmail,
      unlockToken,
      reportUrl,
      sajuData,
      type: 'report-completed',
    });
    return { sent: true, provider: 'webhook' };
  }

  return { sent: false, provider: null, reason: 'not-configured' };
}
