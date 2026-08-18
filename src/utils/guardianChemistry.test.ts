import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateGuardianChemistry,
  chemistryCopy,
  findChemistryExtremes,
  parseGuardianId,
} from './guardianChemistry.ts';
import { GUARDIAN_TOTAL, guardianIdBySequence } from './guardianAssets.ts';

const ALL = Array.from({ length: GUARDIAN_TOTAL }, (_, i) => guardianIdBySequence(i + 1));

test('60갑자 id에서 천간과 지지를 뽑는다', () => {
  assert.deepEqual(parseGuardianId('甲寅'), { stem: '甲', branch: '寅' });
  assert.deepEqual(parseGuardianId('癸亥'), { stem: '癸', branch: '亥' });
});

test('1,770쌍 전체에서 양방향 점수와 근거가 같다', () => {
  let pairs = 0;
  for (let i = 0; i < ALL.length; i += 1) {
    for (let j = i + 1; j < ALL.length; j += 1) {
      const forward = calculateGuardianChemistry(ALL[i], ALL[j]);
      const backward = calculateGuardianChemistry(ALL[j], ALL[i]);
      assert.equal(forward.score, backward.score, `${ALL[i]}×${ALL[j]} 점수가 방향에 따라 다르다`);
      assert.equal(forward.dominantRelation, backward.dominantRelation);
      assert.deepEqual(forward.positiveReasons, backward.positiveReasons);
      assert.deepEqual(forward.negativeReasons, backward.negativeReasons);
      pairs += 1;
    }
  }
  assert.equal(pairs, 1770);
});

test('모든 점수가 0~100 안에 있다', () => {
  for (const a of ALL) {
    for (const b of ALL) {
      const { score } = calculateGuardianChemistry(a, b);
      assert.ok(score >= 0 && score <= 100, `${a}×${b} 점수가 범위를 벗어났다: ${score}`);
    }
  }
});

test('점수 규칙이 스펙 그대로다', () => {
  // 甲己는 천간합(+18), 지지 子未는 합·충 없음, 목↔토는 상극(-8)
  const ganHap = calculateGuardianChemistry('甲子', '己未');
  assert.equal(ganHap.score, 50 + 18 - 8);
  assert.ok(ganHap.positiveReasons.includes('gan_hap'));

  // 子丑 육합(+25). 甲·乙은 둘 다 목이라 상생도 상극도 없다.
  const zhiHap = calculateGuardianChemistry('甲子', '乙丑');
  assert.equal(zhiHap.score, 50 + 25);
  assert.ok(zhiHap.positiveReasons.includes('zhi_hap'));

  // 子午 충(-25), 목↔화 상생(+8)
  const chung = calculateGuardianChemistry('甲子', '丙午');
  assert.equal(chung.score, 50 - 25 + 8);
  assert.ok(chung.negativeReasons.includes('zhi_chung'));
});

test('동일 오행은 가점도 감점도 없지만 근거로는 남는다', () => {
  // 甲(목) × 乙(목), 지지 子·卯는 합·충 아님
  const result = calculateGuardianChemistry('甲子', '乙卯');
  assert.equal(result.score, 50);
  assert.ok(result.positiveReasons.includes('same_element'));
  assert.equal(result.positiveReasons.includes('element_flow'), false);
  assert.equal(result.negativeReasons.includes('element_clash'), false);
});

test('긍정과 부정이 겹치면 대표 관계는 충이 이긴다', () => {
  // 丁壬 천간합 + 巳亥 충
  const mixed = calculateGuardianChemistry('丁巳', '壬亥');
  assert.ok(mixed.positiveReasons.includes('gan_hap'));
  assert.ok(mixed.negativeReasons.includes('zhi_chung'));
  assert.equal(mixed.dominantRelation, 'zhi_chung');
});

test('모든 수호신에 찰떡과 티격태격이 하나씩 있고 자기 자신은 뽑히지 않는다', () => {
  for (const id of ALL) {
    const { best, worst } = findChemistryExtremes(id);
    assert.ok(best && worst, `${id}의 극단이 비었다`);
    assert.notEqual(best.id, id, `${id}가 자기 자신을 찰떡으로 골랐다`);
    assert.notEqual(worst.id, id, `${id}가 자기 자신을 티격태격으로 골랐다`);
    assert.ok(best.result.score >= worst.result.score);
  }
});

test('같은 입력이면 몇 번을 돌려도 같은 결과가 나온다', () => {
  for (const id of ['甲寅', '乙丑', '癸亥']) {
    const first = findChemistryExtremes(id);
    const second = findChemistryExtremes(id);
    assert.deepEqual(first, second);
  }
});

test('특정 수호신에 극단이 과도하게 몰리지 않는다', () => {
  const bestCount = new Map<string, number>();
  const worstCount = new Map<string, number>();
  for (const id of ALL) {
    const { best, worst } = findChemistryExtremes(id);
    bestCount.set(best.id, (bestCount.get(best.id) ?? 0) + 1);
    worstCount.set(worst.id, (worstCount.get(worst.id) ?? 0) + 1);
  }
  // 한 마리가 절반 넘게 독식하면 분포가 무너진 것이다.
  assert.ok(Math.max(...bestCount.values()) <= GUARDIAN_TOTAL / 2);
  assert.ok(Math.max(...worstCount.values()) <= GUARDIAN_TOTAL / 2);
});

test('관계마다 서로 다른 카피가 붙는다', () => {
  const relations = ['zhi_hap', 'gan_hap', 'element_flow', 'same_element', 'zhi_chung', 'element_clash', 'neutral'] as const;
  const copies = relations.map(chemistryCopy);
  assert.equal(new Set(copies).size, relations.length);
  for (const copy of copies) assert.ok(copy.length > 0);
});
