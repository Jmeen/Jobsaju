import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePriceVariant, PRICE_VARIANTS } from './pricing.ts';
import { validateFollowUpQuestion, buildLocalFollowUpAnswer, classifyFollowUp, FOLLOW_UP_MAX_LENGTH } from './followUp.ts';
import { getSajuAnalysis } from './sajuCore.ts';

function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
  } as unknown as Storage;
}

test('가격은 기본 8,900원이고 URL 파라미터로 6,900원을 열 수 있다', () => {
  const s1 = fakeStorage();
  const natural = resolvePriceVariant('', s1);
  assert.equal(natural.amount, 8900);
  assert.equal(natural.label, '8,900원');

  const s2 = fakeStorage();
  const low = resolvePriceVariant('?p=6900', s2);
  assert.equal(low.amount, 6900);
  // 배정 후에는 파라미터가 없어도 같은 가격이 유지된다
  assert.equal(resolvePriceVariant('', s2).amount, 6900);

  // 임의의 금액은 무시하고 기본가로 처리한다
  const s3 = fakeStorage();
  assert.equal(resolvePriceVariant('?p=100', s3).amount, PRICE_VARIANTS.high);
});

test('추가 질문은 길이를 검증한다', () => {
  assert.ok(validateFollowUpQuestion('짧다'));
  assert.equal(validateFollowUpQuestion('지금 이직 준비를 시작해도 될까요?'), null);
  assert.ok(validateFollowUpQuestion('가'.repeat(FOLLOW_UP_MAX_LENGTH + 1)));
});

test('폴백 답변은 실제 사주 신호를 담는다', () => {
  const saju = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });
  const answer = buildLocalFollowUpAnswer('연봉 협상을 먼저 해도 될까요?', saju);

  assert.ok(answer.length > 100, '답변이 너무 짧다');
  assert.match(answer, /협상운 \d+점 · (높음|보통 이상|보통|낮음)/);
  assert.doesNotMatch(answer, /상위|하위|백분위|또래 대비/);
});

test('질문 유형을 구분한다', () => {
  assert.equal(classifyFollowUp('몇 월에 지원하는 게 좋을까요?'), 'timing');
  assert.equal(classifyFollowUp('연봉을 얼마나 불러도 될까요?'), 'salary');
  assert.equal(classifyFollowUp('받은 오퍼를 수락해도 될까요?'), 'offer');
  assert.equal(classifyFollowUp('승진을 1년 더 기다려도 될까요?'), 'wait');
  assert.equal(classifyFollowUp('일단 퇴사하고 좀 쉬어도 될까요?'), 'quit');
  assert.equal(classifyFollowUp('팀장과 갈등이 심한데 어떻게 할까요?'), 'people');
  assert.equal(classifyFollowUp('창업을 해보고 싶은데 괜찮을까요?'), 'role');
});

test('업종·IT 유지와 준비 질문을 실제 의도에 맞게 구분한다', () => {
  assert.equal(classifyFollowUp('어떤 업종의 회사로 가는 게 낫나요. IT를 유지하는 게 맞나요?'), 'industry');
  assert.equal(classifyFollowUp('저한테 맞는 산업군은 어디인가요?'), 'industry');
  assert.equal(classifyFollowUp('딴일을 해볼까요?'), 'role');
  assert.equal(classifyFollowUp('이직 준비는 무엇부터 해야 할까요?'), 'preparation');
});

test('업종 질문 폴백은 경력과 목표를 연결하고 무관한 월운·협상운으로 새지 않는다', () => {
  const saju = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });
  const answer = buildLocalFollowUpAnswer(
    '어떤 업종의 회사로 가는 게 낫나요. IT를 유지하는 게 맞나요?',
    saju,
    { current_job: '7년차 IT 서비스 기획자', career_goal: '핀테크 프로덕트 리더' },
  );

  assert.match(answer, /7년차 IT 서비스 기획자/);
  assert.match(answer, /핀테크 프로덕트 리더/);
  assert.match(answer, /인접|경력|공고/);
  assert.doesNotMatch(answer, /협상운|이번 달|병신월|월운/);
});

test('위험·무관 질문은 차단하고 모호한 커리어 질문은 허용한다', () => {
  assert.match(validateFollowUpQuestion('로또 번호 6개를 정확히 알려줘') || '', /안전|제공할 수/);
  assert.match(validateFollowUpQuestion('오늘 저녁 김치찌개 레시피를 알려줘') || '', /커리어/);
  assert.equal(validateFollowUpQuestion('앞으로 어떻게 준비하면 좋을까요?'), null);
});

test('질문마다 다른 답이 나온다 (엉뚱한 답변 회귀 방지)', () => {
  const saju = getSajuAnalysis(1993, 8, 12, 13, 30, 1, { isSolar: true, hasTime: true });

  const timing = buildLocalFollowUpAnswer('몇 월에 지원하는 게 좋을까요?', saju);
  const salary = buildLocalFollowUpAnswer('연봉을 얼마나 불러도 될까요?', saju);
  const wait = buildLocalFollowUpAnswer('승진을 1년 더 기다려도 될까요?', saju);
  const people = buildLocalFollowUpAnswer('팀장과 갈등이 심한데 어떻게 할까요?', saju);

  const answers = [timing, salary, wait, people];
  assert.equal(new Set(answers).size, 4, '질문이 달라도 같은 답이 나온다');

  // 각 답변이 질문의 주제를 실제로 다룬다
  assert.match(timing, /월/);
  assert.match(salary, /협상운|연봉|처우/);
  assert.match(wait, /잔류운|기다/);
  assert.match(people, /관계|갈등|사람/);

  // 서론으로 시작하지 않고 질문 주제로 바로 들어간다
  assert.doesNotMatch(timing.split('\n')[0], /큰 흐름 위에서 판단/);
});
