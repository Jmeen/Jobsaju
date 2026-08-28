/**
 * KV 기반 쿠폰 저장소.
 *
 * PG 심사가 끝나기 전까지 "무료 해금"은 코드에 박아둔 고정 문자열이 아니라, SAJU_KV에
 * `coupon:<CODE>`로 저장된 레코드만 인정한다. 이렇게 하면:
 * - 코드가 프론트 번들에 노출되지 않는다 (지인 테스터에게만 구두/DM으로 전달)
 * - 코드마다 사용 횟수 상한·만료일을 둘 수 있다
 * - 재배포 없이 코드를 추가·회수할 수 있다 (관리자 API)
 *
 * 레코드 형태: { code, discountPercent(1-100), maxUses, usedCount, expiresAt(ISO|null), note, revoked, createdAt, updatedAt }
 *
 * 주의: KV는 원자적 증가(atomic increment)를 지원하지 않는다. redeemCoupon은 읽고-쓰는 방식이라
 * 아주 짧은 시간에 같은 코드로 동시에 여러 명이 요청하면 usedCount가 maxUses를 한두 개 넘길 수
 * 있다. 지인 테스터용 소규모 쿠폰에는 문제없는 수준이지만, 대량 트래픽에 노출할 코드라면
 * Durable Object 등으로 바꿔야 한다.
 */

const kvKey = (code) => `coupon:${code}`;

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function isExpired(coupon) {
  return Boolean(coupon.expiresAt) && new Date(coupon.expiresAt).getTime() < Date.now();
}

function isExhausted(coupon) {
  return typeof coupon.maxUses === 'number' && coupon.usedCount >= coupon.maxUses;
}

/** 쿠폰이 지금 시점에 사용 가능한지 판정만 한다(소비하지 않음) — UI에서 실시간 확인용. */
export async function evaluateCoupon(env, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, code, reason: '쿠폰 코드를 입력해 주세요.' };
  if (!env.SAJU_KV) return { ok: false, code, reason: '쿠폰 시스템을 사용할 수 없습니다.' };

  const raw = await env.SAJU_KV.get(kvKey(code));
  if (!raw) return { ok: false, code, reason: '유효하지 않거나 만료된 쿠폰 번호입니다.' };

  let coupon;
  try {
    coupon = JSON.parse(raw);
  } catch {
    return { ok: false, code, reason: '유효하지 않거나 만료된 쿠폰 번호입니다.' };
  }

  // 할인율 필드가 도입되기 전에 발급한 쿠폰은 모두 무료 쿠폰이었다.
  if (!Number.isInteger(coupon.discountPercent)) coupon.discountPercent = 100;

  if (coupon.revoked) return { ok: false, code, reason: '유효하지 않거나 만료된 쿠폰 번호입니다.' };
  if (isExpired(coupon)) return { ok: false, code, reason: '유효하지 않거나 만료된 쿠폰 번호입니다.' };
  if (isExhausted(coupon)) return { ok: false, code, reason: '이미 모두 소진된 쿠폰입니다.' };

  return { ok: true, code, coupon };
}

/** 쿠폰을 실제로 소비(usedCount + 1)한다. 결제 확정(해금 토큰 발급) 시점에만 호출한다. */
export async function redeemCoupon(env, rawCode) {
  const check = await evaluateCoupon(env, rawCode);
  if (!check.ok) return check;

  const updated = { ...check.coupon, usedCount: check.coupon.usedCount + 1, updatedAt: new Date().toISOString() };
  await env.SAJU_KV.put(kvKey(check.code), JSON.stringify(updated));
  return { ok: true, code: check.code, coupon: updated };
}

/** 관리자 API — 코드를 새로 만들거나(기존 코드면) 설정을 덮어쓴다. usedCount는 보존한다. */
export async function upsertCoupon(env, { code, discountPercent, maxUses, expiresAt, note }) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error('코드가 필요합니다.');

  const existingRaw = await env.SAJU_KV.get(kvKey(normalized));
  const existing = existingRaw ? JSON.parse(existingRaw) : null;

  const record = {
    code: normalized,
    // 이전에 만든 쿠폰은 무료 쿠폰이었다. discountPercent가 없으면 그 의미를 보존한다.
    discountPercent: Number.isFinite(discountPercent)
      ? Math.min(100, Math.max(1, Math.trunc(discountPercent)))
      : (existing?.discountPercent ?? 100),
    maxUses: Number.isFinite(maxUses) ? Math.max(0, Math.trunc(maxUses)) : (existing?.maxUses ?? 1),
    usedCount: existing?.usedCount ?? 0,
    expiresAt: expiresAt || existing?.expiresAt || null,
    note: typeof note === 'string' ? note : (existing?.note ?? ''),
    revoked: false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await env.SAJU_KV.put(kvKey(normalized), JSON.stringify(record));
  return record;
}

/** 관리자 API — 코드를 즉시 무효화한다(레코드는 남기고 revoked만 true로). */
export async function revokeCoupon(env, rawCode) {
  const normalized = normalizeCode(rawCode);
  const existingRaw = await env.SAJU_KV.get(kvKey(normalized));
  if (!existingRaw) return null;
  const record = { ...JSON.parse(existingRaw), revoked: true, updatedAt: new Date().toISOString() };
  await env.SAJU_KV.put(kvKey(normalized), JSON.stringify(record));
  return record;
}

/** 관리자 API — 등록된 쿠폰 전체를 나열한다. */
export async function listCoupons(env) {
  const listResult = await env.SAJU_KV.list({ prefix: 'coupon:' });
  const records = await Promise.all(listResult.keys.map(async (entry) => {
    const raw = await env.SAJU_KV.get(entry.name);
    return raw ? JSON.parse(raw) : null;
  }));
  return records.filter(Boolean);
}
