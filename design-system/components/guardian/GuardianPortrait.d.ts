export type GuardianElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export interface Guardian {
  id: string;
  sequence: number;
  imageUrl: string;
  nickname: string;
  copy: string;
  ganzhiKo: string;
  animal: string;
  animalEmoji: string;
  element: GuardianElement;
  elementLabel: string;
}

export interface GuardianPortraitProps {
  guardian: Guardian;
  size?: number;
  alt?: string;
  eager?: boolean;
  /** 오행 색 후광을 뒤에 깐다 — 수호신 발표/공유 카드 등 하이라이트 순간 전용. */
  glow?: boolean;
}
/**
 * @startingPoint section="Guardian" subtitle="수호신 아트워크 + 이모지 폴백" viewport="700x320"
 */
export function GuardianPortrait(props: GuardianPortraitProps): JSX.Element;

export interface GuardianNameplateProps {
  guardian: Guardian;
  align?: 'center' | 'left';
}
/** 수호신 이름을 Display 폰트(Neo Dunggeunmo Pro)로 보여주는 타이틀. */
export function GuardianNameplate(props: GuardianNameplateProps): JSX.Element;
