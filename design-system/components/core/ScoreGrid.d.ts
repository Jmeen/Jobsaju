export interface ScoreItem {
  icon?: string;
  label: string;
  value: string;
  /** true면 유료 잠금처럼 블러 처리 (페이월 미리보기용) */
  locked?: boolean;
}
export interface ScoreGridProps { items: ScoreItem[]; }
/**
 * @startingPoint section="Core" subtitle="이직/협상/잔류 3분할 점수 그리드" viewport="700x140"
 */
export function ScoreGrid(props: ScoreGridProps): JSX.Element;
