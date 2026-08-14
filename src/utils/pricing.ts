/**
 * 리포트 가격 A/B.
 *
 * 기본은 high(8,900원). 광고 링크에 ?p=6900 / ?p=8900 을 붙이면 해당 가격으로 고정되고,
 * 한 번 배정된 가격은 localStorage에 저장되어 같은 사람에게 계속 같은 가격이 보인다.
 * (같은 사람에게 다른 가격이 보이면 신뢰 문제가 되므로 반드시 고정한다)
 */

export type PriceVariant = 'low' | 'high';

export interface PriceView {
  variant: PriceVariant;
  amount: number;
  /** 화면 표기용 (예: "8,900원") */
  label: string;
}

export const PRICE_VARIANTS: Record<PriceVariant, number> = {
  low: 6900,
  high: 8900,
};

const PRICE_STORAGE_KEY = 'saju_price_variant';

function toView(variant: PriceVariant): PriceView {
  const amount = PRICE_VARIANTS[variant];
  return { variant, amount, label: `${amount.toLocaleString()}원` };
}

export function resolvePriceVariant(search: string, storage: Storage | null): PriceView {
  const forced = new URLSearchParams(search).get('p');
  const forcedVariant: PriceVariant | null =
    forced === String(PRICE_VARIANTS.low) ? 'low'
    : forced === String(PRICE_VARIANTS.high) ? 'high'
    : null;

  if (forcedVariant) {
    try { storage?.setItem(PRICE_STORAGE_KEY, forcedVariant); } catch { /* noop */ }
    return toView(forcedVariant);
  }

  try {
    const saved = storage?.getItem(PRICE_STORAGE_KEY);
    if (saved === 'low' || saved === 'high') return toView(saved);
  } catch { /* noop */ }

  // 파라미터가 없는 자연 유입은 기본가(high)로 고정한다.
  // 가격 실험은 광고 링크의 ?p= 로만 연다 — 자연 유입까지 랜덤 배정하면 표본이 섞인다.
  try { storage?.setItem(PRICE_STORAGE_KEY, 'high'); } catch { /* noop */ }
  return toView('high');
}
