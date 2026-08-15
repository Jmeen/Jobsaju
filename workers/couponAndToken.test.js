import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';
import { decodeSecurePayload } from './crypto.js';

function createKv() {
  const values = new Map();
  const writes = [];
  return {
    writes,
    values,
    async get(key) { return values.get(key) ?? null; },
    async put(key, value, options) {
      writes.push([key, value, options]);
      values.set(key, value);
    },
    async list({ prefix } = {}) {
      const keys = [...values.keys()]
        .filter(k => !prefix || k.startsWith(prefix))
        .map(name => ({ name }));
      return { keys };
    },
  };
}

async function seedCoupon(kv, code, overrides = {}) {
  await kv.put(`coupon:${code}`, JSON.stringify({
    code,
    maxUses: 1,
    usedCount: 0,
    expiresAt: null,
    note: '',
    revoked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }));
}

test('KV에 등록된 쿠폰 코드는 0원으로 유효한 해금 토큰을 발급하고 사용 횟수를 소비한다', async () => {
  const kv = createKv();
  await seedCoupon(kv, 'TESTER1', { maxUses: 2 });

  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: 'tester1' }),
  });

  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.equal(typeof data.unlockToken, 'string');
  assert.equal(data.couponApplied, true);

  const saved = JSON.parse(await kv.get(`token:${data.unlockToken}`));
  assert.equal(saved.status, 'unlocked');
  assert.equal(saved.coupon, 'TESTER1');

  const coupon = JSON.parse(await kv.get('coupon:TESTER1'));
  assert.equal(coupon.usedCount, 1, '사용할 때마다 usedCount가 늘어나야 한다');
});

test('DB(KV)에 없는 쿠폰 코드는 하드코딩된 우회 없이 거부된다', async () => {
  const kv = createKv();
  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: 'LAUNCHFREE' }),
  });

  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /유효하지 않거나 만료된 쿠폰/);
});

test('사용 횟수를 다 쓴 쿠폰은 거부된다', async () => {
  const kv = createKv();
  await seedCoupon(kv, 'MAXED', { maxUses: 1, usedCount: 1 });

  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: 'MAXED' }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /소진/);
});

test('만료일이 지난 쿠폰은 거부된다', async () => {
  const kv = createKv();
  await seedCoupon(kv, 'EXPIRED', { expiresAt: '2020-01-01T00:00:00.000Z' });

  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: 'EXPIRED' }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 400);
});

test('회수(revoke)된 쿠폰은 거부된다', async () => {
  const kv = createKv();
  await seedCoupon(kv, 'REVOKED', { revoked: true });

  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: 'REVOKED' }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 400);
});

test('쿠폰도 없고 PAYMENT_SANDBOX_MODE도 꺼져 있으면 결제 정보 없이는 통과하지 못한다', async () => {
  // 회귀 테스트: 예전엔 클라이언트가 스스로 "sandbox-<uuid>"를 만들어 보내면 무조건 통과였다.
  // 이제는 서버 환경변수(PAYMENT_SANDBOX_MODE)로만 우회를 켤 수 있어야 한다. paymentId가 채워져
  // 있으면 포트원 교차검증 분기로 넘어가므로, 실제 네트워크를 타지 않도록 fetch를 실패로 막아둔다.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  try {
    const kv = createKv();
    const req = new Request('https://example.com/api/payment/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId: `sandbox-${crypto.randomUUID()}`, couponCode: '' }),
    });
    const res = await worker.fetch(req, { SAJU_KV: kv });
    assert.equal(res.status, 400, '클라이언트가 만든 sandbox- 문자열만으로는 더 이상 통과하면 안 된다');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PAYMENT_SANDBOX_MODE가 켜져 있으면(서버 환경변수) 쿠폰 없이도 통과한다', async () => {
  const kv = createKv();
  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: '' }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv, PAYMENT_SANDBOX_MODE: 'true' });
  assert.equal(res.status, 200);
});

test('쿠폰도 없고 결제 정보도 없으면 테스터에게 쿠폰 입력을 안내한다', async () => {
  const kv = createKv();
  const req = new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /쿠폰 코드를 입력/);
});

test('쿠폰 실시간 확인(/api/coupon/check)은 사용 횟수를 소비하지 않는다', async () => {
  const kv = createKv();
  await seedCoupon(kv, 'CHECKONLY', { maxUses: 1 });

  const checkReq = new Request('https://example.com/api/coupon/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ couponCode: 'checkonly' }),
  });
  const checkRes = await worker.fetch(checkReq, { SAJU_KV: kv });
  assert.equal(checkRes.status, 200);
  const checkData = await checkRes.json();
  assert.equal(checkData.valid, true);
  assert.equal(checkData.remainingUses, 1);

  const coupon = JSON.parse(await kv.get('coupon:CHECKONLY'));
  assert.equal(coupon.usedCount, 0, '확인만으로는 소비되면 안 된다');
});

test('토큰 기반 리포트 조회 엔드포인트(/api/report-by-token)가 정상 작동한다', async () => {
  const kv = createKv();
  const testToken = 'token-report-test-12345';
  const mockReport = {
    one_line_conclusion: '테스트 결론입니다.',
    three_paths: [{ key: 'change', title: '이직', score: 80, content: '좋음' }],
  };
  await kv.put(`report:copy-v2:${testToken}`, JSON.stringify(mockReport));
  await kv.put(`meta:${testToken}`, JSON.stringify({
    user_context: { email: 'user@example.com' },
    saju_data: { day_gan: '甲' },
  }));

  const req = new Request('https://example.com/api/report-by-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: testToken }),
  });

  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.status, 'success');
  assert.equal(data.report.one_line_conclusion, '테스트 결론입니다.');
  assert.equal(data.user_context.email, 'user@example.com');
});

