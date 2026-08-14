import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Worker uses an available Gemini 3 Flash model and excludes retired fallbacks', async () => {
  const source = await readFile(new URL('./index.js', import.meta.url), 'utf8');
  assert.match(source, /const DEFAULT_GEMINI_MODEL = ["']gemini-3\.5-flash["']/);
  assert.match(source, /const FALLBACK_FLASH_MODELS = \[\s*["']gemini-3\.5-flash["']/);
  assert.doesNotMatch(source, /["']gemini-2\.5-flash-lite["']/);
  assert.doesNotMatch(source, /["']gemini-flash-latest["']/);
});
