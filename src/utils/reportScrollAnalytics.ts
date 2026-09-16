import { scrollThresholds } from './analyticsPolicy.ts';

/** The visible viewport may differ from innerHeight on mobile browser chrome. */
export function reportScrollThresholds(rect: Pick<DOMRect, 'top' | 'height'>, innerHeight: number, viewport?: Pick<VisualViewport, 'height' | 'offsetTop'> | null) {
  const height = viewport?.height || innerHeight;
  const offset = viewport?.offsetTop || 0;
  return scrollThresholds(offset - rect.top, rect.height, height);
}
