// 수호신 두 마리의 직장 케미. 스펙: docs/superpowers/specs/2026-08-17-guardian-chemistry-share-loop-design.md
//
// React·브라우저 API·네트워크와 무관한 순수 모듈이다.
// 관계 표는 여기 직접 둔다 — sajuCore에서 가져오면 253KB짜리 만세력 엔진이
// 랜딩까지 딸려 들어온다.
import { GUARDIAN_TOTAL, guardianElement, guardianIdBySequence, isGuardianId } from './guardianAssets.ts';
import type { GuardianElement } from './guardianAssets.ts';

export type ChemistryRelation =
  | 'zhi_chung'      // 지지 충
  | 'zhi_hap'        // 지지 육합
  | 'gan_hap'        // 천간합
  | 'element_clash'  // 오행 상극
  | 'element_flow'   // 오행 상생
  | 'same_element'   // 동일 오행
  | 'neutral';

export type ChemistryResult = {
  score: number;
  positiveReasons: ChemistryRelation[];
  negativeReasons: ChemistryRelation[];
  dominantRelation: ChemistryRelation;
};

const BASE_SCORE = 50;
const GAN_HAP_BONUS = 18;
const ZHI_HAP_BONUS = 25;
const ZHI_CHUNG_PENALTY = 25;
const ELEMENT_FLOW_BONUS = 8;
const ELEMENT_CLASH_PENALTY = 8;

/** 천간합 다섯 쌍. */
const GAN_HAP: Readonly<Record<string, string>> = {
  甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛',
  辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊',
};

/** 지지 육합 여섯 쌍. */
const ZHI_HAP: Readonly<Record<string, string>> = {
  子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌',
  戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午',
};

/** 지지 충 여섯 쌍. */
const ZHI_CHUNG: Readonly<Record<string, string>> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申',
  申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

/** 상생: 목→화→토→금→수→목 */
const GENERATES: Readonly<Record<GuardianElement, GuardianElement>> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};

/** 상극: 목→토→수→화→금→목 */
const CONTROLS: Readonly<Record<GuardianElement, GuardianElement>> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};

export function parseGuardianId(id: string): { stem: string; branch: string } {
  return { stem: id.slice(0, 1), branch: id.slice(1, 2) };
}

// 전체 대표 관계 우선순위. 긍정·부정이 섞이면 점수에는 둘 다 반영하되 대표는 이 순서로 정한다.
const DOMINANT_ORDER: readonly ChemistryRelation[] = [
  'zhi_chung', 'zhi_hap', 'gan_hap', 'element_clash', 'element_flow', 'same_element',
];

/**
 * 두 수호신의 케미. 방향성 해석이 아니라 쌍의 성질이므로 인자 순서를 바꿔도 결과가 같다.
 */
export function calculateGuardianChemistry(aId: string, bId: string): ChemistryResult {
  const a = parseGuardianId(aId);
  const b = parseGuardianId(bId);
  const aElement = guardianElement(aId);
  const bElement = guardianElement(bId);

  const hasGanHap = GAN_HAP[a.stem] === b.stem;
  const hasZhiHap = ZHI_HAP[a.branch] === b.branch;
  const hasZhiChung = ZHI_CHUNG[a.branch] === b.branch;
  // 상생·상극은 양방향을 모두 보고, 존재 여부만 한 번 반영한다.
  const hasFlow = GENERATES[aElement] === bElement || GENERATES[bElement] === aElement;
  const hasClash = CONTROLS[aElement] === bElement || CONTROLS[bElement] === aElement;
  const sameElement = aElement === bElement;

  let score = BASE_SCORE;
  if (hasGanHap) score += GAN_HAP_BONUS;
  if (hasZhiHap) score += ZHI_HAP_BONUS;
  if (hasZhiChung) score -= ZHI_CHUNG_PENALTY;
  if (hasFlow) score += ELEMENT_FLOW_BONUS;
  if (hasClash) score -= ELEMENT_CLASH_PENALTY;
  score = Math.max(0, Math.min(100, score));

  const positiveReasons: ChemistryRelation[] = [];
  if (hasZhiHap) positiveReasons.push('zhi_hap');
  if (hasGanHap) positiveReasons.push('gan_hap');
  if (hasFlow) positiveReasons.push('element_flow');
  if (sameElement) positiveReasons.push('same_element');

  const negativeReasons: ChemistryRelation[] = [];
  if (hasZhiChung) negativeReasons.push('zhi_chung');
  if (hasClash) negativeReasons.push('element_clash');

  const present = new Set<ChemistryRelation>([...positiveReasons, ...negativeReasons]);
  const dominantRelation = DOMINANT_ORDER.find(relation => present.has(relation)) ?? 'neutral';

  return { score, positiveReasons, negativeReasons, dominantRelation };
}

