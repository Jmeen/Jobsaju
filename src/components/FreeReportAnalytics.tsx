import { useEffect, useRef } from 'react';
import { reportScrollThresholds } from '../utils/reportScrollAnalytics';
import { trackFunnel, trackScreen } from '../utils/posthogAnalytics';

/** Mounted inside the lazy result screen, never before the result DOM is visible. */
export function useFreeReportAnalytics(reportId: string, ready: boolean) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ready || !ref.current) return;
    const properties = { report_type: 'free_guardian', report_id: reportId };
    const scope = reportId;
    let frame = 0;
    let hasScrolled = false;
    const visible = () => {
      if (document.visibilityState !== 'visible') return;
      trackScreen('result_free', properties);
      trackFunnel('report_view', properties, scope);
    };
    const measure = () => {
      frame = 0;
      if (!hasScrolled) return;
      if (document.visibilityState !== 'visible' || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      for (const threshold of reportScrollThresholds(rect, window.innerHeight, window.visualViewport)) {
        trackFunnel(threshold === 50 ? 'report_scroll_50' : 'report_scroll_90', properties, scope);
      }
    };
    const schedule = () => { if (!frame && hasScrolled) frame = window.requestAnimationFrame(measure); };
    const onScroll = () => { hasScrolled = true; schedule(); };
    visible();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [reportId, ready]);
  return ref;
}
