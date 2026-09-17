import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('출퇴근 수호신 헤더는 노랑 마크와 서비스 소개를 표시한다', async (t) => {
  const vite = await createServer({
    root: fileURLToPath(new URL('../..', import.meta.url)),
    configFile: false,
    cacheDir: join(tmpdir(), 'jobsaju-vite-test-cache'),
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { BrandHeader } = await vite.ssrLoadModule('/src/components/BrandHeader.tsx');
  const html = renderToStaticMarkup(createElement(BrandHeader));
  assert.match(html, /<header[^>]*aria-label="출퇴근 수호신 · 잡사주"/);
  assert.match(html, /<strong>출퇴근 수호신<\/strong>/);
  assert.match(html, /잡BTI/);
  assert.match(html, /이직·커리어 사주/);
  assert.match(html, /src="\/favicon\.svg\?v=yellow-v1" width="32" height="32" alt=""/);
  assert.doesNotMatch(html, /<a|<button/);
});

test('탭·공유 제목과 노랑 파비콘은 같은 브랜드를 사용한다', () => {
  const index = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const icon = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');
  const appContext = readFileSync(new URL('../contexts/AppContext.tsx', import.meta.url), 'utf8');
  const title = '출퇴근 수호신 | 잡BTI · 이직·커리어 사주';
  assert.ok(index.includes(`<title>${title}</title>`));
  assert.ok(appContext.includes(`document.title = '${title}'`));
  assert.ok(index.includes(`property="og:title" content="${title}"`));
  assert.ok(index.includes(`name="twitter:title" content="${title}"`));
  assert.match(index, /href="\/favicon\.svg\?v=yellow-v1"/);
  assert.match(icon, /fill="#FEE500"/);
  assert.match(icon, /stroke="#3D3100"/);
  assert.doesNotMatch(icon, /#66866e|<script/);
});
