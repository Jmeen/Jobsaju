import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { clearPendingPayment, loadPendingPayment, savePendingPayment } from './pendingPayment.ts';

function installStore() {
  const values = new Map<string, string>();
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

beforeEach(() => { installStore(); });

test('모바일 결제 리디렉션에 필요한 결제 문맥을 탭 세션에 보관한다', () => {
  savePendingPayment({ paymentId: 'p-123', email: 'user@example.com', couponCode: 'SALE30', discountPercent: 30 });
  assert.deepEqual(loadPendingPayment(), { paymentId: 'p-123', email: 'user@example.com', couponCode: 'SALE30', discountPercent: 30 });
  clearPendingPayment();
  assert.equal(loadPendingPayment(), null);
});

test('깨진 모바일 결제 문맥은 복구하지 않는다', () => {
  sessionStorage.setItem('jobsaju_pending_payment_v1', '{"paymentId":"p"}');
  assert.equal(loadPendingPayment(), null);
});
