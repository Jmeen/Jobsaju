import { isReportExpired, resolveReportRetention } from './reportRetention.js';

const EMAIL_HISTORY_LIMIT = 20;

export function buildReportLabel(careerContext) {
  const parts = [
    careerContext?.current_job || careerContext?.job_title,
    careerContext?.career_goal || careerContext?.goal,
  ].filter(Boolean);
  return parts.length ? parts.join(' → ') : 'AI 커리어 리포트';
}

/** 리포트 원본과 복구 색인을 KV에 같은 절대 만료일로 보관한다. */
export async function archivePaidReport({
  kv,
  paymentId,
  responsePayload,
  careerContext,
  birth,
  sajuData = null,
  purchasedAt = new Date(),
  retention: suppliedRetention = null,
}) {
  if (!kv) return;
  const token = String(paymentId || '').trim();
  if (!token) return;

  const retention = suppliedRetention || await resolveReportRetention(kv, token, purchasedAt);
  if (isReportExpired(retention)) throw new Error('Report retention has expired');
  const createdAt = retention.purchasedAt;
  const expirationOptions = { expiration: retention.expiration };
  const userContext = {
    ...careerContext,
    current_job: careerContext?.current_job || careerContext?.job_title || '',
    desired_answer: careerContext?.desired_answer || careerContext?.worry_text || '',
    birth_data: birth || null,
  };
  let storedSajuData = sajuData;
  if (!storedSajuData) {
    try {
      const existingMeta = JSON.parse(await kv.get(`meta:${token}`) || '{}');
      storedSajuData = existingMeta.saju_data || null;
    } catch {
      storedSajuData = null;
    }
  }
  await kv.put(`report:copy-v2:${token}`, responsePayload, expirationOptions);
  await kv.put(`meta:${token}`, JSON.stringify({
    user_context: userContext,
    saju_data: storedSajuData,
    purchased_at: retention.purchasedAt,
    expires_at: retention.expiresAt,
  }), expirationOptions);

  const email = String(careerContext?.email || '').toLowerCase().trim();
  if (!email || !email.includes('@')) return;
  const emailKey = `email:${email}`;
  const rawHistory = await kv.get(emailKey);
  let history = [];
  try {
    const parsed = rawHistory ? JSON.parse(rawHistory) : [];
    history = Array.isArray(parsed) ? parsed : [{ token: rawHistory, createdAt: null, label: null }];
  } catch {
    history = rawHistory ? [{ token: rawHistory, createdAt: null, label: null }] : [];
  }
  const now = Date.now();
  const withoutCurrent = history.filter((entry) => (
    entry?.token !== token
    && (!entry?.expiresAt || Date.parse(entry.expiresAt) > now)
  ));
  withoutCurrent.unshift({
    token,
    createdAt,
    expiresAt: retention.expiresAt,
    label: buildReportLabel(careerContext),
  });
  const nextHistory = withoutCurrent.slice(0, EMAIL_HISTORY_LIMIT);
  const latestExpiration = nextHistory.reduce((latest, entry) => {
    const seconds = Math.ceil(Date.parse(entry?.expiresAt || '') / 1000);
    return Number.isFinite(seconds) ? Math.max(latest, seconds) : latest;
  }, retention.expiration);
  await kv.put(emailKey, JSON.stringify(nextHistory), { expiration: latestExpiration });
  return retention;
}
