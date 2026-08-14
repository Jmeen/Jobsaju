import { buildPremiumExpansion } from '../utils/premiumReport.ts';
import { CONTRAST_PAIRS, PERSONALIZATION_CASES } from './personalizationCases.ts';
import { evaluateContrast, evaluateReport } from './personalizationScorer.ts';

const requestedSplit = process.argv[2] ?? 'development';
const cases = PERSONALIZATION_CASES.filter(item => requestedSplit === 'all' || item.split === requestedSplit);
const caseIds = new Set(cases.map(item => item.id));
const reports = new Map(cases.map(item => [item.id, buildPremiumExpansion(item.context, item.scores)]));
const results = cases.map(item => evaluateReport(item, reports.get(item.id)!));
const pairResults = CONTRAST_PAIRS
  .filter(pair => caseIds.has(pair.leftId) && caseIds.has(pair.rightId))
  .map(pair => evaluateContrast(pair, reports.get(pair.leftId)!, reports.get(pair.rightId)!));

const hardFailureCases = results.filter(result => result.hardFailures.length > 0);
const styleWarningCases = results.filter(result => result.styleWarnings.length > 0);
const failedPairs = pairResults.filter(result => result.failures.length > 0);
const averageScore = results.length
  ? results.reduce((sum, result) => sum + result.score, 0) / results.length
  : 0;

console.log(`Personalization eval: ${requestedSplit}`);
console.log(`Cases: ${results.length}, average score: ${averageScore.toFixed(1)}`);
console.log(`Hard-failure cases: ${hardFailureCases.length}`);
console.log(`Style-warning cases: ${styleWarningCases.length}`);
console.log(`Failed contrast pairs: ${failedPairs.length}/${pairResults.length}`);

for (const result of hardFailureCases) {
  console.log(`HARD ${result.caseId}: ${result.hardFailures.map(issue => issue.message).join(' | ')}`);
}
for (const result of styleWarningCases) {
  console.log(`STYLE ${result.caseId}: ${result.styleWarnings.map(issue => issue.message).join(' | ')}`);
}
for (const result of failedPairs) {
  console.log(`PAIR ${result.pairId}: ${result.failures.map(issue => issue.message).join(' | ')}`);
}

process.exitCode = hardFailureCases.length || failedPairs.length ? 1 : 0;
