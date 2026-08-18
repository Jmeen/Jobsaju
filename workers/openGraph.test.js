import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('기본 URL 공유가 수호신 메시지와 새 PNG 카드를 사용한다', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const png = await readFile(new URL('../public/og-guardian-share.png', import.meta.url));
  assert.match(html, /property="og:image" content="https:\/\/jobsaju\.kr\/og-guardian-share\.png"/);
  assert.match(html, /property="og:url" content="https:\/\/jobsaju\.kr\/"/);
  assert.match(html, /property="og:title" content="직장인마다 하나씩 있다는 60마리 중 내 수호신은 누구\?"/);
  assert.match(html, /property="og:description" content="태어난 날의 기운으로 만나는 나랑 꼭 닮은 직장생활 수호신"/);
  assert.match(html, /name="twitter:image" content="https:\/\/jobsaju\.kr\/og-guardian-share\.png"/);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.byteLength > 10_000);
});
