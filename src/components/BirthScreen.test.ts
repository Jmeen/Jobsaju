import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('첫 방문의 생년월일 입력은 예시 날짜 없이 비어 있다', async (t) => {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: join(tmpdir(), 'jobsaju-birth-screen-test-cache'),
    server: { middlewareMode: true, hmr: { port: 24680 } },
    appType: 'custom',
  });
  t.after(() => vite.close());

  const { AppProvider } = await vite.ssrLoadModule('/src/contexts/AppContext.tsx');
  const { BirthScreen } = await vite.ssrLoadModule('/src/components/screens/BirthScreen.tsx');
  const html = renderToStaticMarkup(
    createElement(AppProvider, null, createElement(BirthScreen)),
  );

  assert.match(html, /aria-label="생년월일 여섯 자리"[^>]*value=""/);
  assert.match(html, /placeholder="______"/);
  assert.doesNotMatch(html, /value="930812"/);
});

test('첫 방문의 필수 성별은 어느 쪽도 기본 선택하지 않는다', async (t) => {
  const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
  const vite = await createServer({
    root: projectRoot,
    configFile: false,
    cacheDir: join(tmpdir(), 'jobsaju-gender-selection-test-cache'),
    server: { middlewareMode: true, hmr: { port: 24681 } },
    appType: 'custom',
  });
  t.after(() => vite.close());

  const { AppProvider } = await vite.ssrLoadModule('/src/contexts/AppContext.tsx');
  const { BirthScreen } = await vite.ssrLoadModule('/src/components/screens/BirthScreen.tsx');
  const html = renderToStaticMarkup(
    createElement(AppProvider, null, createElement(BirthScreen)),
  );

  assert.match(html, />성별 \(필수\)<\/span>/);
  assert.match(html, /aria-pressed="false">여성<\/button>/);
  assert.match(html, /aria-pressed="false">남성<\/button>/);
  assert.doesNotMatch(html, /jg-toggle is-on[^>]*>여성<\/button>/);
  assert.doesNotMatch(html, /jg-toggle is-on[^>]*>남성<\/button>/);
});
