export interface CollectionBadgeProps {
  sequence: number;
  total?: number;
  element?: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
}
/**
 * @startingPoint section="Core" subtitle="60종 중 몇 번째인지 보여주는 수집 배지" viewport="700x100"
 */
export function CollectionBadge(props: CollectionBadgeProps): JSX.Element;
