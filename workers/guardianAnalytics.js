import guardianCharacters from '../free_engine_characters.js';

const MAX_BODY_BYTES = 4 * 1024;
export const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const GUARDIAN_IDS = new Set(guardianCharacters.map(({ id }) => id));
const SHARE_CHANNELS = new Set(['kakao', 'copy', 'web_link', 'web_file', 'download']);

export const GUARDIAN_EVENT_NAMES = new Set([
  'guardian_result_view', 'guardian_match_section_view',
  'guardian_share_click', 'guardian_share_sheet_opened', 'guardian_share_confirmed',
  'guardian_share_link_copy',
  'guardian_share_landing_view', 'guardian_result_complete_from_share',
  'paid_conversion',
]);
const BROWSER_GUARDIAN_EVENT_NAMES = new Set(
  [...GUARDIAN_EVENT_NAMES].filter(eventName => eventName !== 'guardian_share_confirmed'),
);

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

function isUuidV4(value) {
  return typeof value === 'string' && UUID_V4_PATTERN.test(value);
}

function isNullableUuid(value) {
  return value == null || isUuidV4(value);
}

function isNullableGuardianId(value) {
  return value == null || (typeof value === 'string' && GUARDIAN_IDS.has(value));
}

function isNullableShareChannel(value) {
  return value == null || (typeof value === 'string' && SHARE_CHANNELS.has(value));
}

// occurred_at은 클라이언트가 채우는데 모든 KPI 윈도우가 이 값으로 잘린다.
// 형식만 검사하면 시계가 틀어졌거나 악의적인 클라이언트가 리포팅 구간을 오염시킬 수 있으므로
// 서버 시각 기준 창 밖의 값은 받지 않는다. 과거 폭은 keepalive·오프라인 재전송을 감안해 넉넉히,
// 미래 폭은 단말 시계 오차만 흡수할 만큼만 둔다.
const MAX_OCCURRED_AT_PAST_MS = 24 * 60 * 60 * 1000;
const MAX_OCCURRED_AT_FUTURE_MS = 15 * 60 * 1000;

function isValidOccurredAt(value, now) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString() !== value) return false;
  const drift = timestamp - now;
  return drift <= MAX_OCCURRED_AT_FUTURE_MS && drift >= -MAX_OCCURRED_AT_PAST_MS;
}

// /api/analytics는 인증 없는 공개 D1 쓰기 경로다. 스키마 검증만으로는 매번 새 event_id를 만드는
// 반복 호출을 막지 못하므로 발신지별 상한을 둔다.
// 한계: Pages Functions에는 Workers의 rate limit 바인딩이 없어 이 카운터는 아이솔레이트 로컬이다.
// 분산된 대량 유입까지 막으려면 Cloudflare 대시보드의 WAF Rate Limiting 규칙이 필요하다.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_EVENTS = 60; // 정상 세션의 퍼널 이벤트는 분당 한 자릿수다.
const RATE_LIMIT_MAX_TRACKED_CLIENTS = 5000;

const rateLimitBuckets = new Map();

function isRateLimited(buckets, clientKey, now) {
  const bucket = buckets.get(clientKey);
  if (!bucket || now >= bucket.resetAt) {
    // 메모리가 무한히 늘지 않도록 만료분을 먼저 걷어내고, 그래도 넘치면 창을 새로 시작한다.
    if (buckets.size >= RATE_LIMIT_MAX_TRACKED_CLIENTS) {
      for (const [key, tracked] of buckets) {
        if (now >= tracked.resetAt) buckets.delete(key);
      }
      if (buckets.size >= RATE_LIMIT_MAX_TRACKED_CLIENTS) buckets.clear();
    }
    buckets.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_EVENTS;
}

async function readBodyWithinLimit(request) {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
    return null;
  }

  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) return null;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(mergeChunks(chunks, totalBytes));
}

function mergeChunks(chunks, totalBytes) {
  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

async function readAndValidateAnalyticsBody(request, now) {
  let text;
  try {
    text = await readBodyWithinLimit(request);
  } catch {
    return { ok: false, error: 'Invalid analytics request body' };
  }
  if (text == null) return { ok: false, error: 'Analytics request body exceeds 4 KB' };

  let event;
  try {
    event = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  if (!event || Array.isArray(event) || typeof event !== 'object') {
    return { ok: false, error: 'Invalid analytics event' };
  }

  const value = {
    eventId: event.eventId,
    eventName: event.eventName,
    occurredAt: event.occurredAt,
    visitorSessionId: event.visitorSessionId ?? null,
    resultSessionId: event.resultSessionId ?? null,
    shareId: event.shareId ?? null,
    guardianId: event.guardianId ?? null,
    fromGuardianId: event.fromGuardianId ?? null,
    shareChannel: event.shareChannel ?? null,
    utmSource: event.utmSource ?? null,
  };

  if (!isUuidV4(value.eventId)) return { ok: false, error: 'Invalid eventId' };
  if (!BROWSER_GUARDIAN_EVENT_NAMES.has(value.eventName)) return { ok: false, error: 'Invalid eventName' };
  if (!isValidOccurredAt(value.occurredAt, now)) return { ok: false, error: 'Invalid occurredAt' };
  if (![value.visitorSessionId, value.resultSessionId, value.shareId].every(isNullableUuid)) {
    return { ok: false, error: 'Invalid analytics identifier' };
  }
  if (![value.guardianId, value.fromGuardianId].every(isNullableGuardianId)) {
    return { ok: false, error: 'Invalid guardian ID' };
  }
  if (!isNullableShareChannel(value.shareChannel)) return { ok: false, error: 'Invalid share channel' };
  // 무료(guardian_share)와 유료(report_share) 공유를 utm_source로 가른다. 별도 share_type 컬럼은 두지 않는다.
  if (value.utmSource !== null && value.utmSource !== 'guardian_share' && value.utmSource !== 'report_share') {
    return { ok: false, error: 'Invalid utm source' };
  }

  return { ok: true, value };
}

export async function recordGuardianAnalyticsEvent(env, event) {
  try {
    await env.DB.prepare(`
      INSERT INTO guardian_analytics_events (
        event_id, event_name, occurred_at, visitor_session_id, result_session_id,
        share_id, guardian_id, from_guardian_id, share_channel, utm_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      event.eventId,
      event.eventName,
      event.occurredAt,
      event.visitorSessionId ?? null,
      event.resultSessionId ?? null,
      event.shareId ?? null,
      event.guardianId ?? null,
      event.fromGuardianId ?? null,
      event.shareChannel ?? null,
      event.utmSource ?? null,
    ).run();
    return 'inserted';
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: guardian_analytics_events\.event_id/i.test(error.message)) {
      return 'duplicate';
    }
    throw error;
  }
}

export async function handleGuardianAnalyticsRequest(request, env, { now = Date.now(), buckets = rateLimitBuckets } = {}) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/analytics') return null;
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!env.DB) return json({ error: 'Analytics unavailable' }, 503);

  // CF-Connecting-IP는 엣지가 채우며 여기서 카운터 키로만 쓰고 D1에는 저장하지 않는다.
  const clientKey = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(buckets, clientKey, now)) {
    return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)),
      },
    });
  }

  const body = await readAndValidateAnalyticsBody(request, now);
  if (!body.ok) return json({ error: body.error }, 400);
  await recordGuardianAnalyticsEvent(env, body.value);
  return json({ accepted: true }, 202);
}
