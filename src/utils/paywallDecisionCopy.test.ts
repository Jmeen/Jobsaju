import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaywallDecisionCopy } from './paywallDecisionCopy.ts';

test('잔류 1순위는 현재 회사의 개선 조건과 다음 이동 시점을 보여준다', () => {
  const copy = getPaywallDecisionCopy('stay');
  assert.match(copy.howBody, /역할·보상 개선/);
  assert.match(copy.roadmap, /다음 이동 시점/);
  assert.match(copy.criteria.join(' '), /현재 회사/);
  assert.doesNotMatch(copy.criteria.join(' '), /다음 회사|오퍼/);
  assert.match(copy.personalizePlaceholder, /현재 회사|언제까지/);
  assert.equal(copy.reportCheckTitle, '현재 회사에서 확인할 질문');
  assert.doesNotMatch(copy.questionExamples.join(' '), /오퍼|다음 회사/);
});

test('이직 1순위는 다음 회사 조건과 오퍼 판단을 보여준다', () => {
  const copy = getPaywallDecisionCopy('jobChange');
  assert.match(copy.howBody, /다음 회사/);
  assert.match(copy.roadmap, /오퍼 판단/);
  assert.match(copy.criteria.join(' '), /역할의 범위와 권한/);
  assert.match(copy.scenarios.join(' '), /오퍼가 들어오면/);
  assert.equal(copy.reportCheckTitle, '오퍼에서 확인할 질문');
});

test('협상 1순위는 협상 근거와 결과별 다음 행동을 보여준다', () => {
  const copy = getPaywallDecisionCopy('negotiation');
  assert.match(copy.howBody, /성과와 시장 보상 근거/);
  assert.match(copy.roadmap, /결과별 다음 행동/);
  assert.match(copy.criteria.join(' '), /요구|협상/);
  assert.match(copy.scenarios.join(' '), /받아들여지면|거절되면/);
  assert.match(copy.personalizePlaceholder, /연봉과 역할|거절되면/);
  assert.equal(copy.reportCheckTitle, '협상 전에 확인할 근거');
});

test('세 추천축은 서로 다른 결정 예시를 제공한다', () => {
  const variants = ['stay', 'jobChange', 'negotiation'] as const;
  assert.equal(new Set(variants.map(axis => JSON.stringify(getPaywallDecisionCopy(axis)))).size, 3);
});
