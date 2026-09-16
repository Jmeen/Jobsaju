export const REPORT_RETENTION_MONTHS = 6;
export const REPORT_DELETION_GRACE_DAYS = 1;

const DAY_MS = 24 * 60 * 60 * 1000;
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

function asValidDate(value, fallback = new Date()) {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(fallback.getTime()) : parsed;
}

/** 결제 시각에서 달력 기준 6개월이 지난 다음 날을 리포트 자동 삭제 시각으로 계산한다. */
export function getReportExpirationDate(purchasedAt = new Date()) {
  const purchased = asValidDate(purchasedAt);
  // 서비스 기준 시간대(Asia/Seoul)는 DST가 없으므로 +09:00을 더한 뒤 UTC 달력 연산을 한다.
  const seoulCalendar = new Date(purchased.getTime() + SEOUL_OFFSET_MS);
  const originalDay = seoulCalendar.getUTCDate();
  const targetMonthIndex = seoulCalendar.getUTCMonth() + REPORT_RETENTION_MONTHS;
  const targetYear = seoulCalendar.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

  seoulCalendar.setUTCDate(1);
  seoulCalendar.setUTCFullYear(targetYear, targetMonth, Math.min(originalDay, lastDayOfTargetMonth));
  return new Date(
    seoulCalendar.getTime()
      + REPORT_DELETION_GRACE_DAYS * DAY_MS
      - SEOUL_OFFSET_MS,
  );
}

export function buildReportRetention(purchasedAt = new Date(), explicitExpiresAt = null) {
  const purchased = asValidDate(purchasedAt);
  const expires = explicitExpiresAt
    ? asValidDate(explicitExpiresAt, getReportExpirationDate(purchased))
    : getReportExpirationDate(purchased);

  return {
    purchasedAt: purchased.toISOString(),
    expiresAt: expires.toISOString(),
    expiration: Math.ceil(expires.getTime() / 1000),
  };
}

/** 결제 토큰에 저장된 최초 결제일을 기준으로 모든 리포트 관련 KV 키의 만료일을 통일한다. */
export async function resolveReportRetention(kv, token, fallbackPurchasedAt = new Date()) {
  if (!kv || !token) return buildReportRetention(fallbackPurchasedAt);

  try {
    const raw = await kv.get(`token:${token}`);
    const record = raw ? JSON.parse(raw) : null;
    return buildReportRetention(
      record?.createdAt || fallbackPurchasedAt,
      record?.expiresAt || null,
    );
  } catch {
    return buildReportRetention(fallbackPurchasedAt);
  }
}

export function isReportExpired(retention, now = new Date()) {
  return Number(retention?.expiration || 0) <= Math.floor(asValidDate(now).getTime() / 1000);
}
