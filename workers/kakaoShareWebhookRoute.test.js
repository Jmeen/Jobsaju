import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

const token = 'valid-unlock-token-1234567890';
const ADMIN_KEY = 'test-admin-key';

function createKv() {
  const writes = [];
  const values = new Map();
  return {
    writes,
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(...args) {
      writes.push(args);
      values.set(args[0], args[1]);
    },
  };
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

test('카카오 웹훅이 GET으로 도착하면(Authorization 일치) 쿼리의 unlock_token으로 공유 보너스를 등록한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook?unlock_token=' + token + '&CHAT_TYPE=MemoChat', {
    method: 'GET',
    headers: { Authorization: `KakaoAK ${ADMIN_KEY}` },
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 200);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));
});

test('카카오 웹훅이 폼인코딩 POST로 도착해도 unlock_token을 읽어 공유 보너스를 등록한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook', {
    method: 'POST',
    headers: { Authorization: `KakaoAK ${ADMIN_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `unlock_token=${token}&CHAT_TYPE=DirectChat`,
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 200);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));
});

test('같은 공유 흐름의 인증된 카카오 콜백은 보상 키 하나를 유지하면서 매번 confirmed 이벤트를 남긴다', async () => {
  const kv = createKv();
  const db = createAnalyticsDb();
  const callback = (method) => new Request(
    `https://example.com/api/kakao-share-webhook?unlock_token=${token}&share_id=11111111-1111-4111-8111-111111111111&result_session_id=22222222-2222-4222-8222-222222222222&visitor_session_id=33333333-3333-4333-8333-333333333333&guardian_id=%E7%94%B2%E5%AD%90`,
    { method, headers: { Authorization: `KakaoAK ${ADMIN_KEY}` } },
  );

  assert.equal((await worker.fetch(callback('GET'), { SAJU_KV: kv, DB: db, KAKAO_ADMIN_KEY: ADMIN_KEY })).status, 200);
  assert.equal((await worker.fetch(callback('GET'), { SAJU_KV: kv, DB: db, KAKAO_ADMIN_KEY: ADMIN_KEY })).status, 200);

  assert.deepEqual([...new Set(kv.writes.map(([key]) => key))], [`share-bonus:${token}`]);
  assert.equal(db.rows.length, 2);
  assert.deepEqual(db.rows.map(row => row.eventName), ['guardian_share_confirmed', 'guardian_share_confirmed']);
  assert.deepEqual(db.rows.map(row => row.shareId), [
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
  ]);
  assert.notEqual(db.rows[0].eventId, db.rows[1].eventId, '서버가 실제 콜백마다 새 event ID를 생성해야 한다');
});

test('웹훅 인증은 통과했지만 unlock_token을 찾지 못하면 보너스 없이 200으로만 응답한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/kakao-share-webhook', {
    method: 'GET',
    headers: { Authorization: `KakaoAK ${ADMIN_KEY}` },
  }), { SAJU_KV: kv, KAKAO_ADMIN_KEY: ADMIN_KEY });

  assert.equal(response.status, 200);
  assert.equal(kv.writes.length, 0);
});

test('공유 보너스 상태 조회는 웹훅이 아직 도착하지 않았으면 granted:false를 반환한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus/status?unlock_token=' + token, {
    method: 'GET',
  }), { SAJU_KV: kv });

  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.granted, false);
});

test('공유 보너스 상태 조회는 웹훅 도착 후 granted:true를 반환한다', async () => {
  const kv = createKv();
  await kv.put(`share-bonus:${token}`, new Date().toISOString());
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus/status?unlock_token=' + token, {
    method: 'GET',
  }), { SAJU_KV: kv });

  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.granted, true);
});
