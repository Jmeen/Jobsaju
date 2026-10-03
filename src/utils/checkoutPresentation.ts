export const CHECKOUT_COPY = {
  title: '커리어 선택 리포트 보기',
  savedResultSuffix: ' (커리어 선택 리포트 포함)',
  freeButton: '🎉 0원으로 커리어 선택 리포트 보기',
  paymentButton: (priceLabel: string) => `리포트 결제하기 · ${priceLabel}`,
  servicePeriodTitle: '서비스 제공 기간',
  serviceStart: '결제 완료 후 개인화 입력을 마치면 즉시 리포트 생성을 시작해요.',
  includes: '포함: 월별 커리어 흐름 · 결정 기준 · 상황별 If–Then · 개인 질문 1회',
  delivery: '생성에는 3~5분 정도 걸리고, 완성되면 입력한 이메일로 열람 링크를 보내드려요.',
  paymentNote: '카드 결제 · 1회 결제(정기결제 아님) · 리포트 생성 시작 전에는 전액 환불을 요청할 수 있어요.',
  lookupDescription: '구매한 커리어 선택 리포트를 다시 확인할 수 있어요.',
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
