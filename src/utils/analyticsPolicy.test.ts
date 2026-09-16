import assert from 'node:assert/strict';
import test from 'node:test';
import { acquisitionChannel, rememberOnce, sanitizeAnalyticsProperties, sanitizeSdkProperties, scrollThresholds } from './analyticsPolicy.ts';

test('개인정보, 사주 원문, 자유서술, 빈 값은 allowlist에서 제거한다', () => {
  assert.deepEqual(sanitizeAnalyticsProperties({
    name: '홍길동', birth: '1990-01-01', hour: 12, phone: '01012345678', email: 'private@example.com',
    worry_text: '개인 고민', saju_data: { pillars: '갑자' }, current_job: '회사명',
    utm_source: 'instagram', utm_medium: 'profile', utm_campaign: 'guardian',
    report_type: 'paid_career', price: 0, promo_code: undefined, other: null,
  }), { utm_source: 'instagram', utm_medium: 'profile', utm_campaign: 'guardian', report_type: 'paid_career', price: 0 });
});
test('URL 토큰, 이메일, 해시와 SDK 자동 person properties를 전송하지 않는다', () => {
  const result = sanitizeSdkProperties('report_view', {
    token: 'phc_public', distinct_id: crypto.randomUUID(), $session_id: crypto.randomUUID(),
    $current_url: 'https://jobsaju.kr/?email=private@example.com&token=SECRET#SECRET',
    $initial_current_url: 'https://jobsaju.kr/?token=SECRET',
    $referrer: 'https://blog.naver.com/someone?email=private@example.com',
    $set_once: { email: 'private@example.com' }, $elements: [{ text: 'private@example.com' }],
    $snapshot_data: ['should not appear on normal events'],
  });
  assert.equal(result.token, 'phc_public', 'ingestion token must survive');
  assert.equal(result.$current_url, 'https://jobsaju.kr/');
  assert.equal(result.$initial_current_url, 'https://jobsaju.kr/');
  assert.equal(result.$referrer, 'https://blog.naver.com');
  assert.equal(JSON.stringify(result).includes('SECRET'), false);
  assert.equal(JSON.stringify(result).includes('private@example.com'), false);
  assert.equal(result.$snapshot_data, undefined);
});
test('마스킹된 Replay payload와 세션 연결 메타데이터는 보존한다', () => {
  const payload = [{ type: 3, data: { text: '*****' } }];
  assert.deepEqual(sanitizeSdkProperties('$snapshot', { $snapshot_data: payload }).$snapshot_data, payload);
});
test('유입 채널 7가지를 UTM과 referrer로 구분한다', () => {
  for (const medium of ['profile', 'post', 'reels']) assert.equal(acquisitionChannel({ utm_source: 'instagram', utm_medium: medium }), `instagram_${medium}`);
  for (const source of ['threads', 'blog', 'manychat']) assert.equal(acquisitionChannel({ utm_source: source }), source);
  assert.equal(acquisitionChannel({}), 'direct');
  assert.equal(acquisitionChannel({ referrer: 'https://threads.com' }), 'threads');
  assert.equal(acquisitionChannel({ referrer: 'https://blog.naver.com' }), 'blog');
});
test('Strict Mode 재실행과 재마운트, 새로고침에도 report별 중복이 없다', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const memory = new Set<string>();
  assert.equal(rememberOnce('report_scroll_50:one', memory, storage), true);
  assert.equal(rememberOnce('report_scroll_50:one', memory, storage), false);
  assert.equal(rememberOnce('report_scroll_50:one', new Set(), storage), false);
  assert.equal(rememberOnce('report_scroll_50:two', memory, storage), true);
  const denied = { getItem() { throw Error(); }, setItem() { throw Error(); } };
  assert.equal(rememberOnce('denied', memory, denied), true);
  assert.equal(rememberOnce('denied', memory, denied), false);
});
test('스크롤 없이 50/90%를 만들지 않고 실제 결과 이동 범위를 측정한다', () => {
  assert.deepEqual(scrollThresholds(0, 2000, 800), []);
  assert.deepEqual(scrollThresholds(600, 2000, 800), [50]);
  assert.deepEqual(scrollThresholds(1080, 2000, 800), [50, 90]);
  assert.deepEqual(scrollThresholds(0, 700, 800), []);
});
