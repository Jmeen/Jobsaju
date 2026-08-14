import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPremiumExpansion, summarizeCareerIntent } from './premiumReport.ts';

test('사용자의 실제 고민을 개인 답변과 선택지 분석에 반영한다', () => {
  const report = buildPremiumExpansion(
    {
      currentStatus: '이직 제안을 받고 고민 중',
      currentJob: '6년 차 프로덕트 디자이너',
      careerGoal: '디자인 리드',
      desiredAnswer: '연봉은 오르지만 야근이 늘어날까 걱정됩니다.',
    },
    { jobChange: 78, stay: 42, negotiation: 61 },
  );

  assert.equal(report.personal_answer.question, '연봉은 오르지만 야근이 늘어날까 걱정됩니다.');
  assert.equal(report.three_paths.length, 3);
  assert.match(report.current_dilemma.content, /6년 차 프로덕트 디자이너/);
  assert.match(report.ideal_environment.content, /디자인 리드/);
});

test('질문을 적지 않은 경우에도 상담 가능한 기본 질문을 제공한다', () => {
  const report = buildPremiumExpansion(
    { currentStatus: '', currentJob: '', careerGoal: '', desiredAnswer: '' },
    { jobChange: 55, stay: 58, negotiation: 67 },
  );

  assert.equal(report.personal_answer.question, '지금 이직을 준비하는 것이 맞을까요?');
  assert.ok(report.action_plan.do.length >= 3);
  assert.ok(report.action_plan.avoid.length >= 3);
});

test('CSO와 CRO를 하나의 직함으로 합치지 않고 실제 책임으로 구분한다', () => {
  const revenueIntent = summarizeCareerIntent({
    currentStatus: '임원 이직을 검토 중',
    currentJob: '영업과 고객성공 조직을 총괄하고 매출 예측을 책임짐',
    careerGoal: 'CSO 또는 CRO',
    desiredAnswer: '어느 직함이 지금 경력에 더 맞는지 알고 싶다',
  });
  assert.match(revenueIntent.role_interpretation, /CRO\(Chief Revenue Officer\)/);
  assert.doesNotMatch(revenueIntent.role_interpretation, /CSO·CRO/);

  const ambiguousIntent = summarizeCareerIntent({
    currentStatus: '', currentJob: '', careerGoal: 'CSO CRO', desiredAnswer: '',
  });
  assert.equal(ambiguousIntent.needs_clarification, true);
  assert.match(ambiguousIntent.role_interpretation, /Chief Strategy Officer|Chief Sales Officer/);
});

test('재무 여유가 다른 퇴사 고민에는 서로 다른 안전장치를 제안한다', () => {
  const withRunway = buildPremiumExpansion(
    {
      currentStatus: '번아웃으로 선퇴사를 고민 중',
      currentJob: '7년 차 콘텐츠 마케터',
      careerGoal: '회복 후 브랜드 전략 직무',
      desiredAnswer: '생활비 12개월분을 마련한 상태에서 먼저 퇴사하고 쉬어도 될까',
    },
    { jobChange: 61, stay: 39, negotiation: 44 },
  );
  const withoutRunway = buildPremiumExpansion(
    {
      currentStatus: '번아웃으로 선퇴사를 고민 중',
      currentJob: '7년 차 콘텐츠 마케터',
      careerGoal: '회복 후 브랜드 전략 직무',
      desiredAnswer: '저축이 한 달 생활비뿐이고 다음 회사가 없는 상태에서 먼저 퇴사해도 될까',
    },
    { jobChange: 61, stay: 39, negotiation: 44 },
  );

  assert.match(withRunway.decision_factors.summary, /생활비 12개월/);
  assert.match(withRunway.decision_factors.recommendation, /회복 기간/);
  assert.match(withRunway.personal_answer.content, /회복 기간/);
  assert.ok(withRunway.action_plan.do.some(item => /구직 시작일/.test(item)));
  assert.match(withoutRunway.decision_factors.summary, /한 달 생활비/);
  assert.match(withoutRunway.decision_factors.recommendation, /선퇴사보다 재직 중 탐색/);
});

