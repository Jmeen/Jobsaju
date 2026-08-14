import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScoreBars, buildVerdict } from './reportViewModel.ts';

test('점수 막대는 비교 순서를 유지하고 화면 폭을 0~100으로 제한한다', () => {
  assert.deepEqual(
    buildScoreBars({ jobChange: 112, stay: -8, negotiation: 61 }),
    [
      { key: 'jobChange', label: '이직', value: 112, width: 100, tone: 'primary' },
      { key: 'stay', label: '잔류', value: -8, width: 0, tone: 'neutral' },
      { key: 'negotiation', label: '협상', value: 61, width: 61, tone: 'secondary' },
    ],
  );
});

test('가장 높은 선택지를 행동 중심의 한 문장으로 요약한다', () => {
  assert.equal(
    buildVerdict({ jobChange: 78, stay: 42, negotiation: 61 }),
    '지금은 퇴사보다, 조건을 확인하며 이직을 준비할 때입니다.',
  );
  assert.equal(
    buildVerdict({ jobChange: 48, stay: 76, negotiation: 52 }),
    '지금은 이동보다, 현재 자리에서 다음 조건을 만들 때입니다.',
  );
});
