import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GUARDIAN_CONCERN_OPTIONS,
  buildGuardianConcernView,
  buildGuardianReason,
} from './guardianConcern.ts';
import { GUARDIAN_TOTAL, guardianIdBySequence } from './guardianAssets.ts';
import { getGuardianCharacter } from './guardianCharacters.ts';
import type { GuardianConcernType } from './guardianConcern.ts';

const tiger = getGuardianCharacter('甲寅');
const rat = getGuardianCharacter('甲子');
const ALL_GUARDIAN_IDS = Array.from({ length: GUARDIAN_TOTAL }, (_, i) => guardianIdBySequence(i + 1));
const scores = (jobChange: number, negotiation: number, stay: number) => ({ jobChange, negotiation, stay });

test('세 유형이 모두 서로 다른 본문을 만든다', () => {
  const bodies = GUARDIAN_CONCERN_OPTIONS.map(option =>
    buildGuardianConcernView(option.type, tiger, scores(51, 60, 49)).body.join(' '));

  assert.equal(new Set(bodies).size, 3, '유형을 바꿔도 같은 문구가 나오면 선택이 무의미하다');
  for (const body of bodies) assert.ok(body.length > 0);
});

test('같은 유형이라도 수호신이 다르면 본문이 달라진다', () => {
  const forTiger = buildGuardianConcernView('work_fit', tiger, scores(51, 60, 49)).body.join(' ');
  const forRat = buildGuardianConcernView('work_fit', rat, scores(51, 60, 49)).body.join(' ');

  assert.notEqual(forTiger, forRat);
});

test('일간이 같은 수호신 60종이 유형별로 모두 다른 본문을 받는다', () => {
  // 캐릭터 원문은 앞 두 문장이 일간별로 동일하고 마지막 문장만 60종으로 갈린다.
  // 앞에서 잘라 쓰면 같은 일간의 여섯이 똑같은 글을 받게 되므로 여기서 막는다.
  for (const type of GUARDIAN_CONCERN_OPTIONS.map(option => option.type)) {
    const bodies = ALL_GUARDIAN_IDS.map(id =>
      buildGuardianConcernView(type, getGuardianCharacter(id), scores(51, 60, 49)).body.join(' '));

    assert.equal(new Set(bodies).size, ALL_GUARDIAN_IDS.length,
      `${type}: 수호신 60종의 본문이 서로 겹친다`);
  }
});

test('수호신 이유 블록도 60종이 서로 겹치지 않는다', () => {
  const bodies = ALL_GUARDIAN_IDS.map(id => buildGuardianReason(getGuardianCharacter(id)).body);

  assert.equal(new Set(bodies).size, ALL_GUARDIAN_IDS.length);
});

test('이직 판정은 이직 점수 구간을 따라 움직인다', () => {
  const verdictAt = (jobChange: number) =>
    buildGuardianConcernView('job_change', tiger, scores(jobChange, 50, 50)).verdict;

  assert.match(verdictAt(72), /움직여볼 만해요/);
  assert.match(verdictAt(55), /비교해볼 때/);
  assert.match(verdictAt(31), /서두르지 않아도/);
});

test('직업운 판정은 세 축 중 가장 높은 점수를 본다', () => {
  // 이직·협상이 낮아도 잔류가 높으면 흐름 자체는 열려 있다고 본다.
  assert.match(buildGuardianConcernView('career_flow', tiger, scores(30, 30, 66)).verdict, /↑/);
  assert.match(buildGuardianConcernView('career_flow', tiger, scores(40, 42, 44)).verdict, /↓/);
});

test('이직 유형 본문은 강점과 주의점을 한 문장씩 담는다', () => {
  const view = buildGuardianConcernView('job_change', tiger, scores(70, 50, 50));

  assert.equal(view.body.length, 2);
  assert.ok(tiger.strength.startsWith(view.body[0]), '강점은 천간 문장을 쓴다');
  assert.ok(tiger.blind_spot.endsWith(view.body[1]), '주의점은 지지 문장을 쓴다');
});

test('알 수 없는 유형이 들어와도 첫 유형으로 떨어진다', () => {
  const view = buildGuardianConcernView('nope' as GuardianConcernType, tiger, scores(50, 50, 50));

  assert.equal(view.type, 'career_flow');
  assert.ok(view.ctaLabel);
});

test('수호신 이유 블록은 화면에 보이는 이름으로 부른다', () => {
  const reason = buildGuardianReason(tiger, '새싹호랑이');
  assert.ok(reason.headline.includes('새싹호랑이'), '별명을 넘기면 별명으로 부른다');
  assert.ok(reason.closing.includes('새싹호랑이'));

  assert.ok(reason.body.length > 0);
  // 이름을 안 넘기면 캐릭터 제목으로 돌아간다.
  assert.ok(buildGuardianReason(tiger).headline.includes(tiger.title));
  // 바로 위 인용구가 summary_og를 쓰므로 마무리 문장이 그걸 되풀이하면 안 된다.
  assert.equal(reason.closing.includes(tiger.summary_og), false);
  assert.equal(/^[^\p{L}\p{N}]/u.test(reason.closing.split('당신의 수호신은, ')[1]), false, 'core_type 이모지는 떼고 쓴다');
});
