import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import {
  buildShareUrl,
  loadShareInbound,
  parseShareInbound,
  resolveShareInbound,
  saveShareInbound,
} from './shareInbound.ts';

const SHARE_ID = '11111111-1111-4111-8111-111111111111';

function installStore() {
  const map = new Map<string, string>();
  (globalThis as Record<string, unknown>).sessionStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
  return map;
}

beforeEach(() => { installStore(); });

test('유효한 fromGuardian과 shareId를 읽는다', () => {
  const inbound = parseShareInbound(`?fromGuardian=甲寅&utm_source=guardian_share&shareId=${SHARE_ID}`);

  assert.deepEqual(inbound, { fromGuardianId: '甲寅', shareId: SHARE_ID });
});

test('잘못된 fromGuardian은 배너를 만들지 않는다', () => {
  // 스펙: 오류를 표시하지 않고 일반 랜딩으로 둔다.
  for (const search of ['', '?fromGuardian=', '?fromGuardian=甲亥', '?fromGuardian=없는값', '?shareId=' + SHARE_ID]) {
    assert.equal(parseShareInbound(search), null, `${search}는 유입으로 보면 안 된다`);
  }
});

test('shareId가 UUID가 아니면 버리되 수호신 문맥은 살린다', () => {
  const inbound = parseShareInbound('?fromGuardian=甲寅&shareId=not-a-uuid');

  assert.deepEqual(inbound, { fromGuardianId: '甲寅', shareId: null });
});

test('입력 단계에서 쿼리가 사라져도 귀속이 유지된다', () => {
  resolveShareInbound(`?fromGuardian=甲寅&shareId=${SHARE_ID}`);

  // 결과 완료 시점에는 주소에 쿼리가 없다.
  assert.deepEqual(resolveShareInbound(''), { fromGuardianId: '甲寅', shareId: SHARE_ID });
});

test('새 공유 링크로 다시 들어오면 최신 문맥으로 갱신한다', () => {
  saveShareInbound({ fromGuardianId: '甲寅', shareId: SHARE_ID });
  const next = '22222222-2222-4222-8222-222222222222';

  const resolved = resolveShareInbound(`?fromGuardian=乙丑&shareId=${next}`);

  assert.deepEqual(resolved, { fromGuardianId: '乙丑', shareId: next });
  assert.deepEqual(loadShareInbound(), { fromGuardianId: '乙丑', shareId: next });
});

test('저장된 값이 깨졌으면 복구하지 않는다', () => {
  const store = installStore();
  for (const broken of ['not json', '{}', '{"fromGuardianId":"甲亥"}']) {
    store.set('jobsaju_share_inbound_v1', broken);
    assert.equal(loadShareInbound(), null);
  }
});

test('공유 URL에 수호신·유입원·shareId를 붙인다', () => {
  const url = new URL(buildShareUrl('https://jobsaju.kr/s/abc', '甲寅', SHARE_ID));

  assert.equal(url.searchParams.get('fromGuardian'), '甲寅');
  assert.equal(url.searchParams.get('utm_source'), 'guardian_share');
  assert.equal(url.searchParams.get('shareId'), SHARE_ID);
  assert.equal(url.pathname, '/s/abc', '원래 경로는 건드리지 않는다');
});

test('공유 URL을 다시 파싱하면 같은 문맥이 나온다', () => {
  const url = buildShareUrl('https://jobsaju.kr/', '癸亥', SHARE_ID);

  assert.deepEqual(parseShareInbound(new URL(url).search), { fromGuardianId: '癸亥', shareId: SHARE_ID });
});
