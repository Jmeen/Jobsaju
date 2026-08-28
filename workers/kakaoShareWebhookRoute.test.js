import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

const token = 'valid-unlock-token-1234567890';
const ADMIN_KEY = 'test-admin-key';
const SHARE_ID = '11111111-1111-4111-8111-111111111111';

function createKv({ registerToken = true } = {}) {
  const writes = [];
  const values = new Map();
  // 웹훅은 실제 해금 토큰만 공유 보너스로 기록한다. 기본 픽스처는 결제가 끝난 토큰을 흉내낸다.
  if (registerToken) values.set(`token:${token}`, JSON.stringify({ paid: true }));
  return {
    writes,
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(...args) {
      writes.push(args);
      values.set(args[0], args[1]);
    },
    async delete(key) {
      values.delete(key);
    },
  };
}

async function bindShare(kv) {
  await kv.put(`share-auth:${SHARE_ID}`, token);
  kv.writes.length = 0;
}

function createAnalyticsDb() {
  const rows = [];
  return {
    rows,
    prepare() {
      return {
        bind(...values) {
          return {
            async run() {
              if (values.some(value => value === undefined)) {
                throw new Error('D1_TYPE_ERROR: Type undefined not supported');
              }
              if (rows.some(row => row.eventId === values[0])) {
                throw new Error('UNIQUE constraint failed: guardian_analytics_events.event_id');
              }
              rows.push({
                eventId: values[0], eventName: values[1], occurredAt: values[2],
                visitorSessionId: values[3], resultSessionId: values[4], shareId: values[5],
                guardianId: values[6], shareChannel: values[8], utmSource: values[9],
              });
            },
          };
        },
      };
    },
  };
}

function createExecutionContext() {
  const promises = [];
  return {
    promises,
    waitUntil(promise) {
      promises.push(Promise.resolve(promise));
    },
  };
}

function createAnalyticsCallback(resourceId, method = 'GET') {
  return new Request(
    `https://example.com/api/kakao-share-webhook?share_id=${SHARE_ID}&result_session_id=22222222-2222-4222-8222-222222222222&visitor_session_id=33333333-3333-4333-8333-333333333333&guardian_id=%E7%94%B2%E5%AD%90`,
    {
      method,
      headers: {
        Authorization: `KakaoAK ${ADMIN_KEY}`,
        ...(resourceId ? { 'X-Kakao-Resource-ID': resourceId } : {}),
      },
    },
  );
}

async function invokeAnalyticsCallback(resourceId, env) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(createAnalyticsCallback(resourceId), env, ctx);
  await Promise.all(ctx.promises);
  return response;
}

test('카카오 서버가 아닌 요청(관리자 키 불일치)은 웹훅을 거부한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook?unlock_token=' + token, {
    method: 'GET',
    headers: { Authorization: 'KakaoAK wrong-key' },
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 401);
  assert.equal(kv.writes.length, 0, '인증에 실패하면 보너스를 등록하면 안 된다');
});

test('관리자 키 자체가 설정돼 있지 않으면 웹훅을 거부한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook?unlock_token=' + token, {
    method: 'GET',
    headers: { Authorization: 'KakaoAK anything' },
  }), { SAJU_KV: kv });

  assert.equal(response.status, 401);
});

test('카카오 웹훅이 GET으로 도착하면 사전 연결된 share_id의 공유 보너스를 등록한다', async () => {
  const kv = createKv();
  await bindShare(kv);
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook?share_id=' + SHARE_ID + '&CHAT_TYPE=MemoChat', {
    method: 'GET',
    headers: { Authorization: `KakaoAK ${ADMIN_KEY}` },
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 200);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));
});