const ALL_IDS: readonly string[] = Array.from(
  { length: GUARDIAN_TOTAL },
  (_, index) => guardianIdBySequence(index + 1),
);

export type ChemistryMatch = {
  id: string;
  result: ChemistryResult;
};

function has(result: ChemistryResult, relation: ChemistryRelation): boolean {
  return result.positiveReasons.includes(relation) || result.negativeReasons.includes(relation);
}

/** 동점일 때 관계가 더 뚜렷한 쪽을 앞세우고, 마지막에만 60갑자 순서를 쓴다. */
function compareBest(x: ChemistryMatch, y: ChemistryMatch): number {
  if (x.result.score !== y.result.score) return y.result.score - x.result.score;
  for (const relation of ['zhi_hap', 'gan_hap', 'element_flow', 'same_element'] as const) {
    const diff = Number(has(y.result, relation)) - Number(has(x.result, relation));
    if (diff !== 0) return diff;
  }
  return ALL_IDS.indexOf(x.id) - ALL_IDS.indexOf(y.id);
}

function compareWorst(x: ChemistryMatch, y: ChemistryMatch): number {
  if (x.result.score !== y.result.score) return x.result.score - y.result.score;
  for (const relation of ['zhi_chung', 'element_clash'] as const) {
    const diff = Number(has(y.result, relation)) - Number(has(x.result, relation));
    if (diff !== 0) return diff;
  }
  return ALL_IDS.indexOf(x.id) - ALL_IDS.indexOf(y.id);
}

/** 자기 자신을 뺀 59종을 모두 평가해 찰떡·티격태격을 하나씩 고른다. */
export function findChemistryExtremes(id: string): { best: ChemistryMatch; worst: ChemistryMatch } {
  const selfId = isGuardianId(id) ? id : ALL_IDS[0];
  const candidates: ChemistryMatch[] = ALL_IDS
    .filter(other => other !== selfId)
    .map(other => ({ id: other, result: calculateGuardianChemistry(selfId, other) }));

  const best = [...candidates].sort(compareBest)[0];
  const worst = [...candidates].sort(compareWorst)[0];
  return { best, worst };
}

/** 관계별 카피. 계산 엔진은 문구를 만들지 않는다는 스펙에 따라 여기서만 관리한다. */
const RELATION_COPY: Record<ChemistryRelation, string> = {
  zhi_hap: '서로의 빈틈을 채우는 조합',
  gan_hap: '결이 잘 맞아 손발이 붙는 조합',
  element_flow: '한쪽이 밀어주면 다른 쪽이 자라는 조합',
  same_element: '비슷한 방식으로 일하는 조합',
  zhi_chung: '둘 다 자기 방식이 확실한 조합',
  element_clash: '속도와 기준이 자주 부딪히는 조합',
  neutral: '무난하게 각자 몫을 하는 조합',
};

export function chemistryCopy(relation: ChemistryRelation): string {
  return RELATION_COPY[relation];
}
