import guardianCharacters from '../free_engine_characters.js';

const MAX_BODY_BYTES = 4 * 1024;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GUARDIAN_IDS = new Set(guardianCharacters.map(({ id }) => id));
const SHARE_CHANNELS = new Set(['kakao', 'web_link', 'web_file', 'download']);

export const GUARDIAN_EVENT_NAMES = new Set([
  'guardian_result_view', 'guardian_match_section_view',
  'guardian_share_click', 'guardian_share_sheet_opened', 'guardian_share_confirmed',
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

function isValidOccurredAt(value) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
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

async function readAndValidateAnalyticsBody(request) {
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
  if (!isValidOccurredAt(value.occurredAt)) return { ok: false, error: 'Invalid occurredAt' };
  if (![value.visitorSessionId, value.resultSessionId, value.shareId].every(isNullableUuid)) {
    return { ok: false, error: 'Invalid analytics identifier' };
  }
  if (![value.guardianId, value.fromGuardianId].every(isNullableGuardianId)) {
    return { ok: false, error: 'Invalid guardian ID' };
  }
  if (!isNullableShareChannel(value.shareChannel)) return { ok: false, error: 'Invalid share channel' };
  if (value.utmSource !== null && value.utmSource !== 'guardian_share') {
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

export async function handleGuardianAnalyticsRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/analytics') return null;
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!env.DB) return json({ error: 'Analytics unavailable' }, 503);
  const body = await readAndValidateAnalyticsBody(request);
  if (!body.ok) return json({ error: body.error }, 400);
  await recordGuardianAnalyticsEvent(env, body.value);
  return json({ accepted: true }, 202);
}
