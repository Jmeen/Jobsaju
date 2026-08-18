/**
 * 캐릭터 공유 attribution/analytics.
 *
 * 새 D1 테이블(share_analytics_events, schema_share_analytics.sql)에 이벤트 한 줄씩 남긴다.
 * 개인정보(이름·이메일·생년월일·전화번호·카카오 계정)는 애초에 받는 필드가 없다 — 아래
 * ALLOWED_EVENTS/컬럼 목록이 곧 이 엔드포인트가 다루는 데이터의 전부다.
 *
 * D1 쓰기가 실패하거나 DB 바인딩이 없어도(로컬/스테이징) 호출부의 나머지 동작(카카오 웹훅의
 * 공유 보너스 unlock 등)을 절대 막지 않는다 — 그래서 이 파일의 함수는 예외를 던지지 않는다.
 */

const ALLOWED_EVENTS = new Set([
  'guardian_share_kakao_click',
  'guardian_share_link_copy',
  'guardian_share_landing',
  'guardian_result_completed_from_share',
  'guardian_share_kakao_success',
]);

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
});

function clip(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

/** analytics 테이블에 한 행을 남긴다. event가 허용 목록에 없거나 DB가 없으면 조용히 무시한다. */
export async function recordShareEvent(env, { event, characterId, fromCharacter, shareSessionId, utmSource, utmMedium, medium } = {}) {
  if (!env?.DB || !ALLOWED_EVENTS.has(event)) return;
  try {
    await env.DB.prepare(
      `INSERT INTO share_analytics_events (event, character_id, from_character, share_session_id, utm_source, utm_medium, medium)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      event,
      clip(characterId, 20),
      clip(fromCharacter, 20),
      clip(shareSessionId, 100),
      clip(utmSource, 60),
      clip(utmMedium, 60),
      clip(medium, 20),
    ).run();
  } catch {
    // analytics 실패가 실제 기능(공유 보너스 unlock 등)을 막으면 안 된다.
  }
}

export async function handleShareAnalyticsRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/analytics/event' || request.method !== 'POST') return null;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '잘못된 요청입니다.' }, 400);
  }

  const event = typeof body?.event === 'string' ? body.event : '';
  if (!ALLOWED_EVENTS.has(event)) {
    return json({ error: '알 수 없는 이벤트입니다.' }, 400);
  }

  await recordShareEvent(env, {
    event,
    characterId: body.characterId,
    fromCharacter: body.fromCharacter,
    shareSessionId: body.shareSessionId,
    utmSource: body.utmSource,
    utmMedium: body.utmMedium,
    medium: body.medium,
  });

  return json({ ok: true }, 202);
}
