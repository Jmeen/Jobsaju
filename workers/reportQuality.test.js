import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRepairInstruction,
  formatSeoulDate,
  parseAndValidatePremiumReport,
  validatePremiumReport,
} from './reportQuality.js';

function validReport() {
  return {
    intent_summary: {
      primary_question: '이직 지원 전략을 어떻게 개선할지',
      role_interpretation: '현재 경력을 다음 리더 역할로 연결하려는 단계입니다.',
      assumptions: ['채용 단계별 결과는 추가 확인이 필요합니다.'],
      needs_clarification: false,
    },
    decision_factors: {
      summary: '서류와 면접 중 어느 단계에서 어려움이 생기는지 확인해야 합니다.',
      recommendation: '지원 기록을 단계별로 나누어 먼저 점검해 보세요.',
      checks: ['최근 지원 결과를 단계별로 정리하기'],
    },
    one_line_conclusion: '성과 근거를 정리한 뒤 목표 기업에 선별적으로 지원해 보세요.',
    current_dilemma: { title: '성장 정체가 크게 느껴지는 이유', content: '현재 입력만으로 불합격 원인을 확정할 수는 없습니다.' },
    career_nature: { title: '업무 방식과 성장 조건', content: '성과를 문서로 남길 때 강점이 잘 전달됩니다.', strengths: ['추진력'], cautions: ['기록을 미루는 경향'] },
    three_paths: [
      { key: 'change', title: '이직한다면', score: 63, content: '목표 역할을 먼저 정하세요.' },
      { key: 'stay', title: '남는다면', score: 33, content: '달라질 조건을 확인하세요.' },
      { key: 'negotiate', title: '협상한다면', score: 71, content: '성과 근거를 준비하세요.' },
    ],
    ideal_environment: { title: '잘 맞는 조직과 역할의 조건', content: '권한과 평가 기준이 명확한 조직을 확인하세요.', checklist: ['평가 기준 확인'] },
    action_plan: { do: ['지원 결과 정리'], avoid: ['감정적으로 지원 범위를 넓히기'] },
    personal_answer: { question: '이직 지원이 계속 불합격하는 이유와 개선 방향', content: '가능한 원인을 단계별로 확인해 보세요.' },
    closing_advice: '사주는 참고 자료이며 실제 지원 결과와 조건을 함께 확인하세요.',
  };
}

function withText(text) {
  const report = validReport();
  report.action_plan.do.push(text);
  return report;
}

test('서울 기준 날짜를 자정 경계에서도 정확히 계산한다', () => {
  assert.equal(formatSeoulDate(new Date('2026-08-12T15:30:00Z')), '2026-08-13');
});

test('필수 구조와 정제 질문이 있는 한국어 리포트는 통과한다', () => {
  assert.deepEqual(validatePremiumReport(validReport()), { ok: true });
  const parsed = parseAndValidatePremiumReport(JSON.stringify(validReport()));
  assert.equal(parsed.ok, true);
});

test('외국 문자 혼입과 확인된 오류 표현을 거부한다', () => {
  for (const text of ['내 ارزش을 증명', '까다로운 정차', '높음 협상운', '최종 커리어 골인 CEO']) {
    const result = validatePremiumReport(withText(text));
    assert.equal(result.ok, false, text);
  }
});

test('정제 질문 제목이 비어 있거나 JSON이 아니면 거부한다', () => {
  const emptyQuestion = validReport();
  emptyQuestion.personal_answer.question = '  ';
  assert.equal(validatePremiumReport(emptyQuestion).ok, false);
  assert.equal(parseAndValidatePremiumReport('not-json').ok, false);
});

test('교정 지시는 오류 이유만 포함하고 원문을 포함하지 않는다', () => {
  const instruction = buildRepairInstruction(['허용하지 않은 문자권이 포함되어 있습니다.']);
  assert.match(instruction, /허용하지 않은 문자권/);
  assert.doesNotMatch(instruction, /ارزش|사용자 입력|원문 전체/);
});
