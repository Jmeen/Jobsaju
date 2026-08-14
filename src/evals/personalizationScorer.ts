import type { ContrastPair, PersonalizationCase } from './personalizationCases.ts';

export type EvaluationIssueCode =
  | 'missing-required-term'
  | 'forbidden-claim'
  | 'ambiguity-not-flagged'
  | 'role-mismatch'
  | 'missing-section'
  | 'ai-cliche'
  | 'contrast-missing';

export type EvaluationIssue = {
  code: EvaluationIssueCode;
  message: string;
};

export type EvaluationResult = {
  caseId: string;
  hardFailures: EvaluationIssue[];
  styleWarnings: EvaluationIssue[];
  score: number;
};

type ReportLike = Record<string, unknown>;

const REQUIRED_SECTIONS = [
  'intent_summary',
  'current_dilemma',
  'career_nature',
  'three_paths',
  'ideal_environment',
  'action_plan',
  'personal_answer',
  'closing_advice',
] as const;

const AI_CLICHES = [
  '귀하',
  '절호의 기회',
  '긍정적인 흐름',
  '현실적으로 볼 필요',
  '무엇보다 중요',
  '단순히',
];

const stringify = (value: unknown) => JSON.stringify(value ?? '');

function getIntentSummary(report: ReportLike) {
  const value = report.intent_summary;
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function evaluateReport(item: PersonalizationCase, report: ReportLike): EvaluationResult {
  const hardFailures: EvaluationIssue[] = [];
  const styleWarnings: EvaluationIssue[] = [];
  const reportText = stringify(report);

  for (const section of REQUIRED_SECTIONS) {
    if (!(section in report)) {
      hardFailures.push({ code: 'missing-section', message: `필수 섹션이 없습니다: ${section}` });
    }
  }

  for (const term of item.expected.requiredTerms) {
    if (!reportText.includes(term)) {
      hardFailures.push({ code: 'missing-required-term', message: `입력의 핵심 조건이 빠졌습니다: ${term}` });
    }
  }

  for (const claim of item.expected.forbiddenTerms) {
    if (reportText.includes(claim)) {
      hardFailures.push({ code: 'forbidden-claim', message: `근거 없이 단정한 표현이 있습니다: ${claim}` });
    }
  }

  const intent = getIntentSummary(report);
  const roleText = String(intent.role_interpretation ?? '');
  const needsClarification = intent.needs_clarification === true;
  const expectedRole = item.expected.roleKind;

  if (expectedRole === 'ambiguous' && !needsClarification) {
    hardFailures.push({ code: 'ambiguity-not-flagged', message: '모호한 직함을 임의로 확정했습니다.' });
  }

  const expectedRoleLabels: Partial<Record<typeof expectedRole, string>> = {
    cro: 'CRO(Chief Revenue Officer)',
    'chief-strategy': 'CSO(Chief Strategy Officer)',
    'chief-sales': 'CSO(Chief Sales Officer)',
  };
  const expectedLabel = expectedRoleLabels[expectedRole];
  if (expectedLabel && !roleText.includes(expectedLabel)) {
    hardFailures.push({ code: 'role-mismatch', message: `직함 해석이 기대와 다릅니다: ${expectedLabel}` });
  }

  for (const phrase of AI_CLICHES) {
    if (reportText.includes(phrase)) {
      styleWarnings.push({ code: 'ai-cliche', message: `AI 상투어가 감지됐습니다: ${phrase}` });
    }
  }

  return {
    caseId: item.id,
    hardFailures,
    styleWarnings,
    score: Math.max(0, 100 - hardFailures.length * 15 - styleWarnings.length * 5),
  };
}

export function evaluateContrast(pair: ContrastPair, leftReport: ReportLike, rightReport: ReportLike) {
  const failures: EvaluationIssue[] = [];
  const leftText = stringify(leftReport);
  const rightText = stringify(rightReport);
  const adviceText = (report: ReportLike) => stringify({
    decision_factors: report.decision_factors,
    current_dilemma: report.current_dilemma,
    career_nature: report.career_nature,
    three_paths: report.three_paths,
    ideal_environment: report.ideal_environment,
    action_plan: report.action_plan,
    personal_answer: report.personal_answer && typeof report.personal_answer === 'object'
      ? (report.personal_answer as Record<string, unknown>).content
      : report.personal_answer,
    closing_advice: report.closing_advice,
  });
  const leftAdvice = adviceText(leftReport);
  const rightAdvice = adviceText(rightReport);

  const recommendation = (report: ReportLike) => {
    const factors = report.decision_factors;
    return factors && typeof factors === 'object'
      ? String((factors as Record<string, unknown>).recommendation ?? '')
      : '';
  };

  if (leftText === rightText) {
    failures.push({ code: 'contrast-missing', message: '조건이 다른 두 사용자에게 동일한 리포트가 생성됐습니다.' });
  }

  if (!recommendation(leftReport) || recommendation(leftReport) === recommendation(rightReport)) {
    failures.push({ code: 'contrast-missing', message: '바뀐 결정 조건에 맞춘 권고안 차이가 없습니다.' });
  }

  const [leftTerm, rightTerm] = pair.expectedDifferenceTerms;
  if (leftTerm && !leftAdvice.includes(leftTerm)) {
    failures.push({ code: 'contrast-missing', message: `왼쪽 리포트에 비교 조건이 없습니다: ${leftTerm}` });
  }
  if (rightTerm && !rightAdvice.includes(rightTerm)) {
    failures.push({ code: 'contrast-missing', message: `오른쪽 리포트에 비교 조건이 없습니다: ${rightTerm}` });
  }

  return { pairId: pair.id, failures };
}
