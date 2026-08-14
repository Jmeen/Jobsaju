import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTRAST_PAIRS, PERSONALIZATION_CASES } from './personalizationCases.ts';

test('평가 세트는 개발 20건과 홀드아웃 10건으로 구성된다', () => {
  assert.equal(PERSONALIZATION_CASES.length, 30);
  assert.equal(new Set(PERSONALIZATION_CASES.map(item => item.id)).size, 30);
  assert.equal(PERSONALIZATION_CASES.filter(item => item.split === 'development').length, 20);
  assert.equal(PERSONALIZATION_CASES.filter(item => item.split === 'held-out').length, 10);
});

test('모든 사례에는 독립적으로 검증할 기대값이 있다', () => {
  for (const item of PERSONALIZATION_CASES) {
    assert.ok(item.context.currentStatus.trim(), item.id);
    assert.ok(item.context.currentJob.trim(), item.id);
    assert.ok(item.context.desiredAnswer.trim(), item.id);
    assert.ok(item.expected.requiredTerms.length >= 2, item.id);
    assert.ok(item.expected.forbiddenTerms.length >= 1, item.id);
    assert.ok(item.expected.roleKind, item.id);
    assert.doesNotMatch(JSON.stringify(item), /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/, item.id);
  }
});

test('대조 사례는 정확히 15쌍이며 등록된 서로 다른 사례를 가리킨다', () => {
  const ids = new Set(PERSONALIZATION_CASES.map(item => item.id));
  assert.equal(CONTRAST_PAIRS.length, 15);
  for (const pair of CONTRAST_PAIRS) {
    assert.ok(ids.has(pair.leftId), pair.id);
    assert.ok(ids.has(pair.rightId), pair.id);
    assert.notEqual(pair.leftId, pair.rightId, pair.id);
    assert.ok(pair.changedFactor.trim(), pair.id);
    assert.ok(pair.expectedDifferenceTerms.length >= 2, pair.id);
  }
});
