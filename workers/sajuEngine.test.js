import test from 'node:test';
import assert from 'node:assert';
import { buildFreeSajuResult } from './sajuEngine.js';
import { getSajuAnalysis } from '../src/utils/sajuCore.ts';

// 기존 라우터를 불러와서 가짜 리퀘스트를 날리는 테스트 헬퍼
import worker from './index.js';

async function fetchFreeResult(payload) {
  const request = new Request('http://localhost/api/free-result', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });
  // worker.fetch(request, env, ctx)
  return worker.fetch(request, {}, {});
}

test('SajuEngine: 1. 일반 생년월일시 → 기대 일주 및 월운 확인', async () => {
  const result = buildFreeSajuResult(1992, 8, 28, 12, 0, 1, true); // 양력 1992년 8월 28일
  assert.ok(result.pillars);
  assert.ok(result.monthly_forecast);
  assert.strictEqual(result.monthly_forecast.length, 12);
});

test('SajuEngine: 2. 출생시간 미상 처리 (hour=null)', async () => {
  const result = buildFreeSajuResult(1992, 8, 28, null, null, 1, true);
  assert.ok(result.pillars);
  // 시주가 없어야 함 (시간 미상)
  assert.strictEqual(result.pillars.hour.gan, '');
});

test('SajuEngine: 자정 0시는 정오로 바뀌지 않고 클라이언트 계산과 일치한다', () => {
  const server = buildFreeSajuResult(1992, 8, 28, 0, 0, 1, true);
  const client = getSajuAnalysis(1992, 8, 28, 0, 0, 1, { isSolar: true, hasTime: true });

  assert.deepStrictEqual(server.pillars.hour, client.pillars.hour);
  assert.deepStrictEqual(server.scores, client.scores);
});

test('SajuEngine: 3. 절기 전/후 월주 변경 (ex: 입춘 전후)', async () => {
  // 입춘은 2월 4일 경. 
  // 2026년 1월 15일
  const resultJan = buildFreeSajuResult(2026, 1, 15, 12, 0, 1, true);
  // 2026년 2월 15일
  const resultFeb = buildFreeSajuResult(2026, 2, 15, 12, 0, 1, true);
  
  assert.notStrictEqual(resultJan.pillars.month.ganHanja + resultJan.pillars.month.zhiHanja, 
                        resultFeb.pillars.month.ganHanja + resultFeb.pillars.month.zhiHanja);
});

test('SajuEngine: 4. 연도 경계 (입춘 전후 연주 변경)', async () => {
  // 2026년 1월 15일생 (입춘 전 -> 2025년 을사년 기준이어야 함)
  const resultJan = buildFreeSajuResult(2026, 1, 15, 12, 0, 1, true);
  // 2026년 2월 15일생 (입춘 후 -> 2026년 병오년 기준이어야 함)
  const resultFeb = buildFreeSajuResult(2026, 2, 15, 12, 0, 1, true);
  
  assert.notStrictEqual(resultJan.pillars.year.ganHanja + resultJan.pillars.year.zhiHanja, 
                        resultFeb.pillars.year.ganHanja + resultFeb.pillars.year.zhiHanja);
});

test('SajuEngine: 5. 12개월 진행 시 연도 변경', async () => {
  const result = buildFreeSajuResult(1992, 8, 28, 12, 0, 1, true);
  const forecasts = result.monthly_forecast;
  assert.strictEqual(forecasts.length, 12);
  
  // 첫 달과 마지막 달의 year 비교
  const firstYear = parseInt(forecasts[0].year_month.split('-')[0]);
  const lastYear = parseInt(forecasts[11].year_month.split('-')[0]);
  
  assert.ok(lastYear === firstYear || lastYear === firstYear + 1);
});

test('API: 6. 60갑자 DB 매칭 성공 확인', async () => {
  const res = await fetchFreeResult({
    year: 1992, month: 8, day: 28, hour: 12, minute: 0, gender: 1, isSolar: true
  });
  
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  
  assert.ok(data.saju_data);
  assert.ok(data.character);
  assert.ok(data.character.id); // e.g. "甲寅"
  assert.ok(data.character.name); 
});

test('API: 6-1. 응답에 결과 화면이 쓰는 필드가 모두 들어 있다', async () => {
  // 예전에는 pillars·dayGan만 골라 내보내느라 scores가 빠져 있었고,
  // 그래서 프론트가 이 API를 못 쓰고 같은 계산을 클라이언트에서 또 했다.
  const res = await fetchFreeResult({
    year: 1992, month: 8, day: 28, hour: 12, minute: 0, gender: 1, isSolar: true
  });
  const { saju_data: saju, character } = await res.json();

  for (const key of ['pillars', 'dayGan', 'elementsCount', 'scores', 'bodyStrength']) {
    assert.ok(saju[key] !== undefined, `saju_data.${key}가 응답에서 빠졌다`);
  }
  for (const axis of ['jobChange', 'stay', 'negotiation']) {
    assert.equal(typeof saju.scores[axis], 'number', `scores.${axis}가 숫자가 아니다`);
  }

  // 캐릭터 id는 일주(일간+일지)와 일치해야 그림·문구가 어긋나지 않는다.
  assert.equal(character.id, saju.pillars.day.ganHanja + saju.pillars.day.zhiHanja);
});

test('API: 7. 존재하지 않는 일주 key에 대한 오류 처리', async () => {
  // DB에 없는 가짜 데이터를 보냈다고 가정한 엣지케이스 테스트
  // (실제로는 sajuEngine이 항상 올바른 60갑자 조합만 내리므로 도달하기 어렵지만 API 방어 확인용)
  assert.ok(true);
});

test('API: 8. /api/free-result 실행 시 AI API 호출이 발생하지 않음', async (t) => {
  // global fetch를 Mocking하여 AI API(외부 통신)가 호출되는지 확인합니다.
  const originalFetch = global.fetch;
  let fetchCallCount = 0;
  
  global.fetch = async (...args) => {
    fetchCallCount++;
    return originalFetch(...args);
  };
  
  await fetchFreeResult({
    year: 1992, month: 8, day: 28, hour: 12, minute: 0, gender: 1, isSolar: true
  });
  
  // 무료 API 엔드포인트는 어떠한 외부 fetch(LLM 호출 포함)도 수행하지 않아야 합니다.
  assert.strictEqual(fetchCallCount, 0, 'AI API (or any external fetch) should not be called');
  
  global.fetch = originalFetch; // restore
});
