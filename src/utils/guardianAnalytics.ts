export type GuardianEventName =
  | 'guardian_result_view' | 'guardian_match_section_view'
  | 'guardian_share_click' | 'guardian_share_sheet_opened' | 'guardian_share_confirmed'
  | 'guardian_share_link_copy'
  | 'guardian_share_landing_view' | 'guardian_result_complete_from_share'
  | 'paid_conversion';

export type GuardianAnalyticsIds = {
  visitorSessionId: string;
  resultSessionId: string;
  shareId: string | null;
};

/** 공유 유입원 = 무료/유료 공유를 가르는 축. 별도 share_type 컬럼 없이 이 값으로 구분한다. */
export type GuardianShareUtmSource = 'guardian_share' | 'report_share';

export type GuardianEventInput = {
  eventId: string;
  eventName: GuardianEventName;
  occurredAt: string;
  visitorSessionId?: string | null;
  resultSessionId?: string | null;
  shareId?: string | null;
  guardianId?: string | null;
  fromGuardianId?: string | null;
  shareChannel?: 'kakao' | 'copy' | 'web_link' | 'web_file' | 'download' | null;
  utmSource?: GuardianShareUtmSource | null;
};

export type GuardianAnalyticsTransport = {
  sendBeacon: (url: string, data: Blob) => boolean;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

type RandomUUID = () => string;

const VISITOR_SESSION_STORAGE_KEY = 'jobsaju_visitor_session_id';

const defaultRandomUUID: RandomUUID = () => crypto.randomUUID();

function getSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

const browserTransport: GuardianAnalyticsTransport = {
  sendBeacon: (url, data) => {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;
    return navigator.sendBeacon(url, data);
  },
  fetch: (input, init) => fetch(input, init),
};

export function getVisitorSessionId(
  storage: Storage | null = getSessionStorage(),
  randomUUID: RandomUUID = defaultRandomUUID,
): string {
  try {
    if (storage && typeof storage.getItem === 'function') {
      const existing = storage.getItem(VISITOR_SESSION_STORAGE_KEY);
      if (existing) return existing;
    }
  } catch {
    // Private browsing and denied storage must not block identity creation.
  }
  const visitorSessionId = randomUUID();
  try {
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(VISITOR_SESSION_STORAGE_KEY, visitorSessionId);
    }
  } catch {
    // Keep the identifier in memory when persistence is unavailable.
  }
  return visitorSessionId;
}

export function createResultSessionId(randomUUID: RandomUUID = defaultRandomUUID): string {
  return randomUUID();
}

export function getGuardianResultViewEventId(resultSessionId: string): string {
  return resultSessionId;
}

export function ensureShareId(
  shareId: string | null | undefined,
  randomUUID: RandomUUID = defaultRandomUUID,
): string {
  return shareId || randomUUID();
}

function compactEvent(input: GuardianEventInput): Record<string, unknown> {
  const event: Record<string, unknown> = {
    eventId: input.eventId,
    eventName: input.eventName,
    occurredAt: input.occurredAt,
    visitorSessionId: input.visitorSessionId,
    resultSessionId: input.resultSessionId,
    shareId: input.shareId,
    guardianId: input.guardianId,
    fromGuardianId: input.fromGuardianId,
    shareChannel: input.shareChannel,
    utmSource: input.utmSource,
  };
  for (const key of Object.keys(event)) {
    if (event[key] === undefined) delete event[key];
  }
  return event;
}

export async function trackGuardianEvent(
  input: GuardianEventInput,
  deps: GuardianAnalyticsTransport = browserTransport,
): Promise<void> {
  let body: string;
  let payload: Blob;
  try {
    body = JSON.stringify(compactEvent(input));
    payload = new Blob([body], { type: 'application/json' });
  } catch {
    // Malformed input or an unavailable Blob must never block product behavior.
    return;
  }
  try {
    if (deps.sendBeacon('/api/analytics', payload)) return;
  } catch {
    // Analytics must never block product behavior.
  }
  try {
    await deps.fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    // Analytics must never block product behavior.
  }
}
