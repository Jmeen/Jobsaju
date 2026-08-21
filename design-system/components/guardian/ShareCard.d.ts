import type { Guardian } from './GuardianPortrait';

export interface ShareCardProps {
  guardian: Guardian;
  /** 카드 렌더 크기(px), 정사각형. 실제 저장 파일은 800x800 고정. */
  size?: number;
}

/**
 * @startingPoint section="Guardian" subtitle="60종 공통 공유 카드 템플릿 — 얼굴→이름→너는?→브랜드" viewport="700x420"
 */
export function ShareCard(props: ShareCardProps): JSX.Element;

/** DOM 미리보기(ShareCard)와 별개로 다운로드 PNG를 만드는 실제 렌더러. */
export function drawShareCardToCanvas(
  canvas: HTMLCanvasElement,
  guardian: Guardian,
  image: HTMLImageElement | null
): void;
