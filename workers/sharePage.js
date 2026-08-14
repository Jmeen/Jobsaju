/**
 * 공유용 개인화 미리보기 페이지.
 *
 * 카카오 SDK를 못 쓰는 브라우저(엣지 등)에서는 결국 "링크"만 공유되는데, 그 링크가 그냥
 * 서비스 기본 URL이면 카톡·문자·다른 메신저 어디서도 미리보기가 뜨지 않는다. 결과카드별로
 * 고유 URL을 만들어 그 페이지의 OG 태그를 R2에 올린 개인화 이미지·문구로 채우면, 어떤 방식으로
 * 공유되든(카카오 SDK든 시스템 공유 시트든) 받는 사람 화면엔 그 사람만의 결과카드 미리보기가 뜬다.
 */

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const PAGE_PATH = new RegExp(`^/api/share-page/(${UUID_PATTERN})$`, 'i');
// 우리 R2 공유 카드 엔드포인트가 내준 이미지만 랜딩 페이지에 박도록 제한한다 (임의 이미지로 오남용 방지).
const SHARE_CARD_IMAGE_PATTERN = new RegExp(`^https://[^/]+/api/share-card/${UUID_PATTERN}\\.png$`, 'i');
const TTL_SECONDS = 60 * 60 * 24 * 30; // R2 이미지 수명(30일 Lifecycle Rule)과 맞춘다
const MAX_TEXT_LENGTH = { title: 200, description: 300 };

const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderSharePageHtml({ title, description, imageUrl, pageUrl, appUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImageUrl = escapeHtml(imageUrl);
  const safePageUrl = escapeHtml(pageUrl);
  const safeAppUrl = escapeHtml(appUrl);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:image" content="${safeImageUrl}" />
<meta property="og:image:width" content="800" />
<meta property="og:image:height" content="800" />
<meta property="og:url" content="${safePageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${safeImageUrl}" />
<style>
  body { margin:0; font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif; background:#0b0911; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; padding:24px; box-sizing:border-box; text-align:center; }
  img { width:100%; max-width:360px; border-radius:16px; box-shadow:0 0 24px rgba(168,85,247,.35); }
  h1 { font-size:18px; margin:20px 0 8px; }
  p { font-size:14px; color:rgba(255,255,255,.7); max-width:360px; line-height:1.5; margin:0 0 20px; }
  a.cta { display:inline-block; padding:14px 28px; border-radius:999px; background:linear-gradient(135deg,#a855f7,#ec4899); color:#fff; font-weight:700; text-decoration:none; }
</style>
</head>
<body>
  <img src="${safeImageUrl}" alt="${safeTitle}" />
  <h1>${safeTitle}</h1>
  <p>${safeDescription}</p>
  <a class="cta" href="${safeAppUrl}">내 이직운도 확인해보기</a>
</body>
</html>`;
}

export async function handleSharePageRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/api/share-page') {
    if (!env.SAJU_KV) return json({ error: '공유 페이지 저장소가 설정되지 않았습니다.' }, 503);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: '잘못된 요청입니다.' }, 400);
    }
    const imageUrl = String(body?.imageUrl || '');
    const title = String(body?.title || '').trim().slice(0, MAX_TEXT_LENGTH.title);
    const description = String(body?.description || '').trim().slice(0, MAX_TEXT_LENGTH.description);
    if (!SHARE_CARD_IMAGE_PATTERN.test(imageUrl)) return json({ error: '유효하지 않은 이미지 URL입니다.' }, 400);
    if (!title || !description) return json({ error: '제목과 설명이 필요합니다.' }, 400);

    const id = crypto.randomUUID();
    await env.SAJU_KV.put(
      `share-page:${id}`,
      JSON.stringify({ imageUrl, title, description, createdAt: new Date().toISOString() }),
      { expirationTtl: TTL_SECONDS },
    );
    return json({ shareUrl: `${url.origin}/api/share-page/${id}` }, 201);
  }

  const match = url.pathname.match(PAGE_PATH);
  if (request.method === 'GET' && match) {
    const appUrl = env.PUBLIC_SERVICE_URL || url.origin;
    if (!env.SAJU_KV) return Response.redirect(appUrl, 302);

    const stored = await env.SAJU_KV.get(`share-page:${match[1]}`);
    if (!stored) return Response.redirect(appUrl, 302);

    let data;
    try {
      data = JSON.parse(stored);
    } catch {
      return Response.redirect(appUrl, 302);
    }

    const html = renderSharePageHtml({
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      pageUrl: url.href,
      appUrl,
    });
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  }

  return null;
}
