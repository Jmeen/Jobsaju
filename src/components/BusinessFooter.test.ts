import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('사업자 정보와 이메일 링크 및 비활성 정책명을 렌더링한다', async (t) => {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: join(tmpdir(), 'jobsaju-vite-test-cache'),
    server: { middlewareMode: true },
    appType: 'custom',
  });
  t.after(() => vite.close());

  const { BusinessFooter } = await vite.ssrLoadModule('/src/components/BusinessFooter.tsx');
  const html = renderToStaticMarkup(createElement(BusinessFooter));
  const text = html.replace(/<[^>]+>/g, '');

  assert.match(text, /잡사주 \| 운영: 두리하나랩/);
  assert.match(text, /대표 임재민/);
  assert.match(text, /사업자등록번호 306-16-54574/);
  assert.match(html, /href="mailto:admin@jobsaju\.kr"/);
  assert.match(text, /이용약관/);
  assert.match(text, /개인정보처리방침/);
  assert.match(text, /환불정책/);
  assert.doesNotMatch(html, /href="[^"]*">이용약관/);
  assert.doesNotMatch(html, /href="[^"]*">개인정보처리방침/);
  assert.doesNotMatch(html, /href="[^"]*">환불정책/);
});