test('카카오 웹훅이 폼인코딩 POST로 도착해도 share_id로 공유 보너스를 등록한다', async () => {
  const kv = createKv();
  await bindShare(kv);
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook', {
    method: 'POST',
    headers: { Authorization: `KakaoAK ${ADMIN_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `share_id=${SHARE_ID}&CHAT_TYPE=DirectChat`,
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 200);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));
});

test('같은 X-Kakao-Resource-ID 재시도는 보상 키와 confirmed 이벤트를 하나만 유지한다', async () => {
  const kv = createKv();
  await bindShare(kv);
  const db = createAnalyticsDb();
  const env = { SAJU_KV: kv, DB: db, KAKAO_ADMIN_KEY: ADMIN_KEY };

  assert.equal((await invokeAnalyticsCallback('resource-a', env)).status, 200);
  assert.equal((await invokeAnalyticsCallback('resource-a', env)).status, 200);

  assert.deepEqual([...new Set(kv.writes.map(([key]) => key))], [`share-bonus:${token}`]);
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0].eventName, 'guardian_share_confirmed');
  assert.equal(db.rows[0].shareId, '11111111-1111-4111-8111-111111111111');
});

test('같은 shareId라도 서로 다른 카카오 resource ID는 서로 다른 confirmed 행을 만든다', async () => {
  const kv = createKv();
  await bindShare(kv);
  const db = createAnalyticsDb();
  const env = { SAJU_KV: kv, DB: db, KAKAO_ADMIN_KEY: ADMIN_KEY };

  assert.equal((await invokeAnalyticsCallback('resource-a', env)).status, 200);
  assert.equal((await invokeAnalyticsCallback('resource-b', env)).status, 200);

  assert.equal(db.rows.length, 2);
  assert.notEqual(db.rows[0].eventId, db.rows[1].eventId);
  assert.deepEqual(db.rows.map(row => row.shareId), [
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
  ]);
});

test('Workers 실행 컨텍스트에서는 confirmed 분석 저장이 200 응답을 지연시키지 않는다', async () => {
  const kv = createKv();
  await bindShare(kv);
  let releaseDatabase;
  const db = {
    prepare() {
      return {
        bind(...values) {
          assert.equal(values.includes(undefined), false);
          return { run: () => new Promise(resolve => { releaseDatabase = resolve; }) };
        },
      };
    },
  };
  const ctx = createExecutionContext();
  let responseSettled = false;
  const responsePromise = worker.fetch(
    createAnalyticsCallback('resource-background'),
    { SAJU_KV: kv, DB: db, KAKAO_ADMIN_KEY: ADMIN_KEY },
    ctx,
  ).then(response => {
    responseSettled = true;
    return response;
  });

  for (let attempt = 0; attempt < 100 && !releaseDatabase; attempt += 1) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(typeof releaseDatabase, 'function', 'the background task must reach D1');
  const settledBeforeDatabase = responseSettled;
  const scheduledTasks = ctx.promises.length;
  releaseDatabase({ success: true });
  const response = await responsePromise;
  await Promise.all(ctx.promises);

  assert.equal(response.status, 200);
  assert.equal(settledBeforeDatabase, true);
  assert.equal(scheduledTasks, 1);
});

test('분석 D1 실패와 누락된 resource ID는 보상 및 200 응답을 막지 않는다', async () => {
  const kv = createKv();
  await bindShare(kv);
  const failingDb = {
    prepare: () => ({ bind: () => ({ run: async () => { throw new Error('D1 unavailable'); } }) }),
  };

  assert.equal((await invokeAnalyticsCallback('resource-failure', {
    SAJU_KV: kv,
    DB: failingDb,
    KAKAO_ADMIN_KEY: ADMIN_KEY,
  })).status, 200);

  const db = createAnalyticsDb();
  assert.equal((await invokeAnalyticsCallback(null, {
    SAJU_KV: kv,
    DB: db,
    KAKAO_ADMIN_KEY: ADMIN_KEY,
  })).status, 200);
  assert.equal(db.rows.length, 0);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));
});

test('웹훅 인증은 통과했지만 share_id 연결을 찾지 못하면 보너스 없이 200으로만 응답한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook', {
    method: 'GET',
    headers: { Authorization: `KakaoAK ${ADMIN_KEY}` },
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 200);
  assert.equal(kv.writes.length, 0);
});

test('검증되지 않은 사전 연결 토큰은 공유 보너스로 기록하지 않는다', async () => {
  const kv = createKv({ registerToken: false });
  const sharedConstant = 'local-developer-unlock-token';
  await kv.put(`share-auth:${SHARE_ID}`, sharedConstant);
  kv.writes.length = 0;
  const request = new Request(
    `https://example.com/api/kakao-share-webhook?share_id=${SHARE_ID}`,
    { method: 'GET', headers: { Authorization: `KakaoAK ${ADMIN_KEY}` } },
  );

  const response = await worker.fetch(request, { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY }, createExecutionContext());

  assert.equal(response.status, 200); // 카카오의 2XX 계약은 그대로 지킨다
  assert.deepEqual(kv.writes, []);
});

test('공유 보너스 상태 조회는 웹훅이 아직 도착하지 않았으면 granted:false를 반환한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unlock_token: token }),
  }), { SAJU_KV: kv });

  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.granted, false);
});

test('공유 보너스 상태 조회는 웹훅 도착 후 granted:true를 반환한다', async () => {
  const kv = createKv();
  await kv.put(`share-bonus:${token}`, new Date().toISOString());
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus/status', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unlock_token: token }),
  }), { SAJU_KV: kv });

  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.granted, true);
});
