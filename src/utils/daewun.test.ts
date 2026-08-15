import assert from 'node:assert/strict';
import test from 'node:test';
import { getSajuAnalysis } from './sajuCore.ts';
import { computeDaewun } from './daewun.ts';

test('대운은 시간을 몰라도 계산된다 (정오 근사값)', () => {
  const noTime = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: false });
  const daewun = computeDaewun(noTime.daewunInput);

  assert.ok(daewun.list.length > 0);
  assert.ok(daewun.list.every(entry => entry.ganZhi.length === 2));
});

test('현재 대운은 기준 시점이 속한 구간으로 정해진다', () => {
  const result = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });
  const daewun = computeDaewun(result.daewunInput, new Date(2026, 0, 1));

  assert.ok(daewun.current, '현재 대운이 지정되어야 한다');
  const match = daewun.list.find(entry => entry.ganZhi === daewun.current!.ganZhi);
  assert.ok(match && match.startYear <= 2026 && 2026 <= match.endYear);
});

test('성별에 따라 대운 진행 방향이 달라진다', () => {
  const base = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });
  const male = computeDaewun({ ...base.daewunInput, gender: 1 });
  const female = computeDaewun({ ...base.daewunInput, gender: 0 });

  assert.notEqual(male.list[0].ganZhi, female.list[0].ganZhi);
});