test('사주가 다르면 같은 입력이라도 다른 리포트가 나온다 (동일 리포트 회귀 방지)', () => {
  const context = {
    currentStatus: '현 직장을 계속 다닐지 고민 중',
    currentJob: '5년 차 영업 담당자',
    careerGoal: '영업 팀장',
    desiredAnswer: '',
  };

  // 일간 오행이 다르면 업무 성향 풀이가 달라야 한다
  const wood = buildPremiumExpansion(context, { jobChange: 60, stay: 50, negotiation: 45 }, { dayGan: '갑', bodyStrength: 0.5 });
  const metal = buildPremiumExpansion(context, { jobChange: 60, stay: 50, negotiation: 45 }, { dayGan: '경', bodyStrength: 0.5 });
  assert.notEqual(wood.career_nature.content, metal.career_nature.content);
  assert.notDeepEqual(wood.career_nature.strengths, metal.career_nature.strengths);

  // 같은 오행이라도 양간/음간이면 성향 문단이 달라야 한다 (일간 10종이 5종으로 뭉치지 않도록)
  const yangWater = buildPremiumExpansion(context, { jobChange: 60, stay: 50, negotiation: 45 }, { dayGan: '임', bodyStrength: 0 });
  const yinWater = buildPremiumExpansion(context, { jobChange: 60, stay: 50, negotiation: 45 }, { dayGan: '계', bodyStrength: 0 });
  assert.notEqual(yangWater.career_nature.content, yinWater.career_nature.content);
  assert.notDeepEqual(yangWater.career_nature.strengths, yinWater.career_nature.strengths);

  // 신강/신약이 다르면 진단과 환경 조언이 달라야 한다
  const strong = buildPremiumExpansion(context, { jobChange: 60, stay: 50, negotiation: 45 }, { dayGan: '갑', bodyStrength: 0.8 });
  const weak = buildPremiumExpansion(context, { jobChange: 60, stay: 50, negotiation: 45 }, { dayGan: '갑', bodyStrength: -0.8 });
  assert.notEqual(strong.current_dilemma.content, weak.current_dilemma.content);
  assert.notEqual(strong.ideal_environment.content, weak.ideal_environment.content);

  // 점수가 다르면 세 갈래 분석과 결론이 달라야 한다
  const mover = buildPremiumExpansion(context, { jobChange: 85, stay: 30, negotiation: 50 }, { dayGan: '갑', bodyStrength: 0 });
  const stayer = buildPremiumExpansion(context, { jobChange: 30, stay: 85, negotiation: 50 }, { dayGan: '갑', bodyStrength: 0 });
  assert.notEqual(mover.three_paths[0].content, stayer.three_paths[0].content);
  assert.notEqual(mover.one_line_conclusion, stayer.one_line_conclusion);
  assert.notDeepEqual(mover.action_plan.avoid, stayer.action_plan.avoid);
  assert.match(mover.one_line_conclusion, /이직운 85점 · 높음/);
  assert.doesNotMatch(JSON.stringify(mover), /상위|하위|백분위|또래 대비/);
});

test('출퇴근과 재택 조건을 일회성 편의가 아닌 지속 가능성으로 해석한다', () => {
  const commute = buildPremiumExpansion(
    {
      currentStatus: '최종 오퍼를 검토 중',
      currentJob: '6년 차 프로덕트 디자이너',
      careerGoal: '디자인 리드',
      desiredAnswer: '연봉은 오르지만 출퇴근이 하루 세 시간인 제안을 받아도 될까',
    },
    { jobChange: 75, stay: 45, negotiation: 66 },
  );

  assert.match(commute.decision_factors.summary, /하루 세 시간/);
  assert.match(commute.decision_factors.recommendation, /주당/);
});
