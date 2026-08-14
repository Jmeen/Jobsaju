const DISALLOWED_SCRIPTS = /[\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Devanagari}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Greek}]/u;

const BANNED_PHRASES = [
  '정차',
  '높음 협상운',
  '커리어 골인',
  '커리어 골',
  '크리처',
  '몸값',
  '서류를 뿌리',
  '진짜 CEO',
];

const REQUIRED_OBJECT_FIELDS = [
  'intent_summary',
  'decision_factors',
  'current_dilemma',
  'career_nature',
  'ideal_environment',
  'action_plan',
  'personal_answer',
];

const REQUIRED_STRING_FIELDS = ['one_line_conclusion', 'closing_advice'];

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectStrings(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output);
    return output;
  }
  if (isRecord(value)) {
    for (const item of Object.values(value)) collectStrings(item, output);
  }
  return output;
}

export function formatSeoulDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function validatePremiumReport(report) {
  const reasons = [];
  if (!isRecord(report)) {
    return { ok: false, reasons: ['리포트 최상위 구조가 객체가 아닙니다.'] };
  }

  for (const field of REQUIRED_OBJECT_FIELDS) {
    if (!isRecord(report[field])) reasons.push(`필수 객체 필드가 없거나 잘못되었습니다: ${field}`);
  }
  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof report[field] !== 'string' || !report[field].trim()) {
      reasons.push(`필수 문자열 필드가 없거나 비어 있습니다: ${field}`);
    }
  }
  if (!Array.isArray(report.three_paths) || report.three_paths.length !== 3) {
    reasons.push('three_paths는 세 선택지를 포함해야 합니다.');
  }

  const refinedQuestion = report.personal_answer?.question;
  if (typeof refinedQuestion !== 'string' || !refinedQuestion.trim()) {
    reasons.push('정제된 질문 제목이 비어 있습니다.');
  }

  const allText = collectStrings(report).join('\n');
  if (DISALLOWED_SCRIPTS.test(allText)) {
    reasons.push('허용하지 않은 문자권이 포함되어 있습니다.');
  }
  for (const phrase of BANNED_PHRASES) {
    if (allText.includes(phrase)) reasons.push(`금지 표현이 포함되어 있습니다: ${phrase}`);
  }

  return reasons.length ? { ok: false, reasons: [...new Set(reasons)] } : { ok: true };
}

export function parseAndValidatePremiumReport(raw) {
  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    return { ok: false, reasons: ['유효한 JSON이 아닙니다.'] };
  }
  const validation = validatePremiumReport(report);
  return validation.ok ? { ok: true, report } : validation;
}

export function buildRepairInstruction(reasons) {
  const safeReasons = reasons.map(reason => `- ${String(reason)}`).join('\n');
  return `\n\n[출력 교정 요청]\n이전 응답은 아래 검증을 통과하지 못했습니다. 제공된 정보를 되풀이하지 말고, 같은 JSON 구조와 의미를 유지해 전체 리포트를 다시 작성하십시오.\n${safeReasons}\n한국어 중심의 자연스러운 문장만 사용하고, 정제된 질문 제목을 반드시 채우십시오.`;
}
