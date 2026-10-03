import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSalesTouch, salesAttribution } from './salesFunnel.ts';

test('UTM 네 가지를 읽고 형식이 틀린 값은 버린다', () => {
  assert.deepEqual(
    parseSalesTouch('?utm_source=threads&utm_medium=social&utm_campaign=stay-or-go-72h&utm_content=c1-criteria'),
    { utmSource: 'threads', utmMedium: 'social', utmCampaign: 'stay-or-go-72h', utmContent: 'c1-criteria' },
  );
  assert.deepEqual(parseSalesTouch('?utm_source=a%40b.com&utm_content=has%20space&fromGuardian=x'), {});
});

test('저장된 유입이 있으면 유지하고, 태그 없이 저장된 탭은 캠페인 링크로 갱신한다', async () => {
  const store = (initial: Record<string, string>) => {
    const data = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => { data.set(key, value); },
    } as unknown as Storage;
  };
  // 모듈 메모리가 호출 사이에 남으므로 경우마다 새로 불러온다.
  const fresh = async (tag: string) => (await import(`./salesFunnel.ts?${tag}`)) as typeof import('./salesFunnel.ts');

  const kept = (await fresh('kept')).captureSalesTouch(
    '?utm_source=threads', store({ jobsaju_sales_touch_v1: '{"utmSource":"instagram"}' }),
  );
  assert.equal(kept.utmSource, 'instagram');

  const upgraded = (await fresh('upgraded')).captureSalesTouch(
    '?utm_source=threads&utm_content=c2-timing', store({ jobsaju_sales_touch_v1: '{}' }),
  );
  assert.deepEqual(upgraded, { utmSource: 'threads', utmContent: 'c2-timing' });
});

test('브라우저가 아닌 환경에서는 유입 정보를 만들지 않는다', () => {
  assert.equal(salesAttribution(), undefined);
});
