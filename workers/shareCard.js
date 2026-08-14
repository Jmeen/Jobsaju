const MAX_PNG_BYTES = 1_048_576;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const IMAGE_PATH = /^\/api\/share-card\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.png$/i;

const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function handleShareCardRequest(request, env) {
  const url = new URL(request.url);
  const match = url.pathname.match(IMAGE_PATH);
  if (request.method === 'GET' && match) {
    if (!env.SHARE_CARDS) return json({ error: '공유 이미지 저장소가 설정되지 않았습니다.' }, 503);
    const object = await env.SHARE_CARDS.get(`share-cards/${match[1]}.png`);
    if (!object) return json({ error: '이미지를 찾을 수 없습니다.' }, 404);
    return new Response(object.body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (url.pathname !== '/api/share-card' || request.method !== 'POST') return null;
  if (!env.SHARE_CARDS) return json({ error: '공유 이미지 저장소가 설정되지 않았습니다.' }, 503);
  if ((request.headers.get('Content-Type') || '').split(';')[0].trim() !== 'image/png') return json({ error: 'PNG 이미지만 업로드할 수 있습니다.' }, 415);
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_PNG_BYTES) return json({ error: '이미지는 1MB 이하여야 합니다.' }, 413);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_PNG_BYTES) return json({ error: '이미지는 1MB 이하여야 합니다.' }, 413);
  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return json({ error: '올바른 PNG 파일이 아닙니다.' }, 400);
  const id = crypto.randomUUID();
  await env.SHARE_CARDS.put(`share-cards/${id}.png`, bytes, { httpMetadata: { contentType: 'image/png' }, customMetadata: { uploadedAt: new Date().toISOString() } });
  return json({ imageUrl: `${url.origin}/api/share-card/${id}.png` }, 201);
}
