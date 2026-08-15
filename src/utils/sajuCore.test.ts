import assert from 'node:assert/strict';
import test from 'node:test';
import { getSajuAnalysis } from './sajuCore.ts';
import { buildMonthlyFlow } from './monthlyFlow.ts';

test('음력 입력은 양력으로 변환한 뒤 계산한다', () => {
  const solar = getSajuAnalysis(1993, 6, 25, 13, 30, 1, { isSolar: true, hasTime: true });
  const lunar = getSajuAnalysis(1993, 6, 25, 13, 30, 1, { isSolar: false, hasTime: true });

  assert.deepEqual(solar.solarDate, { year: 1993, month: 6, day: 25 });
  // 음력 1993.6.25 = 양력 1993.8.12
  assert.deepEqual(lunar.solarDate, { year: 1993, month: 8, day: 12 });
  assert.notEqual(
    solar.pillars.day.gan + solar.pillars.day.zhi,
    lunar.pillars.day.gan + lunar.pillars.day.zhi,
  );
});

test('출생 시간을 모르면 시주를 만들지 않는다 (삼주 분석)', () => {
  const noTime = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: false });

  assert.equal(noTime.pillars.hour.gan, '');
  assert.equal(noTime.pillars.hour.zhi, '');
  // 연·월·일 삼주의 간지 6글자만 오행에 반영되어야 한다
  const total = Object.values(noTime.elementsCount).reduce((a, b) => a + b, 0);
  assert.equal(total, 6);
  // 대운 입력값은 시간을 몰라도 정오 근사값으로 채워져야 한다
  assert.equal(noTime.daewunInput.hour, 12);
});

test('세운은 오늘 기준으로 결정된다', () => {
  const result = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });
  const thisYear = new Date().getFullYear();

  assert.equal(result.seewun.year, thisYear);
  assert.equal(result.seewun.ganZhi.length, 2);
});

test('월별 로드맵은 요청한 개월 수만큼 서로 다른 월건으로 만들어진다', () => {
  const chart = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });
  const natalZhis = [
    chart.pillars.year.zhi,
    chart.pillars.month.zhi,
    chart.pillars.day.zhi,
    chart.pillars.hour.zhi,
  ];
  const flow = buildMonthlyFlow(chart.dayGan.char, natalZhis, 6, new Date(2026, 7, 1));

  assert.equal(flow.length, 6);
  assert.equal(new Set(flow.map(m => m.ganZhi)).size, 6);
  assert.deepEqual(flow.map(m => m.month), [8, 9, 10, 11, 12, 1]);
  // 연속한 달이 같은 문장을 반복하지 않아야 한다
  for (let i = 1; i < flow.length; i++) {
    assert.notEqual(flow[i].description, flow[i - 1].description);
  }
  assert.equal(flow.filter(m => m.isPeak).length, 1);
});
