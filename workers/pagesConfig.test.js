import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Pages 설정에는 Worker 전용 observability 필드가 없다', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(Object.hasOwn(config, 'observability'), false);
  assert.equal(config.name, 'job-saju');
  assert.equal(config.pages_build_output_dir, './dist');
  assert.equal(config.vars.GEMINI_MODEL, 'gemini-2.5-flash');
});
