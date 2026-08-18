import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchFreeResult, isUsableFreeResult } from './freeResultApi.ts';

const birth = { year: 1992, month: 8, day: 28, hour: 12, minute: 0, gender: 1, isSolar: true };

const usableSaju = () => ({
  pillars: {
    year: {}, month: {}, hour: {},
    day: { ganHanja: '甲', zhiHanja: '寅' },
  },
  dayGan: { char: '갑', hanja: '甲', element: '목', desc: '' },
  scores: { jobChange: 51, stay: 49, negotiation: 60 },
});

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

test('정상 응답이면 사주 결과와 서버가 준 수호신 id를 함께 돌려준다', async () => {
  let seen: { url: string; body: unknown } | null = null;
  const result = await fetchFreeResult(birth, {
    fetch: async (url, init) => {
      seen = { url: String(url), body: JSON.parse(String(init?.body)) };
      return jsonResponse({ saju_data: usableSaju(), character: { id: '甲寅' } });
    },
  });

  assert.equal(seen!.url, '/api/free-result');
  assert.deepEqual(seen!.body, birth);
  assert.equal(result?.guardianId, '甲寅');
  assert.equal(result?.sajuResult.scores.negotiation, 60);
});

test('scores가 빠진 예전 형태의 응답은 폴백을 타도록 null로 처리한다', async () => {
  // 이 API는 원래 pillars·dayGan만 내보냈다. 그 배포가 남아 있어도 화면이 깨지면 안 된다.
  const legacy = { pillars: { day: { ganHanja: '甲', zhiHanja: '寅' } }, dayGan: { char: '갑' } };
  const result = await fetchFreeResult(birth, { fetch: async () => jsonResponse({ saju_data: legacy }) });

  assert.equal(result, null);
  assert.equal(isUsableFreeResult(legacy), false);
});

test('서버 오류·네트워크 단절·깨진 JSON은 모두 null이 되고 예외를 던지지 않는다', async () => {
  const cases = [
    async () => jsonResponse({ error: 'boom' }, 500),
    async () => { throw new TypeError('Failed to fetch'); },
    async () => new Response('not json', { status: 200 }),
    async () => jsonResponse({}),
  ];

  for (const failing of cases) {
    assert.equal(await fetchFreeResult(birth, { fetch: failing }), null);
  }
});

test('character가 비어 있어도 일주에서 수호신 id를 복원한다', async () => {
  const result = await fetchFreeResult(birth, {
    fetch: async () => jsonResponse({ saju_data: usableSaju() }),
  });

  assert.equal(result?.guardianId, '甲寅');
});

test('점수가 숫자가 아니면 쓸 수 없는 응답으로 본다', () => {
  const broken = usableSaju();
  (broken.scores as Record<string, unknown>).stay = null;
  assert.equal(isUsableFreeResult(broken), false);
});

test('서버 응답이 멈춰도 제한 시간이 지나면 null로 폴백한다', async () => {
  const result = fetchFreeResult(birth, {
    fetch: async () => new Promise<Response>(() => {}),
    timeoutMs: 5,
  } as Parameters<typeof fetchFreeResult>[1] & { timeoutMs: number });

  const outcome = await Promise.race([
    result,
    new Promise<'hung'>(resolve => setTimeout(() => resolve('hung'), 50)),
  ]);
  assert.equal(outcome, null);
});
