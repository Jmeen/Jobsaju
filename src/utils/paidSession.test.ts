import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { clearPaidSession, loadPaidSession, savePaidSession } from './paidSession.ts';

// node 환경에는 sessionStorage가 없으므로 최소 구현을 끼운다.
function installStore() {
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
  return map;
}

beforeEach(() => { installStore(); });

test('결제 정보를 저장하고 그대로 되읽는다', () => {
  savePaidSession({ paymentId: 'pid-1', email: 'a@b.com' });

  assert.deepEqual(loadPaidSession(), { paymentId: 'pid-1', email: 'a@b.com' });
});

test('리포트가 나오면 지운다', () => {
  savePaidSession({ paymentId: 'pid-1', email: 'a@b.com' });
  clearPaidSession();

  assert.equal(loadPaidSession(), null);
});

test('깨졌거나 반쪽인 값은 복구하지 않는다', () => {
  const store = installStore();
  for (const broken of ['', 'not json', '{}', '{"paymentId":"p"}', '{"email":"a@b.com"}', '{"paymentId":"","email":"a@b.com"}']) {
    store.set('jobsaju_paid_session_v1', broken);
    assert.equal(loadPaidSession(), null, `${broken}는 복구하면 안 된다`);
  }
});

test('저장소를 못 쓰는 환경에서도 던지지 않는다', () => {
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
    removeItem() { throw new Error('denied'); },
  };

  assert.doesNotThrow(() => savePaidSession({ paymentId: 'p', email: 'e@x.com' }));
  assert.equal(loadPaidSession(), null);
  assert.doesNotThrow(() => clearPaidSession());
});
