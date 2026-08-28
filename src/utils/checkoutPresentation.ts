export const CHECKOUT_COPY = {
  title: '전체 풀이 보기',
  savedResultSuffix: ' (전체 풀이 포함)',
  freeButton: '🎉 0원으로 전체 풀이 보기',
  paymentButton: (priceLabel: string) => `⚡ 전체 풀이 결제하기 (${priceLabel})`,
  lookupDescription: '결제 시 입력하셨던 이메일 주소를 입력하시면, 보관된 전체 풀이를 바로 불러옵니다.',
  lookupButton: '전체 풀이 불러오기',
} as const;

export type CheckoutAction = 'unlock';

export function buildCheckoutPresentation(priceAmount: number, discountPercent: number | null) {
  const priceLabel = `${priceAmount.toLocaleString()}원`;
  const hasCoupon = discountPercent !== null;
  const finalAmount = hasCoupon
    ? Math.round(priceAmount * (100 - discountPercent) / 100)
    : priceAmount;
  const finalLabel = `${finalAmount.toLocaleString()}원`;

  return hasCoupon
    ? {
        originalLabel: priceLabel,
        finalLabel,
        buttonLabel: discountPercent === 100
          ? CHECKOUT_COPY.freeButton
          : CHECKOUT_COPY.paymentButton(finalLabel),
        action: 'unlock' as const,
      }
    : {
        originalLabel: null,
        finalLabel,
        buttonLabel: CHECKOUT_COPY.paymentButton(priceLabel),
        action: 'unlock' as const,
      };
}

export function runCheckoutAction(
  action: CheckoutAction,
  onUnlock: () => void,
) {
  if (action === 'unlock') onUnlock();
}
