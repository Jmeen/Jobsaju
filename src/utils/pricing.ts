/** 커리어 선택 리포트의 공개 정가. */
export const REPORT_PRICE_AMOUNT = 12_900;

export type PriceVariant = 'standard';

export interface PriceView {
  variant: PriceVariant;
  amount: number;
  /** 화면 표기용 (예: "8,900원") */
  label: string;
}

export const PRICE_VARIANTS: Record<PriceVariant, number> = {
  standard: REPORT_PRICE_AMOUNT,
};

function toView(variant: PriceVariant): PriceView {
  const amount = PRICE_VARIANTS[variant];
  return { variant, amount, label: `${amount.toLocaleString()}원` };
}

export function resolvePriceVariant(_search: string, _storage: Storage | null): PriceView {
  return toView('standard');
}
