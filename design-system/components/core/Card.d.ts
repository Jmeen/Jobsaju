export interface CardProps {
  children: React.ReactNode;
  /** card(기본 베이지) · strong(진한 베이지, 중첩 카드) · brand-soft(연초록, 오행 강조 박스) */
  tone?: 'card' | 'strong' | 'brand-soft';
  style?: React.CSSProperties;
}
/**
 * @startingPoint section="Core" subtitle="본문 배경보다 한 톤 진한 베이지 카드" viewport="700x160"
 */
export function Card(props: CardProps): JSX.Element;

export interface ScreenShellProps {
  children: React.ReactNode;
  /** 현재 사용자 일간의 오행 — 화면 전체의 --jg-guardian-accent/soft를 이 값으로 바꾼다 */
  element?: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
}
/** 390px 폭 모바일 화면 컨테이너. 모든 UI 킷 화면의 루트로 쓴다. */
export function ScreenShell(props: ScreenShellProps): JSX.Element;
