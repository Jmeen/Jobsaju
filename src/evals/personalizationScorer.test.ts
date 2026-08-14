import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPremiumExpansion } from '../utils/premiumReport.ts';
import { CONTRAST_PAIRS, PERSONALIZATION_CASES } from './personalizationCases.ts';
import { evaluateContrast, evaluateReport } from './personalizationScorer.ts';

const getCase = (id: string) => PERSONALIZATION_CASES.find(item => item.id === id)!;

test('입력 사실과 직함을 올바르게 반영한 결과는 하드 실패가 없다', () => {
  const item = getCase('executive_cro');
  const report = buildPremiumExpansion(item.context, item.scores);
  const result = evaluateReport(item, report);
  assert.deepEqual(result.hardFailures, []);
});

test('필수 입력 누락과 입력에 없는 사실을 각각 검출한다', () => {
  const item = getCase('offer_commute');
  const report = buildPremiumExpansion(item.context, item.scores);
  const withoutRequired = JSON.parse(JSON.stringify(report).replaceAll('하루 세 시간', '통근 조건'));
  const missingResult = evaluateReport(item, withoutRequired);
  assert.ok(missingResult.hardFailures.some(failure => failure.code === 'missing-required-term'));

  const hallucinated = { ...report, closing_advice: `${report.closing_advice} 완전 재택이 보장됩니다.` };
  const hallucinationResult = evaluateReport(item, hallucinated);
  assert.ok(hallucinationResult.hardFailures.some(failure => failure.code === 'forbidden-claim'));
});

test('모호한 직함을 확정하거나 AI 상투어를 쓰면 실패한다', () => {
  const item = getCase('executive_ambiguous_a');
  const report = buildPremiumExpansion(item.context, item.scores);
  const badReport = {
    ...report,
    intent_summary: { ...report.intent_summary, needs_clarification: false, role_interpretation: 'CRO로 확정합니다.' },
    closing_advice: `귀하에게는 절호의 기회입니다. ${report.closing_advice}`,
  };
  const result = evaluateReport(item, badReport);
  assert.ok(result.hardFailures.some(failure => failure.code === 'ambiguity-not-flagged'));
  assert.ok(result.styleWarnings.some(failure => failure.code === 'ai-cliche'));
});

test('대조쌍 결과에는 바뀐 조건이 각각 남아 있어야 한다', () => {
  const pair = CONTRAST_PAIRS.find(item => item.id === 'pair_04')!;
  const left = getCase(pair.leftId);
  const right = getCase(pair.rightId);
  const leftReport = buildPremiumExpansion(left.context, left.scores);
  const rightReport = buildPremiumExpansion(right.context, right.scores);
  const good = evaluateContrast(pair, {
    ...leftReport,
    closing_advice: `${leftReport.closing_advice} ${pair.expectedDifferenceTerms[0]}`,
  }, {
    ...rightReport,
    closing_advice: `${rightReport.closing_advice} ${pair.expectedDifferenceTerms[1]}`,
  });
  assert.deepEqual(good.failures, []);

  const bad = evaluateContrast(pair, buildPremiumExpansion(left.context, left.scores), buildPremiumExpansion(left.context, left.scores));
  assert.ok(bad.failures.length > 0);
});
