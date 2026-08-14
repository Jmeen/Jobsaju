/**
 * 쿠폰 관리자 웹 페이지 (GET /admin/coupons).
 *
 * 이 HTML 뼈대 자체는 인증 없이 내려간다 — 실제 데이터 조회/생성/회수는 전부
 * /api/admin/coupons* 엔드포인트를 브라우저에서 fetch로 호출하며, 그때 입력한
 * COUPON_ADMIN_KEY를 Authorization: Bearer 헤더로 실어 보낸다. 즉 이 페이지는 이미
 * 존재하는 인증된 API 위에 얹은 얇은 클라이언트일 뿐이라 별도 서버 인증 로직이 없다.
 * 키는 관리자 자신의 브라우저 localStorage에만 저장된다.
 */
export function handleAdminPageRequest(request) {
  const url = new URL(request.url);
  // 끝에 슬래시가 붙어 들어오는 경우(브라우저·프록시가 흔히 정규화한다)도 같은 페이지로 처리한다.
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const isGetLike = request.method === 'GET' || request.method === 'HEAD';
  if (!isGetLike || pathname !== '/admin/coupons') return null;

  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<title>쿠폰 관리 — 직장인 이직사주</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; background: #0b0911; color: #f3f4f6; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #9ca3af; font-size: 13px; margin: 0 0 20px; }
  .card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
  label { display: block; font-size: 12px; color: #9ca3af; margin-bottom: 4px; }
  input { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,.14); background: #16131f; color: #f3f4f6; font-size: 13px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  .row > div { flex: 1; min-width: 140px; }
  button { cursor: pointer; border: none; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 600; }
  .btn-primary { background: linear-gradient(135deg, #a855f7, #ec4899); color: #fff; }
  .btn-secondary { background: rgba(255,255,255,.08); color: #f3f4f6; }
  .btn-danger { background: rgba(239,68,68,.18); color: #fca5a5; }
  .btn-danger:hover { background: rgba(239,68,68,.3); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,.08); white-space: nowrap; }
  th { color: #9ca3af; font-weight: 600; font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .badge-ok { background: rgba(74,222,128,.15); color: #4ade80; }
  .badge-used { background: rgba(251,191,36,.15); color: #fbbf24; }
  .badge-revoked { background: rgba(248,113,113,.15); color: #f87171; }
  .badge-expired { background: rgba(148,163,184,.15); color: #94a3b8; }
  #status { font-size: 13px; color: #9ca3af; margin-top: 8px; min-height: 18px; }
  #tableWrap { overflow-x: auto; }
  .muted { color: #6b7280; }
</style>
</head>
<body>
  <h1>🎟️ 쿠폰 관리</h1>
  <p class="sub">직장인 이직사주 · 발급/사용 현황을 한눈에 확인하고 회수할 수 있습니다.</p>

  <div class="card">
    <label for="adminKey">관리자 키 (COUPON_ADMIN_KEY)</label>
    <div class="row">
      <div style="flex:3"><input id="adminKey" type="password" placeholder="Bearer 키 값" /></div>
      <div style="flex:1; min-width:100px;"><button class="btn-secondary" style="width:100%" onclick="saveKeyAndLoad()">불러오기</button></div>
    </div>
    <div id="status"></div>
  </div>

  <div class="card">
    <label>새 쿠폰 발급</label>
    <div class="row" style="margin-bottom:10px;">
      <div><input id="newCode" placeholder="코드 (예: FRIEND-KIM)" /></div>
      <div style="max-width:120px;"><input id="newMaxUses" type="number" min="1" value="1" placeholder="사용 횟수" /></div>
      <div style="max-width:180px;"><input id="newExpiresAt" type="date" /></div>
      <div style="flex:2;"><input id="newNote" placeholder="메모 (예: 김OO 테스터)" /></div>
      <div style="max-width:110px;"><button class="btn-primary" style="width:100%" onclick="createCoupon()">발급</button></div>
    </div>
  </div>

  <div class="card">
    <div class="row" style="align-items:center; margin-bottom:12px;">
      <div><strong>발급된 쿠폰</strong></div>
      <div style="max-width:100px; margin-left:auto;"><button class="btn-secondary" style="width:100%" onclick="loadCoupons()">새로고침</button></div>
    </div>
    <div id="tableWrap">
      <table>
        <thead>
          <tr>
            <th>코드</th><th>상태</th><th>사용</th><th>만료일</th><th>메모</th><th>생성일</th><th></th>
          </tr>
        </thead>
        <tbody id="tbody"><tr><td colspan="7" class="muted">관리자 키를 입력하고 "불러오기"를 눌러주세요.</td></tr></tbody>
      </table>
    </div>
  </div>

<script>
function getKey() { return localStorage.getItem('couponAdminKey') || ''; }
function setStatus(msg, isError) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = isError ? '#f87171' : '#9ca3af';
}
function saveKeyAndLoad() {
  const key = document.getElementById('adminKey').value.trim();
  if (!key) { setStatus('관리자 키를 입력해 주세요.', true); return; }
  localStorage.setItem('couponAdminKey', key);
  loadCoupons();
}
async function authedFetch(path, options = {}) {
  const key = getKey();
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('요청 실패 (' + res.status + ')'));
  return data;
}
function statusBadge(c) {
  if (c.revoked) return '<span class="badge badge-revoked">회수됨</span>';
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return '<span class="badge badge-expired">만료</span>';
  if (typeof c.maxUses === 'number' && c.usedCount >= c.maxUses) return '<span class="badge badge-used">소진</span>';
  return '<span class="badge badge-ok">사용가능</span>';
}
function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}
async function loadCoupons() {
  const key = document.getElementById('adminKey').value.trim() || getKey();
  if (key) { document.getElementById('adminKey').value = key; localStorage.setItem('couponAdminKey', key); }
  if (!key) { setStatus('관리자 키를 입력해 주세요.', true); return; }
  setStatus('불러오는 중...');
  try {
    const data = await authedFetch('/api/admin/coupons/list', { method: 'POST' });
    const coupons = (data.coupons || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const tbody = document.getElementById('tbody');
    if (!coupons.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="muted">발급된 쿠폰이 없습니다.</td></tr>';
    } else {
      tbody.innerHTML = coupons.map(c => \`
        <tr>
          <td><strong>\${escapeHtml(c.code)}</strong></td>
          <td>\${statusBadge(c)}</td>
          <td>\${c.usedCount} / \${c.maxUses}</td>
          <td>\${c.expiresAt ? escapeHtml(c.expiresAt.slice(0, 10)) : '<span class="muted">없음</span>'}</td>
          <td>\${escapeHtml(c.note) || '<span class="muted">-</span>'}</td>
          <td class="muted">\${c.createdAt ? escapeHtml(c.createdAt.slice(0, 10)) : '-'}</td>
          <td>\${c.revoked ? '' : '<button class="btn-danger" onclick="revokeCoupon(\\'' + c.code + '\\')">회수</button>'}</td>
        </tr>\`).join('');
    }
    setStatus('총 ' + coupons.length + '개 · ' + new Date().toLocaleTimeString('ko-KR') + ' 기준');
  } catch (err) {
    setStatus(err.message, true);
  }
}
async function createCoupon() {
  const code = document.getElementById('newCode').value.trim();
  const maxUses = Number(document.getElementById('newMaxUses').value) || 1;
  const expiresAtRaw = document.getElementById('newExpiresAt').value;
  const note = document.getElementById('newNote').value.trim();
  if (!code) { setStatus('발급할 코드를 입력해 주세요.', true); return; }
  setStatus('발급 중...');
  try {
    await authedFetch('/api/admin/coupons', {
      method: 'POST',
      // 날짜만 고르면 "그 날짜 자정(UTC)"으로 저장돼 한국 시간 기준 당일 오전 9시에 이미 만료돼버린다.
      // "이 날짜까지는 쓸 수 있게" 하려는 의도이므로 그날 23:59:59(KST)까지로 저장한다.
      body: JSON.stringify({ code, maxUses, note, expiresAt: expiresAtRaw ? new Date(expiresAtRaw + 'T23:59:59+09:00').toISOString() : null }),
    });
    document.getElementById('newCode').value = '';
    document.getElementById('newNote').value = '';
    document.getElementById('newExpiresAt').value = '';
    document.getElementById('newMaxUses').value = '1';
    await loadCoupons();
  } catch (err) {
    setStatus(err.message, true);
  }
}
async function revokeCoupon(code) {
  if (!confirm(code + ' 쿠폰을 회수할까요? 즉시 사용할 수 없게 됩니다.')) return;
  setStatus('회수 중...');
  try {
    await authedFetch('/api/admin/coupons/revoke', { method: 'POST', body: JSON.stringify({ code }) });
    await loadCoupons();
  } catch (err) {
    setStatus(err.message, true);
  }
}
window.addEventListener('DOMContentLoaded', () => {
  const key = getKey();
  if (key) { document.getElementById('adminKey').value = key; loadCoupons(); }
});
</script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
