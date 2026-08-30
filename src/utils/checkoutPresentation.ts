export const CHECKOUT_COPY = {
  title: '커리어 선택 리포트 보기',
  savedResultSuffix: ' (커리어 선택 리포트 포함)',
  freeButton: '🎉 0원으로 커리어 선택 리포트 보기',
  paymentButton: (priceLabel: string) => `⚡ 리포트 결제하기 (${priceLabel})`,
  lookupDescription: '결제 시 입력하셨던 이메일 주소를 입력하시면, 보관된 커리어 선택 리포트를 바로 불러옵니다.',
  lookupButton: '커리어 선택 리포트 불러오기',
} as const;

export type CheckoutAction = 'unlock';

export function buildCheckoutPresentation(priceAmount: number, discountAmount: number | null) {
  const priceLabel = `${priceAmount.toLocaleString()}원`;
  const hasCoupon = discountAmount !== null && discountAmount > 0;
  const finalAmount = hasCoupon
    ? Math.max(0, priceAmount - discountAmount)
    : priceAmount;
  const finalLabel = `${finalAmount.toLocaleString()}원`;

  return hasCoupon
    ? {
        originalLabel: priceLabel,
        finalLabel,
        buttonLabel: finalAmount === 0
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
