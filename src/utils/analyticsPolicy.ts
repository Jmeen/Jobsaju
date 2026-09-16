export const FUNNEL_EVENTS = [
  'landing_view', 'start_click', 'profile_complete', 'career_input_complete',
  'report_generated', 'report_view', 'report_scroll_50', 'report_scroll_90',
  'detail_report_click', 'checkout_view', 'purchase_complete', 'share_click',
  'second_report_generated',
] as const;
export type FunnelEvent = typeof FUNNEL_EVENTS[number];
export type AnalyticsProperties = Record<string, unknown>;

const tags = ['utm_source', 'utm_medium', 'utm_campaign', 'promo_code'] as const;
const enums: Record<string, readonly string[]> = {
  report_type: ['free_guardian', 'paid_career', 'followup_bonus'],
  device_type: ['mobile', 'tablet', 'desktop'],
  acquisition_channel: ['instagram_profile', 'instagram_post', 'instagram_reels', 'threads', 'blog', 'manychat', 'direct', 'other'],
  screen: ['landing', 'birth', 'summon', 'result_free', 'result_paid', 'paywall', 'personalize', 'checkout', 'lookup', 'error'],
  share_channel: ['kakao', 'copy', 'web_link', 'web_file', 'download'],
  checkout_stage: ['modal', 'pg', 'coupon'],
  input_mode: ['provided', 'skipped'],
  generation_source: ['server', 'client_fallback', 'share_bonus'],
};

export function safePath(value: string): string {
  return value === '/' || value === '/index.html' || /^\/jobbti\/[a-z0-9-]+\/?$/.test(value) ? value : '/';
}
export function safeUrl(value: string, originOnly = false): string | undefined {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    return url.origin + (originOnly ? '' : safePath(url.pathname));
  } catch { return; }
}

/** An allowlist, never a spread of birth/career/report/customer objects. */
export function sanitizeAnalyticsProperties(input: AnalyticsProperties): AnalyticsProperties {
  const output: AnalyticsProperties = {};
  for (const key of tags) {
    const value = input[key];
    if (typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) output[key] = value;
  }
  for (const [key, allowed] of Object.entries(enums)) {
    if (typeof input[key] === 'string' && allowed.includes(input[key] as string)) output[key] = input[key];
  }
  if (typeof input.price === 'number' && Number.isFinite(input.price) && input.price >= 0) output.price = input.price;
  if (typeof input.current_path === 'string') output.current_path = safePath(input.current_path);
  if (typeof input.referrer === 'string') {
    const url = safeUrl(input.referrer, true);
    if (url) output.referrer = url;
  }
  if (typeof input.report_id === 'string' && /^[0-9a-f-]{36}$/i.test(input.report_id)) output.report_id = input.report_id;
  return output;
}

export function acquisitionChannel(input: AnalyticsProperties): string {
  const source = String(input.utm_source || '').toLowerCase();
  const medium = String(input.utm_medium || '').toLowerCase();
  if (['instagram_profile', 'instagram_post', 'instagram_reels', 'threads', 'blog', 'manychat'].includes(source)) return source;
  if (source === 'instagram') {
    if (medium === 'profile') return 'instagram_profile';
    if (medium === 'post') return 'instagram_post';
    if (['reels', 'reel'].includes(medium)) return 'instagram_reels';
  }
  const referrer = String(input.referrer || '');
  if (/threads\.(net|com)/i.test(referrer)) return 'threads';
  if (/blog\.(naver|daum)\.com|tistory\.com/i.test(referrer)) return 'blog';
  return !source && !referrer ? 'direct' : 'other';
}

export function scrollThresholds(top: number, height: number, viewport: number): number[] {
  const travel = height - viewport;
  if (travel <= 0 || top <= 0) return [];
  const progress = Math.min(1, top / travel);
  return [50, 90].filter(threshold => progress >= threshold / 100);
}

const sdkKeys = new Set([
  'token', 'distinct_id', '$device_id', '$session_id', '$window_id', '$pageview_id', '$lib', '$lib_version',
  '$browser', '$browser_version', '$os', '$os_version', '$device', '$device_type',
  '$screen_height', '$screen_width', '$viewport_height', '$viewport_width',
  '$is_identified', '$process_person_profile', '$event_type', '$time', '$sent_at',
]);
const replayKeys = new Set(['$snapshot_data', '$snapshot_bytes', '$snapshot_source', '$snapshot_host']);
export function sanitizeSdkProperties(event: string, input: AnalyticsProperties): AnalyticsProperties {
  const output = sanitizeAnalyticsProperties(input);
  for (const [key, value] of Object.entries(input)) {
    if (sdkKeys.has(key) || (event === '$snapshot' && replayKeys.has(key))) output[key] = value;
    if (['$current_url', '$initial_current_url', '$session_entry_url'].includes(key) && typeof value === 'string') output[key] = safeUrl(value);
    if (['$referrer', '$initial_referrer'].includes(key) && typeof value === 'string') output[key] = safeUrl(value, true);
    if (key === '$pathname' && typeof value === 'string') output[key] = safePath(value);
  }
  return output;
}

export function rememberOnce(key: string, memory: Set<string>, storage?: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  if (memory.has(key)) return false;
  try { if (storage?.getItem(key)) { memory.add(key); return false; } } catch { /* storage denied */ }
  memory.add(key);
  try { storage?.setItem(key, '1'); } catch { /* memory still deduplicates */ }
  return true;
}
