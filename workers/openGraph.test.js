import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('기본 URL 공유용 OG 이미지가 실제 PNG 파일을 가리킨다', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const png = await readFile(new URL('../public/og-share.png', import.meta.url));
  assert.match(html, /property="og:image" content="https:\/\/jobsaju\.kr\/og-share\.png"/);
  assert.match(html, /property="og:url" content="https:\/\/jobsaju\.kr\/"/);
  assert.match(html, /property="og:title" content="지금 옮길까, 남을까\? 6개월 이직 로드맵"/);
  assert.match(html, /property="og:description" content="내 사주와 실제 고민을 분석하고, 궁금한 점까지 직접 질문해보세요\."/);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.byteLength > 10_000);
});
