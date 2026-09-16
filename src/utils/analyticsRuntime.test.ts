import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createAnalyticsRuntime, scheduleAnalyticsLoad } from './analyticsRuntime.ts';
import { reportScrollThresholds } from './reportScrollAnalytics.ts';
import { replayPrivacyConfig } from './posthogPrivacy.ts';

const reportId = '019fe111-1111-4111-8111-111111111111';
function fixture(values = new Map<string, string>()) {
  const events: Array<{ event: string; properties: Record<string, unknown>; timestamp?: Date }> = [];
  let time = 1000;
  const tracker = createAnalyticsRuntime({
    properties: () => ({ utm_source: 'instagram', utm_medium: 'profile', utm_campaign: 'guardian', current_path: '/', email: 'private@example.com' }),
    storage: () => ({ getItem: key => values.get(key) || null, setItem: (key, value) => { values.set(key, value); } }),
    now: () => time,
  });
  const sdk = {
    capture(event: string, properties: Record<string, unknown>, options?: { timestamp?: Date }) { events.push({ event, properties, timestamp: options?.timestamp }); return undefined; },
    get_distinct_id: () => reportId, get_session_id: () => reportId, has_opted_out_capturing: () => false,
  };
  tracker.start();
  return { tracker, events, sdk, advance: () => { time += 1000; } };
}
test('SDK 지연 로딩 중 큐에서도 StrictMode·리렌더·새로고침 중복을 막는다', () => {
  const storage = new Map<string, string>();
  const { tracker, events, sdk, advance } = fixture(storage);
  for (let i = 0; i < 5; i++) {
    tracker.trackFunnel('landing_view', {}, 'session');
    tracker.trackFunnel('report_generated', { report_id: reportId }, reportId);
    tracker.trackFunnel('report_view', { report_id: reportId }, reportId);
    tracker.trackFunnel('report_scroll_50', { report_id: reportId }, reportId);
    tracker.trackFunnel('report_scroll_90', { report_id: reportId }, reportId);
    tracker.trackScreen('result_free', { report_id: reportId });
    tracker.trackClick('share_click');
  }
  assert.equal(events.length, 0);
  advance(); tracker.ready(sdk);
  assert.equal(events.length, 7);
  assert.equal(events[0].timestamp?.getTime(), 1000, 'queued events preserve actual action time');
  tracker.ready(sdk); assert.equal(events.length, 7);
  const refreshed = fixture(storage);
  refreshed.tracker.ready(refreshed.sdk);
  refreshed.tracker.trackFunnel('report_generated', { report_id: reportId }, reportId);
  refreshed.tracker.trackFunnel('report_scroll_90', { report_id: reportId }, reportId);
  assert.equal(refreshed.events.length, 0);
  refreshed.tracker.trackScreen('result_free', { report_id: reportId });
  assert.equal(refreshed.events.length, 1, 'a real reload is a legitimate new pageview');
});
test('UTM과 익명 ID는 결제 컨텍스트까지 유지하고 개인정보는 제거한다', () => {
  const { tracker, sdk } = fixture(); tracker.ready(sdk);
  const context = tracker.paymentAnalyticsContext(reportId)!;
  assert.equal(context.utm_source, 'instagram');
  assert.equal(context.utm_medium, 'profile');
  assert.equal(context.utm_campaign, 'guardian');
  assert.equal(context.distinct_id, reportId);
  assert.equal(context.email, undefined);
});
test('SDK import/init 장애·capture 예외·opt-out·storage 거부는 서비스에 예외를 전파하지 않는다', () => {
  const { tracker, sdk, events } = fixture();
  tracker.trackClick('start_click'); tracker.stop(); tracker.ready(sdk);
  tracker.trackClick('start_click'); assert.equal(events.length, 0);
  tracker.start(); tracker.ready({ ...sdk, capture() { throw Error('blocked'); }, get_distinct_id() { throw Error('blocked'); } });
  assert.doesNotThrow(() => tracker.trackClick('start_click'));
  assert.equal(tracker.paymentAnalyticsContext(), undefined);
  tracker.ready({ ...sdk, has_opted_out_capturing: () => true });
  assert.equal(tracker.paymentAnalyticsContext(), undefined);
  const denied = createAnalyticsRuntime({ properties: () => ({}), storage: () => { throw Error('denied'); } });
  denied.start(); assert.doesNotThrow(() => denied.trackFunnel('report_view', {}, reportId));
});
test('초기 SDK import는 첫 페인트 기회 뒤에 실행하고 idle/fallback 경쟁에도 1회다', () => {
  const callbacks: Array<() => void> = [];
  let frame: (() => void) | undefined;
  let idle: (() => void) | undefined;
  let imports = 0;
  const scheduler = {
    setTimeout(callback: () => void) { callbacks.push(callback); return callbacks.length; },
    clearTimeout() {},
    requestAnimationFrame(callback: () => void) { frame = callback; return 1; },
    requestIdleCallback(callback: () => void) { idle = callback; return 1; },
  };
  scheduleAnalyticsLoad(() => { imports++; }, scheduler);
  assert.equal(imports, 0);
  frame!(); assert.equal(imports, 0);
  idle!(); callbacks[0](); assert.equal(imports, 1);
  assert.doesNotThrow(() => scheduleAnalyticsLoad(() => { throw Error('SDK init'); }, scheduler));
  callbacks.at(-1)!();
});
test('모바일 390×844/360×640, 주소창·visualViewport·끝까지 점프에서도 50/90%를 계산한다', () => {
  for (const viewport of [844, 640]) {
    const travel = 3000 - viewport;
    assert.deepEqual(reportScrollThresholds({ top: 0, height: 3000 }, viewport), []);
    assert.deepEqual(reportScrollThresholds({ top: -travel * .49, height: 3000 }, viewport), []);
    assert.deepEqual(reportScrollThresholds({ top: -travel * .5, height: 3000 }, viewport), [50]);
    assert.deepEqual(reportScrollThresholds({ top: -travel * .9, height: 3000 }, viewport), [50, 90]);
    assert.deepEqual(reportScrollThresholds({ top: -travel, height: 3000 }, viewport), [50, 90]);
  }
  assert.deepEqual(reportScrollThresholds({ top: -1110, height: 3000 }, 844, { height: 760, offsetTop: 10 }), [50]);
  assert.deepEqual(reportScrollThresholds({ top: 0, height: 600 }, 844), []);
});
test('Replay는 모든 input/textarea를 마스킹하며 속성·민감 DOM·네트워크 본문을 차단한다', () => {
  const config = replayPrivacyConfig('https://jobsaju.kr');
  assert.equal(config.maskAllInputs, true);
  assert.equal(config.recordBody, false); assert.equal(config.recordHeaders, false);
  assert.match(config.blockSelector!, /ph-no-capture/);
  assert.match(config.maskTextSelector!, /ph-mask/);
  for (const key of ['value', 'title', 'alt', 'aria-label', 'data-email', 'srcdoc']) {
    assert.equal(config.maskAttributeFn!(key, 'private@example.com'), '');
  }
  assert.equal(config.maskAttributeFn!('href', '/?token=SECRET'), 'https://jobsaju.kr/');
  assert.equal(config.maskAttributeFn!('src', 'data:image/png;base64,PERSONAL'), '');
  assert.equal(config.maskAttributeFn!('src', '/api/share-card/private-id'), 'https://jobsaju.kr/');
  assert.equal(config.maskAttributeFn!('src', '/guardians/public.webp'), 'https://jobsaju.kr/guardians/public.webp');
  assert.equal(config.maskAttributeFn!('class', 'jg-screen ph-mask'), 'jg-screen ph-mask');
});
test('개인화 결과·유료 미리보기·이메일 모달에는 Replay DOM 마스킹 계약이 유지된다', async () => {
  for (const path of ['screens/GuardianResultScreen.tsx', 'screens/ResultScreen.tsx', 'screens/PaywallScreen.tsx', 'modals/ManualPayModal.tsx', 'modals/LookupModal.tsx']) {
    const source = await readFile(new URL(`../components/${path}`, import.meta.url), 'utf8');
    assert.match(source, /className="[^"]*\bph-mask\b/, path);
  }
  const birth = await readFile(new URL('../components/screens/BirthScreen.tsx', import.meta.url), 'utf8');
  assert.match(birth, /jg-birth-card ph-no-capture/);
});
