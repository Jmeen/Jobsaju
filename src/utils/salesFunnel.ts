// 채널·콘텐츠별 판매 퍼널(방문 → 무료 결과 → 결제 시작)을 자체 서버에 남긴다.
// PostHog 연결 여부와 무관하게 동작하며, 결제 확인 단계는 서버만 기록한다.
// 보내는 값은 익명 세션 UUID와 UTM 태그뿐이다 — 이름·이메일·생년월일은 넣지 않는다.
import { getVisitorSessionId } from './guardianAnalytics.ts';

export type SalesEventName = 'visit' | 'free_result_view' | 'paywall_view' | 'checkout_open' | 'checkout_start';

export type SalesAttribution = {
  visitorSessionId: string;
  resultSessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
};

type Touch = Pick<SalesAttribution, 'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent'>;

const TOUCH_STORAGE_KEY = 'jobsaju_sales_touch_v1';
const TAG_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const sent = new Set<string>();
let memoryTouch: Touch | undefined;

function sessionStore(): Storage | null {
  try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; } catch { return null; }
}

/** URL의 UTM에서 형식이 맞는 태그만 남긴다. */
export function parseSalesTouch(search: string): Touch {
  const query = new URLSearchParams(search);
  const touch: Touch = {};
  const pairs = [
    ['utmSource', 'utm_source'], ['utmMedium', 'utm_medium'],
    ['utmCampaign', 'utm_campaign'], ['utmContent', 'utm_content'],
  ] as const;
  for (const [key, param] of pairs) {
    const value = query.get(param);
    if (value && TAG_PATTERN.test(value)) touch[key] = value;
  }
  return touch;
}

/**
 * 같은 탭의 최초 유입을 보관한다. 결제 리디렉션과 URL 정리 뒤에도 유지되어야 하므로
 * 앱이 주소를 건드리기 전에 한 번 호출한다.
 */
export function captureSalesTouch(search: string, storage: Storage | null = sessionStore()): Touch {
  if (memoryTouch) return memoryTouch;
  const current = parseSalesTouch(search);
  try {
    const saved = storage?.getItem(TOUCH_STORAGE_KEY);
    if (saved) {
      const savedTouch = JSON.parse(saved) as Touch;
      // 태그 없이 들어왔던 탭에서 나중에 캠페인 링크를 열면 그 링크를 유입으로 본다.
      if (savedTouch.utmSource || !current.utmSource) {
        memoryTouch = savedTouch;
        return memoryTouch;
      }
    }
  } catch { /* 저장소를 못 쓰면 메모리에만 둔다 */ }
  memoryTouch = current;
  try { storage?.setItem(TOUCH_STORAGE_KEY, JSON.stringify(memoryTouch)); } catch { /* memory only */ }
  return memoryTouch;
}

export function salesAttribution(resultSessionId?: string): SalesAttribution | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return {
      visitorSessionId: getVisitorSessionId(),
      ...(resultSessionId ? { resultSessionId } : {}),
      ...captureSalesTouch(window.location.search),
    };
  } catch {
    return undefined;
  }
}

/** scope가 같으면 탭 세션에서 한 번만 보낸다. 실패해도 화면 동작을 막지 않는다. */
export function trackSales(eventName: SalesEventName, resultSessionId?: string, scope: string = resultSessionId || 'session'): void {
  try {
    const attribution = salesAttribution(resultSessionId);
    if (!attribution) return;
    const onceKey = `jobsaju_sales:${eventName}:${scope}`;
    if (sent.has(onceKey)) return;
    const storage = sessionStore();
    try { if (storage?.getItem(onceKey)) { sent.add(onceKey); return; } } catch { /* storage denied */ }
    sent.add(onceKey);
    try { storage?.setItem(onceKey, '1'); } catch { /* memory still deduplicates */ }

    const body = JSON.stringify({
      eventId: crypto.randomUUID(),
      eventName,
      occurredAt: new Date().toISOString(),
      ...attribution,
    });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
      && navigator.sendBeacon('/api/funnel', new Blob([body], { type: 'application/json' }))) return;
    void fetch('/api/funnel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
    }).catch(() => { /* nonblocking */ });
  } catch { /* 측정은 서비스 동작을 바꾸지 않는다 */ }
}
