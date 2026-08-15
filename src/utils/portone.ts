export const PORTONE_STORE_ID = "store-7eb0ffed-09d3-4fc6-b25c-097bbde9dd01"; // Placeholder
export const PORTONE_CHANNEL_KEY = "channel-key-12345"; // Placeholder

export interface PaymentParams {
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: string;
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
