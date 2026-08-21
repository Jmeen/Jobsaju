const REPORT_TTL_SECONDS = 60 * 60 * 24 * 90;
const EMAIL_HISTORY_LIMIT = 20;

export function buildReportLabel(careerContext) {
  const parts = [
    careerContext?.current_job || careerContext?.job_title,
    careerContext?.career_goal || careerContext?.goal,
  ].filter(Boolean);
  return parts.length ? parts.join(' → ') : 'AI 커리어 리포트';
}

/** D1의 영구 보관과 별개로 이메일 다시보기와 딥링크용 KV 색인을 남긴다. */
export async function archivePaidReport({ kv, paymentId, responsePayload, careerContext, birth }) {
  if (!kv) return;
  const token = String(paymentId || '').trim();
  if (!token) return;

  const createdAt = new Date().toISOString();
  const userContext = {
    ...careerContext,
    current_job: careerContext?.current_job || careerContext?.job_title || '',
    desired_answer: careerContext?.desired_answer || careerContext?.worry_text || '',
    birth_data: birth || null,
  };
  await kv.put(`report:copy-v2:${token}`, responsePayload, { expirationTtl: REPORT_TTL_SECONDS });
  await kv.put(`meta:${token}`, JSON.stringify({ user_context: userContext }), { expirationTtl: REPORT_TTL_SECONDS });

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
  const withoutCurrent = history.filter((entry) => entry?.token !== token);
  withoutCurrent.unshift({ token, createdAt, label: buildReportLabel(careerContext) });
  await kv.put(emailKey, JSON.stringify(withoutCurrent.slice(0, EMAIL_HISTORY_LIMIT)), { expirationTtl: REPORT_TTL_SECONDS });
}
