import type { Guardian } from './GuardianPortrait';

export interface ChemistryBlockProps {
  guardian: Guardian;
  /** guardianData의 이미지 경로 접두어 (예: 이 프로젝트 루트 기준 ".." ) */
  assetBase?: string;
  isSharing?: boolean;
  onShare?: () => void;
  onView?: () => void;
}

/**
 * @startingPoint section="Guardian" subtitle="찰떡+티격태격 궁합, 결과 화면의 유일한 공유 CTA" viewport="700x360"
 */
export function ChemistryBlock(props: ChemistryBlockProps): JSX.Element;
