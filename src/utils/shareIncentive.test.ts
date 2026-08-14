import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShareHook, earnsBonusQuestion } from './shareIncentive.ts';

test('가장 높은 흐름을 친구에게 묻는 공유 문구로 만든다', () => {
  assert.equal(buildShareHook({ jobChange: 45, stay: 82, negotiation: 51 }), '나는 잔류형 나왔어.\n너는 어떤 이직 타입일까?');
  assert.equal(buildShareHook({ jobChange: 84, stay: 45, negotiation: 55 }), '나는 이직 준비형 나왔어.\n너는 어떤 이직 타입일까?');
  assert.equal(buildShareHook({ jobChange: 51, stay: 57, negotiation: 83 }), '나는 협상형 나왔어.\n너는 어떤 이직 타입일까?');
});

test('공유가 실행된 경우에만 보너스 질문권을 준다', () => {
  assert.equal(earnsBonusQuestion('kakao'), true);
  assert.equal(earnsBonusQuestion('link'), true);
  assert.equal(earnsBonusQuestion('file'), true);
  assert.equal(earnsBonusQuestion('download'), false);
  assert.equal(earnsBonusQuestion('cancelled'), false);
});
