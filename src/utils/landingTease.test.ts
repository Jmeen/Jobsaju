import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LANDING_TEASE_SET_SIZE,
  LANDING_TEASE_SETS,
  LANDING_TEASES,
  advanceTeaseSet,
  currentTeaseSetIndex,
  teaseSet,
  TEASE_COPY_MAX_LENGTH,
} from './landingTease.ts';
import { GUARDIAN_TOTAL, isGuardianId } from './guardianAssets.ts';

test('60마리가 빠짐없이 한 번씩 실린다', () => {
  assert.equal(LANDING_TEASES.length, GUARDIAN_TOTAL);

  const ids = LANDING_TEASES.map(tease => tease.guardian.id);
  assert.equal(new Set(ids).size, GUARDIAN_TOTAL, '같은 수호신이 두 번 실렸다');
  for (const { guardian } of LANDING_TEASES) {
    assert.ok(isGuardianId(guardian.id), `${guardian.id}는 60갑자가 아니다`);
  }
});

test('카피가 순번대로 맞는 수호신에 붙어 있다', () => {
  // 배열 한 줄이 밀리면 60개가 전부 엉뚱한 캐릭터의 카피를 달게 된다.
  LANDING_TEASES.forEach((tease, index) => {
    assert.equal(tease.guardian.sequence, index + 1);
  });
});

test('랜딩 카피는 한눈에 읽히는 길이여야 한다', () => {
  // 캐러셀이 1.8초마다 넘어간다. 이보다 길면 다 못 읽고 넘어가 아무것도 남지 않는다.
  for (const { guardian, copy } of LANDING_TEASES) {
    assert.ok(
      copy.length <= TEASE_COPY_MAX_LENGTH,
      `${guardian.nickname}: ${copy.length}자 — ${TEASE_COPY_MAX_LENGTH}자를 넘는다`,
    );
    assert.ok(copy.length >= 10, `${guardian.nickname}: 너무 짧아 성격이 안 드러난다`);
  }
});

test('랜딩 카피는 결과 화면 대사와 다른 문장이다', () => {
  // 같아지면 결과 화면에서 처음 보는 문장이 없어져 발표의 재미가 사라진다.
  for (const { guardian, copy } of LANDING_TEASES) {
    assert.notEqual(copy, guardian.copy, `${guardian.nickname}의 랜딩 카피가 결과 대사와 같다`);
  }
});

test('같은 카피를 두 캐릭터가 나눠 쓰지 않는다', () => {
  const copies = LANDING_TEASES.map(tease => tease.copy);

  assert.equal(new Set(copies).size, copies.length);
});

test('오행이 12마리씩 고르게 나뉘어 있다', () => {
  // arrangeTeases의 번갈아 세우기는 묶음 크기가 고를 때만 겹침 없음을 보장한다.
  const counts = new Map<string, number>();
  for (const { guardian } of LANDING_TEASES) {
    counts.set(guardian.element, (counts.get(guardian.element) ?? 0) + 1);
  }

  assert.deepEqual([...counts.values()], [12, 12, 12, 12, 12]);
});

/** 세트를 화면에 세운 순서 그대로 펼친다. */
function cardsOf(setIndex: number) {
  return teaseSet(setIndex).map(tease => tease.guardian);
}

test('열 세트가 여섯 장씩이다', () => {
  assert.equal(LANDING_TEASE_SETS.length, 10);
  for (const [index, set] of LANDING_TEASE_SETS.entries()) {
    assert.equal(set.length, LANDING_TEASE_SET_SIZE, `세트 ${index + 1}`);
  }
});

test('열 세트가 60마리를 겹치지 않게 나눠 담는다', () => {
  // 겹치면 어떤 수호신은 두 번 나오고 어떤 수호신은 영영 안 나온다.
  const all = LANDING_TEASE_SETS.flat();

  assert.equal(all.length, GUARDIAN_TOTAL);
  assert.equal(new Set(all).size, GUARDIAN_TOTAL, '같은 수호신이 두 세트에 들어 있다');
  assert.deepEqual([...all].sort((a, b) => a - b), Array.from({ length: GUARDIAN_TOTAL }, (_, i) => i + 1));
});

test('세트 번호가 실재하는 수호신을 가리킨다', () => {
  for (const [index, set] of LANDING_TEASE_SETS.entries()) {
    const cards = cardsOf(index);
    assert.equal(cards.length, LANDING_TEASE_SET_SIZE);
    cards.forEach((guardian, position) => {
      assert.equal(guardian.sequence, set[position], `세트 ${index + 1}의 ${position + 1}번째`);
      assert.ok(isGuardianId(guardian.id));
    });
  }
});