test('이메일 조회(/api/lookup)는 이메일 발송 설정이 없으면 리포트를 바로 내려주지 않고 503으로 막는다', async () => {
  // 메일함 소유권을 확인할 수단이 없는 상태에서 리포트를 그대로 반환하면, 남의 이메일 주소만
  // 알아도 리포트를 열람할 수 있게 되므로 안전하게 실패해야 한다.
  const kv = createKv();
  const testToken = 'legacy-token-12345';
  await kv.put('email:legacy@example.com', testToken); // 과거 포맷: 토큰 문자열 그대로 저장
  await kv.put(`report:copy-v2:${testToken}`, JSON.stringify({ one_line_conclusion: '레거시 결론' }));
  await kv.put(`meta:${testToken}`, JSON.stringify({ user_context: { email: 'legacy@example.com' } }));

  const req = new Request('https://example.com/api/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'legacy@example.com' }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.match(data.error, /이메일 발송/);
});

test('이메일 조회(/api/lookup)는 발송 설정이 있으면 리포트 대신 열람 링크 메일을 보내고, 이력 전체를 링크에 담는다', async () => {
  const kv = createKv();
  const email = 'repeat@example.com';

  const history = [
    { token: 'token-new', createdAt: '2026-02-01T00:00:00.000Z', label: '연봉 협상' },
    { token: 'token-old', createdAt: '2026-01-01T00:00:00.000Z', label: '이직 준비' },
  ];
  await kv.put(`email:${email}`, JSON.stringify(history));

  const originalFetch = globalThis.fetch;
  const sentRequests = [];
  globalThis.fetch = async (url, options) => {
    sentRequests.push({ url, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ id: 'mock' }), { status: 200 });
  };

  try {
    const req = new Request('https://example.com/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const res = await worker.fetch(req, { SAJU_KV: kv, RESEND_API_KEY: 'test-key' });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'sent');
    assert.equal(data.report, undefined, '남의 이메일만 알아도 내용이 바로 보이면 안 된다');

    assert.equal(sentRequests.length, 1);
    assert.equal(sentRequests[0].url, 'https://api.resend.com/emails');
    assert.equal(sentRequests[0].body.to[0], email);
    // 토큰은 메일 본문에 평문으로 실리지 않는다 — ?p= 뒤에 암호화된 payload로 들어간다.
    const html = sentRequests[0].body.html;
    assert.doesNotMatch(html, /token-new|token-old/, '토큰이 링크에 평문으로 노출되면 안 된다');

    const linkedTokens = [...html.matchAll(/\?p=([^"]+)"/g)]
      .map(match => decodeSecurePayload(decodeURIComponent(match[1])))
      .map(payload => payload?.token);

    // 이력 전체(최신순)가 각각의 열람 링크로 들어가야 한다
    assert.deepEqual(linkedTokens, ['token-new', 'token-old']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('토큰으로 리포트를 열면(/api/report-by-token) 같은 이메일의 다른 구매 이력도 함께 내려줘 과거 리포트를 고를 수 있다', async () => {
  const kv = createKv();
  const email = 'multi@example.com';

  await kv.put('report:copy-v2:token-new', JSON.stringify({ one_line_conclusion: '최신 결론' }));
  await kv.put('meta:token-new', JSON.stringify({ user_context: { email } }));
  await kv.put(`email:${email}`, JSON.stringify([
    { token: 'token-new', createdAt: '2026-02-01T00:00:00.000Z', label: '연봉 협상' },
    { token: 'token-old', createdAt: '2026-01-01T00:00:00.000Z', label: '이직 준비' },
  ]));

  const req = new Request('https://example.com/api/report-by-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: 'token-new' }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.history.length, 2);
  assert.deepEqual(data.history.map((h) => h.unlock_token), ['token-new', 'token-old']);
});

// === 쿠폰 관리자 API ===

test('관리자 키 없이는 쿠폰 관리 API를 쓸 수 없다', async () => {
  const kv = createKv();
  const req = new Request('https://example.com/api/admin/coupons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'NEW1', maxUses: 5 }),
  });
  const res = await worker.fetch(req, { SAJU_KV: kv, COUPON_ADMIN_KEY: 'admin-secret' });
  assert.equal(res.status, 401);
});

test('올바른 관리자 키로 쿠폰을 생성·조회·회수할 수 있다', async () => {
  const kv = createKv();
  const env = { SAJU_KV: kv, COUPON_ADMIN_KEY: 'admin-secret' };
  const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer admin-secret' };

  const createRes = await worker.fetch(new Request('https://example.com/api/admin/coupons', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ code: 'friend-may', maxUses: 3, note: '5월 지인 테스터' }),
  }), env);
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()).coupon;
  assert.equal(created.code, 'FRIEND-MAY');
  assert.equal(created.maxUses, 3);
  assert.equal(created.usedCount, 0);

  const listRes = await worker.fetch(new Request('https://example.com/api/admin/coupons/list', {
    method: 'POST',
    headers: authHeaders,
  }), env);
  assert.equal(listRes.status, 200);
  const { coupons } = await listRes.json();
  assert.equal(coupons.length, 1);
  assert.equal(coupons[0].code, 'FRIEND-MAY');

  const revokeRes = await worker.fetch(new Request('https://example.com/api/admin/coupons/revoke', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ code: 'friend-may' }),
  }), env);
  assert.equal(revokeRes.status, 200);
  assert.equal((await revokeRes.json()).coupon.revoked, true);

  const useAfterRevoke = await worker.fetch(new Request('https://example.com/api/payment/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: '', couponCode: 'FRIEND-MAY' }),
  }), env);
  assert.equal(useAfterRevoke.status, 400, '회수된 코드는 관리자 API 이후 즉시 못 쓰게 돼야 한다');
});
