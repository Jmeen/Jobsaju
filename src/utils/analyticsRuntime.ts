import type { PostHogInterface } from 'posthog-js';
import { rememberOnce, sanitizeAnalyticsProperties, type AnalyticsProperties, type FunnelEvent } from './analyticsPolicy.ts';

type Client = Pick<PostHogInterface, 'capture' | 'get_distinct_id' | 'get_session_id' | 'has_opted_out_capturing'>;
type Options = {
  properties: () => AnalyticsProperties;
  storage: () => Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
};

/** Isolated, failure-safe tracker; SDK availability never gates a business action. */
export function createAnalyticsRuntime({ properties, storage, now = Date.now }: Options) {
  let active = false;
  let client: Client | undefined;
  let lastScreen = '';
  const pending: Array<() => void> = [];
  const seen = new Set<string>();
  const clickTimes = new Map<string, number>();

  function capture(event: string, input: AnalyticsProperties) {
    const safe = sanitizeAnalyticsProperties({ ...properties(), ...input });
    const timestamp = new Date(now());
    const send = () => { try { client?.capture(event, safe, { timestamp }); } catch { /* nonblocking */ } };
    if (client) send();
    else if (pending.length < 100) pending.push(send);
  }
  function trackFunnel(event: FunnelEvent, input: AnalyticsProperties = {}, scope?: string) {
    try {
      if (!active) return;
      if (scope && !rememberOnce(`jobsaju_ph:${event}:${scope}`, seen, storage())) return;
      capture(event, input);
    } catch { /* analytics cannot break the app */ }
  }
  return {
    start() { active = true; },
    stop() { active = false; client = undefined; pending.length = 0; },
    ready(sdk: Client) {
      if (!active) return;
      client = sdk;
      for (const send of pending.splice(0)) send();
    },
    trackFunnel,
    trackClick(event: FunnelEvent, input: AnalyticsProperties = {}) {
      try {
        if (!active) return;
        const key = `${event}:${input.report_id || ''}:${input.share_channel || ''}`;
        const previous = clickTimes.get(key);
        if (previous !== undefined && now() - previous < 800) return;
        clickTimes.set(key, now());
        trackFunnel(event, input);
      } catch { /* nonblocking */ }
    },
    trackScreen(screen: string, input: AnalyticsProperties = {}) {
      try {
        if (!active) return;
        const key = `${screen}:${input.report_id || ''}`;
        if (lastScreen === key) return;
        lastScreen = key;
        capture('$pageview', { screen, ...input });
      } catch { /* nonblocking */ }
    },
    paymentAnalyticsContext(reportId?: string): AnalyticsProperties | undefined {
      try {
        if (!active || !client || client.has_opted_out_capturing()) return;
        return {
          distinct_id: client.get_distinct_id(), $session_id: client.get_session_id(),
          ...sanitizeAnalyticsProperties({ ...properties(), report_id: reportId }),
        };
      } catch { return; }
    },
  };
}

type Scheduler = {
  requestAnimationFrame: (callback: () => void) => number;
  requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
};
/** Import only after a paint opportunity; hidden tabs have a bounded fallback. */
export function scheduleAnalyticsLoad(load: () => void, scheduler: Scheduler) {
  let started = false;
  const begin = () => {
    if (started) return;
    started = true;
    scheduler.clearTimeout(fallback);
    try { load(); } catch { /* analytics bootstrap cannot prevent React rendering */ }
  };
  const fallback = scheduler.setTimeout(begin, 2000);
  scheduler.requestAnimationFrame(() => {
    if (scheduler.requestIdleCallback) scheduler.requestIdleCallback(begin, { timeout: 1500 });
    else scheduler.setTimeout(begin, 0);
  });
}
