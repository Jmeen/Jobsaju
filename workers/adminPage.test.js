import assert from 'node:assert/strict';
import test from 'node:test';
import { handleAdminPageRequest } from './adminPage.js';

test('GET /admin/coupons는 인증 없이 뼈대 HTML을 내려준다(데이터는 페이지 안 fetch가 인증해서 가져온다)', () => {
  const response = handleAdminPageRequest(new Request('https://job-saju.example/admin/coupons'));
  assert.ok(response);
  assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex');
});

test('쿠폰 발급 항목과 기존 쿠폰의 할인 금액 열을 명확하게 표기한다', async () => {
  const response = handleAdminPageRequest(new Request('https://job-saju.example/admin/coupons'));
  const html = await response.text();
  for (const label of ['프로모 코드', '할인 금액', '최대 사용 횟수', '만료일', '관리자 메모', '12,900원 = 무료']) {
    assert.match(html, new RegExp(label));
  }
});

test('관리자 키 안내는 값만 입력하도록 명확하고, 실수로 붙인 Bearer도 정규화한다', async () => {
  const response = handleAdminPageRequest(new Request('https://job-saju.example/admin/coupons'));
  const html = await response.text();
  assert.match(html, /Cloudflare 키 값만 붙여넣기/);
  assert.ok(html.includes('/^Bearer\\s+/i'));
});

test('관련 없는 경로·메서드는 null을 반환해 다른 라우팅으로 넘긴다', () => {
  assert.equal(handleAdminPageRequest(new Request('https://job-saju.example/admin/other')), null);
  assert.equal(handleAdminPageRequest(new Request('https://job-saju.example/admin/coupons', { method: 'POST' })), null);
});

test('끝에 슬래시가 붙어도(/admin/coupons/) 같은 페이지로 처리한다', () => {
  // 회귀 테스트: 정확 문자열 비교였을 때 브라우저가 슬래시를 붙여 요청하면 405로 새던 문제.
  const response = handleAdminPageRequest(new Request('https://job-saju.example/admin/coupons/'));
  assert.ok(response);
  assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
});

test('HEAD 요청도 GET과 동일하게 처리한다', () => {
  const response = handleAdminPageRequest(new Request('https://job-saju.example/admin/coupons', { method: 'HEAD' }));
  assert.ok(response);
});
