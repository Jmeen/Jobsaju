import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ROOT_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const PUBLIC_DIR = join(ROOT_DIR, 'public');

test('잡BTI 허브와 60개 유형 페이지가 정적 HTML로 생성된다', async () => {
  const hub = await readFile(join(PUBLIC_DIR, 'jobbti', 'index.html'), 'utf8');
  const typeDirectories = await readdir(join(PUBLIC_DIR, 'jobbti', 'types'));

  assert.equal(typeDirectories.length, 60);
  assert.match(hub, /<h1>일할 때 진짜 내 모습/);
  assert.match(hub, /<meta name="robots" content="index, follow, max-image-preview:large" \/>/);
  assert.match(hub, /<link rel="canonical" href="https:\/\/jobsaju\.kr\/jobbti\/" \/>/);
  assert.match(hub, /"@type":"ItemList"/);

  const firstType = await readFile(join(PUBLIC_DIR, 'jobbti', 'types', '01', 'index.html'), 'utf8');
  assert.match(firstType, /<h1>저지르쥐<\/h1>/);
  assert.match(firstType, /성과로 이어지는 강점/);
  assert.match(firstType, /강점이 과해질 때의 맹점/);
  assert.match(firstType, /https:\/\/jobsaju\.kr\/jobbti\/types\/01\//);

  const titles = new Set<string>();
  const canonicals = new Set<string>();
  for (const directory of typeDirectories) {
    const html = await readFile(join(PUBLIC_DIR, 'jobbti', 'types', directory, 'index.html'), 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const canonical = html.match(/<link rel="canonical" href="([^"]+)" \/>/)?.[1];

    assert.ok(title, `${directory}번 유형의 title이 필요합니다.`);
    assert.ok(canonical, `${directory}번 유형의 canonical이 필요합니다.`);
    assert.doesNotMatch(html, /undefined|null/);
    assert.match(html, /<meta name="description" content="[^"]+" \/>/);
    assert.match(html, /<script type="application\/ld\+json">/);
    titles.add(title);
    canonicals.add(canonical);
  }
  assert.equal(titles.size, 60);
  assert.equal(canonicals.size, 60);
});

test('sitemap과 robots가 공개 SEO 문서만 안내한다', async () => {
  const sitemap = await readFile(join(PUBLIC_DIR, 'sitemap.xml'), 'utf8');
  const robots = await readFile(join(PUBLIC_DIR, 'robots.txt'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);

  assert.equal(urls.length, 62);
  assert.equal(new Set(urls).size, 62);
  assert.ok(urls.includes('https://jobsaju.kr/'));
  assert.ok(urls.includes('https://jobsaju.kr/jobbti/'));
  assert.ok(urls.includes('https://jobsaju.kr/jobbti/types/60/'));
  assert.doesNotMatch(sitemap, /token|api\/share-page|admin/);
  assert.match(robots, /Allow: \/api\/share-page\//);
  assert.match(robots, /Allow: \/api\/share-card\//);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/jobsaju\.kr\/sitemap\.xml/);
});