test('어떤 세트에서도 이웃한 두 장의 오행이 겹치지 않는다', () => {
  // 겹치면 카드가 넘어가도 후광 색이 그대로라 "다른 마리"로 읽히지 않는다.
  // 캐러셀은 마지막에서 첫 장으로 되감기므로 그 이음매까지 검사한다.
  for (const [index, _set] of LANDING_TEASE_SETS.entries()) {
    const cards = cardsOf(index);
    for (let position = 0; position < cards.length; position += 1) {
      const previous = cards[(position + cards.length - 1) % cards.length];
      assert.notEqual(
        cards[position].element,
        previous.element,
        `세트 ${index + 1}: ${previous.nickname} → ${cards[position].nickname}`,
      );
    }
  }
});

test('어떤 세트에서도 이웃한 두 장의 띠가 겹치지 않는다', () => {
  // 오행이 달라도 띠가 같으면 그림이 닮아 보인다 — 색만 다른 닭 둘이 연달아 서는 셈이다.
  for (const [index, _set] of LANDING_TEASE_SETS.entries()) {
    const cards = cardsOf(index);
    for (let position = 0; position < cards.length; position += 1) {
      const previous = cards[(position + cards.length - 1) % cards.length];
      assert.notEqual(
        cards[position].animalEmoji,
        previous.animalEmoji,
        `세트 ${index + 1}: ${previous.nickname} → ${cards[position].nickname}`,
      );
    }
  }
});

/** localStorage를 흉내 낸다. */
function fakeStorage(initial?: string) {
  const map = new Map<string, string>();
  if (initial !== undefined) map.set('jobsaju_landing_set_v1', initial);
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  } as unknown as Storage;
}

test('첫 방문자는 항상 1번 세트를 본다', () => {
  // 첫인상을 통제할 수 있어야 한다 — 첫 장에서 웃기지 못하면 두 번째 장은 안 본다.
  assert.equal(currentTeaseSetIndex(fakeStorage()), 0);
});

/** 한 번 방문한 것처럼 읽고 나서 다음 세트를 적어둔다. */
function visit(storage: Storage): number {
  const index = currentTeaseSetIndex(storage);
  advanceTeaseSet(index, storage);
  return index;
}

test('다시 올 때마다 다음 세트로 넘어가고 열 번째 뒤에 처음으로 돌아온다', () => {
  const storage = fakeStorage();
  const seen = Array.from({ length: 10 }, () => visit(storage));

  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(visit(storage), 0, '한 바퀴 뒤에는 다시 1번 세트다');
});

test('같은 방문에서 두 번 적어도 세트가 두 칸 건너뛰지 않는다', () => {
  // React가 개발 모드에서 효과를 두 번 실행한다. 저장된 값을 증가시키는 방식이었다면
  // 방문 한 번에 세트가 두 칸씩 넘어가 절반을 건너뛴다.
  const storage = fakeStorage();
  const index = currentTeaseSetIndex(storage);
  advanceTeaseSet(index, storage);
  advanceTeaseSet(index, storage);

  assert.equal(currentTeaseSetIndex(storage), 1);
});

test('열 번 방문하면 60마리를 모두 본다', () => {
  const storage = fakeStorage();
  const seen = new Set<string>();
  for (let count = 0; count < 10; count += 1) {
    for (const guardian of cardsOf(visit(storage))) seen.add(guardian.id);
  }

  assert.equal(seen.size, GUARDIAN_TOTAL);
});

test('저장된 값이 깨졌으면 1번 세트부터 다시 돈다', () => {
  for (const broken of ['', 'abc', '-1', '10', '3.5']) {
    assert.equal(currentTeaseSetIndex(fakeStorage(broken)), 0, `저장값 "${broken}"`);
  }
});

test('저장이 막힌 환경에서는 무작위 세트로 떨어진다', () => {
  // 시크릿 모드에서 매번 1번 세트만 보여주면 다시 온 사람에게 새 캐릭터가 없다.
  const blocked = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  } as unknown as Storage;

  const picked = currentTeaseSetIndex(blocked, () => 0.55);

  assert.ok(picked >= 0 && picked < LANDING_TEASE_SETS.length);
  assert.equal(picked, 5);
  // 저장이 막혀도 예외가 화면까지 올라오면 안 된다.
  assert.doesNotThrow(() => advanceTeaseSet(picked, blocked));
});
