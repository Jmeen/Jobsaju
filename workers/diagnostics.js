import { DIAGNOSTIC_ROUTES, diagnosticPath, errorCategory } from '../src/utils/diagnosticData.ts';

const TTL = 14 * 24 * 60 * 60;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const buckets = new Map(); // Best-effort ingestion guard per isolate; no IPs are persisted.
const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,80}$/.test(value) ? value : undefined;

export function sanitizeClientEvent(body) {
  if (!body || !UUID.test(body.id) || !['RENDER_ERROR', 'WINDOW_ERROR', 'UNHANDLED_REJECTION', 'CHUNK_LOAD_FAILED', 'API_HTTP_ERROR', 'API_NETWORK_ERROR', 'FOLLOWUP_REQUEST_FAILED', 'REPORT_RECOVERY_FAILED'].includes(body.code)) return null;
  return {
    id: body.id, source: 'browser', code: body.code,
    requestId: UUID.test(body.requestId) ? body.requestId : undefined,
    category: identifier(body.category), screen: identifier(body.screen), release: identifier(body.release),
    route: diagnosticPath(body.route),
    status: Number.isInteger(body.status) && body.status >= 100 && body.status <= 599 ? body.status : undefined,
    durationMs: Number.isFinite(body.durationMs) ? Math.max(0, Math.min(body.durationMs, 600000)) : undefined,
    frames: Array.isArray(body.frames) ? body.frames.filter(frame => typeof frame === 'string' && /^\/assets\/[A-Za-z0-9_.-]+\.js:\d+:\d+$/.test(frame)).slice(0, 8) : [],
  };
}

export async function saveDiagnostic(env, event) {
  const record = { ...event, timestamp: new Date().toISOString() };
  console.log(JSON.stringify({ diagnostic: record }));
  try {
    if (!env.SAJU_KV) return false;
    const reverseTime = String(9999999999999 - Date.now()).padStart(13, '0');
    await env.SAJU_KV.put(`diagnostic:v1:${reverseTime}:${crypto.randomUUID()}`, JSON.stringify(record), { expirationTtl: TTL });
    return true;
  } catch {
    console.error(JSON.stringify({ diagnostic: { code: 'DIAGNOSTIC_STORAGE_FAILED', id: event.id } }));
    return false;
  }
}

async function isAdmin(request, env) {
  const key = env.DIAGNOSTICS_ADMIN_KEY || env.COUPON_ADMIN_KEY;
  if (!key) return false;
  const digest = text => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  const [expected, actual] = await Promise.all([digest(`Bearer ${key}`), digest(request.headers.get('Authorization') || '')]);
  const a = new Uint8Array(expected), b = new Uint8Array(actual);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function handleDiagnostics(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/admin/diagnostics') {
    if (!await isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    if (!env.SAJU_KV) return json({ error: 'Log storage is unavailable' }, 503);
    const cursor = url.searchParams.get('cursor') || undefined;
    const page = await env.SAJU_KV.list({ prefix: 'diagnostic:v1:', limit: 50, ...(cursor ? { cursor } : {}) });
    const events = await Promise.all(page.keys.map(async key => {
      try { return JSON.parse(await env.SAJU_KV.get(key.name)); } catch { return null; }
    }));
    return json({ events: events.filter(Boolean), cursor: page.list_complete ? null : page.cursor, retentionDays: 14 });
  }
  if (url.pathname !== '/api/diagnostics') return null;
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') !== url.origin || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Invalid origin or content type' }, 403);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  if (buckets.size > 2000) for (const [key, entry] of buckets) if (entry.until < now) buckets.delete(key);
  const bucket = buckets.get(ip);
  if (bucket && bucket.until > now && bucket.count >= 30) return json({ error: 'Rate limited' }, 429);
  if (!bucket || bucket.until <= now) {
    if (buckets.size >= 4000) return json({ error: 'Rate limited' }, 429);
    buckets.set(ip, { count: 1, until: now + 60000 });
  } else bucket.count++;
  if (Number(request.headers.get('Content-Length')) > 8192) return json({ error: 'Too large' }, 413);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Missing body' }, 400);
  let text = '', size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); return json({ error: 'Too large' }, 413); }
    text += decoder.decode(value, { stream: true });
  }
  let event;
  try { event = sanitizeClientEvent(JSON.parse(text + decoder.decode())); } catch { return json({ error: 'Invalid JSON' }, 400); }
  if (!event) return json({ error: 'Invalid event' }, 400);
  const stored = await saveDiagnostic(env, event);
  return json({ accepted: stored, id: event.id }, stored ? 202 : 503);
}

export async function observeRequest(request, env, ctx, handler) {
  const route = new URL(request.url).pathname;
  if (!DIAGNOSTIC_ROUTES.has(route) || request.method === 'OPTIONS') return handler(request, env, ctx);
  const incoming = request.headers.get('X-Request-Id');
  const id = UUID.test(incoming) ? incoming : crypto.randomUUID();
  const start = Date.now();
  const trace = { id, source: 'server', route, stage: 'request', attempts: [] };
  let response;
  try {
    response = await handler(request, { ...env, DIAGNOSTIC_TRACE: trace }, ctx);
  } catch (error) {
    trace.code = errorCategory(error);
    response = json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', code: 'INTERNAL_ERROR' }, 500);
  }
  const headers = new Headers(response.headers);
  headers.set('X-Request-Id', id);
  headers.set('Access-Control-Expose-Headers', 'X-Request-Id');
  headers.set('Cache-Control', 'no-store');
  const event = { ...trace, status: response.status, durationMs: Date.now() - start, outcome: response.ok ? 'success' : 'error' };
  const saving = saveDiagnostic(env, event);
  if (ctx?.waitUntil) ctx.waitUntil(saving);
  else await saving;
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
