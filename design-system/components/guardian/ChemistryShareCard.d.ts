import type { Guardian } from './GuardianPortrait';

export interface ChemistryShareCardProps {
  a: Guardian;
  b: Guardian;
  /** 궁합 점수 0-100 */
  score: number;
  /** guardianData의 chemistryCopy(relation) 결과. 비우면 기본 문구로 대체된다. */
  relation?: string;
  /** 카드 렌더 폭(px). square는 1:1, story는 9:16으로 높이가 자동 계산된다. */
  size?: number;
  aspect?: 'square' | 'story';
}

/**
 * @startingPoint section="Guardian" subtitle="궁합 비교 공유 카드 — 단체 카톡방/친구 태그용 2차 바이럴" viewport="700x420"
 */
export function ChemistryShareCard(props: ChemistryShareCardProps): JSX.Element;
