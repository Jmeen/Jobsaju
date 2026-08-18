// 공유 attribution(유입 추적) + analytics 전송.
//
// 기존 공유 로직(kakaoShare.ts의 sendDefault + 폴백 체인, 카카오 웹훅 기반 보너스 unlock)은
// 그대로 두고, "이 공유가 어디서 와서 어디로 갔는지"를 URL과 이벤트로만 얹는다.
// 개인정보(이름·이메일·생년월일·전화번호·카카오 계정)는 이 모듈 어디에서도 다루지 않는다.

export type ShareMedium = 'kakao' | 'link' | 'file' | 'download';

export type ShareAttribution = {
  /** 공유한 사람의 캐릭터(일주 한자, 예: "甲寅") */
  fromCharacter: string;
  /** 표시용 캐릭터 이름 — 랜딩 화면 등에서만 쓰고 attribution 값 자체는 아니다 */
  fromCharacterName?: string;
  shareSessionId: string;
  utmSource: string;
  utmMedium: string;
};

export type ShareTrackingEvent =
  | 'guardian_share_kakao_click'
  | 'guardian_share_link_copy'
  | 'guardian_share_landing'
  | 'guardian_result_completed_from_share';

export type ShareTrackingPayload = {
  characterId?: string;
  fromCharacter?: string;
  shareSessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  medium?: string;
};

const OUTGOING_SESSION_STORAGE_KEY = 'saju_share_session_id_v1';
const INCOMING_ATTRIBUTION_STORAGE_KEY = 'saju_share_attribution_v1';
const UTM_SOURCE = 'character_share';

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* noop */
  }
  return `share-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * "내가 만든 공유 흐름"을 식별하는 값 — 지금 보고 있는 결과 하나를 여러 번 공유해도(카카오 재시도 등)
 * 같은 값을 재사용해야, 그 값으로 묶었을 때 "한 번의 공유 흐름이 만든 완료 결과 수"를 셀 수 있다.
 *
 * incoming attribution(친구가 보낸 링크로 내가 들어왔을 때의 shareSessionId, INCOMING_ATTRIBUTION_STORAGE_KEY)과는
 * 완전히 다른 storage 키를 쓴다 — 내가 "받은" 흐름과 내가 "새로 시작하는" 흐름을 절대 같은 값으로 섞지 않는다.
 *
 * 새 결과가 생성될 때마다 호출부(AppContext)가 resetOutgoingShareSessionId를 먼저 불러 이전 값을 지우므로,
 * 여기서는 "지금 저장된 값이 있으면 재사용, 없으면 새로 만든다"는 단순한 규칙만 지킨다.
 */
export function getOrCreateOutgoingShareSessionId(storage: Storage | null = safeSessionStorage()): string {
  if (!storage) return randomId();
  try {
    const existing = storage.getItem(OUTGOING_SESSION_STORAGE_KEY);
    if (existing) return existing;
  } catch {
    /* noop */
  }
  const created = randomId();
  try {
    storage.setItem(OUTGOING_SESSION_STORAGE_KEY, created);
  } catch {
    /* noop */
  }
  return created;
}

/**
 * 새 결과가 생성될 때 호출한다 — 이전 결과를 공유하며 만들어진 outbound shareSessionId를 지워서,
 * 이번 결과를 공유할 때는 getOrCreateOutgoingShareSessionId가 반드시 새 값을 만들게 한다.
 * ("다른 생년월일로 다시 보기"로 같은 탭에서 여러 결과를 만들어도 공유 흐름이 서로 섞이면 안 된다.)
 */
export function resetOutgoingShareSessionId(storage: Storage | null = safeSessionStorage()): void {
  try {
    storage?.removeItem(OUTGOING_SESSION_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** 공유되는 URL에 attribution 쿼리를 붙인다. baseUrl은 서비스 루트든 개인화 공유 랜딩이든 상관없다. */
export function buildCharacterShareUrl({
  baseUrl,
  dayPillar,
  shareSessionId,
  medium,
}: {
  baseUrl: string;
  dayPillar: string;
  shareSessionId: string;
  medium: ShareMedium;
}): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('fromCharacter', dayPillar);
    url.searchParams.set('utm_source', UTM_SOURCE);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('shareSessionId', shareSessionId);
    return url.toString();
  } catch {
    // baseUrl이 절대 URL이 아닌 경우(테스트 등) — attribution 없이 원본을 그대로 돌려준다.
    return baseUrl;
  }
}

/** 공유받아 들어온 방문(쿼리 파라미터)에서 attribution을 읽는다. 순수 함수 — 저장/전송은 호출부 책임. */
export function resolveShareAttribution(search: string): ShareAttribution | null {
  const params = new URLSearchParams(search);
  const shareSessionId = params.get('shareSessionId');
  const fromCharacter = params.get('fromCharacter');
  if (!shareSessionId || !fromCharacter) return null;
  return {
    fromCharacter,
    shareSessionId,
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
  };
}

export function saveIncomingShareAttribution(attribution: ShareAttribution, storage: Storage | null = safeSessionStorage()): void {
  try {
    storage?.setItem(INCOMING_ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    /* noop */
  }
}

export function loadIncomingShareAttribution(storage: Storage | null = safeSessionStorage()): ShareAttribution | null {
  try {
    const raw = storage?.getItem(INCOMING_ATTRIBUTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 공유 이벤트를 서버로 보낸다. 실패해도 절대 던지지 않는다 — 결과 화면 기능에 영향을 주면 안 된다. */
export function trackShareEvent(event: ShareTrackingEvent, payload: ShareTrackingPayload = {}): void {
  if (typeof fetch === 'undefined') return;
  try {
    void fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true,
    }).catch(() => {
      /* analytics 실패는 조용히 무시한다 */
    });
  } catch {
    /* noop */
  }
}
