import assert from 'node:assert/strict';
import test from 'node:test';
import { COPY_VARIANTS, getCopy, resolveCopyVariant } from './copy.ts';

test('카피 변형은 URL 파라미터로 고정할 수 있다', () => {
  const store = new Map<string, string>();
  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  } as unknown as Storage;

  assert.equal(resolveCopyVariant('?c=b', fake), 'b');
  assert.equal(resolveCopyVariant('', fake), 'b');
  assert.equal(resolveCopyVariant('?c=a', fake), 'a');
  assert.equal(resolveCopyVariant('', fake), 'a');
});

test('두 카피 변형은 서로 다르지만 백분위 비교를 약속하지 않는다', () => {
  const a = getCopy('a');
  const b = getCopy('b');

  assert.notDeepEqual(a.headline, b.headline);
  assert.notEqual(a.cta, b.cta);
  for (const variant of Object.values(COPY_VARIANTS)) {
    assert.ok(variant.headline.length > 0);
    assert.ok(variant.adHeadlines.length >= 3, '광고용 헤드라인 후보가 부족하다');
    assert.match(variant.unlockCta('4,900원'), /4,900원/);
    assert.doesNotMatch(JSON.stringify(variant), /상위|하위|백분위|또래와 비교/);
  }
});
