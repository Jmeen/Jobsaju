// VITE_ 접두사가 붙은 값만 브라우저 번들에 포함된다. 둘 다 공개 식별자이며,
// PORTONE_API_SECRET 같은 서버 비밀값은 절대로 여기에 두지 않는다.
const PORTONE_STORE_ID = (import.meta.env.VITE_PORTONE_STORE_ID || '').trim();
const PORTONE_CHANNEL_KEY = (import.meta.env.VITE_PORTONE_CHANNEL_KEY || '').trim();

export interface PaymentParams {
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: string;
}

export function createPortOnePaymentId(): string {
  // KCP는 주문번호를 최대 40자로 제한하고 한글/특수문자를 지원하지 않는다.
  return `p${crypto.randomUUID().replaceAll('-', '')}`;
}

export function isPortOneConfigured(): boolean {
  return Boolean(PORTONE_STORE_ID && PORTONE_CHANNEL_KEY);
}

function assertPortOneConfig() {
  if (!isPortOneConfigured()) {
    throw new Error('결제 테스트 설정이 아직 완료되지 않았습니다. 포트원 상점 ID와 채널 키를 확인해 주세요.');
  }
}

export function loadPortOneSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('portone-sdk')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'portone-sdk';
    script.src = 'https://cdn.portone.io/v2/browser-sdk.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PortOne SDK'));
    document.head.appendChild(script);
  });
}

export async function requestPortOnePayment(params: PaymentParams): Promise<any> {
  assertPortOneConfig();
  await loadPortOneSdk();
  if (!window.PortOne) {
    throw new Error('PortOne SDK not initialized');
  }

  return await window.PortOne.requestPayment({
    storeId: PORTONE_STORE_ID,
    channelKey: PORTONE_CHANNEL_KEY,
    paymentId: params.paymentId,
    orderName: params.orderName,
    totalAmount: params.totalAmount,
    currency: params.currency,
    payMethod: params.payMethod,
  });
}
