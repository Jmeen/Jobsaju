import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('각 리포트 문단을 안전한 시맨틱 마크업으로 렌더링한다', async (t) => {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: join(tmpdir(), 'jobsaju-report-prose-test-cache'),
    server: { middlewareMode: true, hmr: { port: 24679 } },
    appType: 'custom',
  });
  t.after(() => vite.close());

  const { ReportProse } = await vite.ssrLoadModule('/src/components/ReportProse.tsx');
  const html = renderToStaticMarkup(createElement(ReportProse, {
    text: '첫 문단입니다.\n<script>alert(1)</script>',
  }));

  assert.match(html, /class="report-prose"/);
  assert.equal((html.match(/<p>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
