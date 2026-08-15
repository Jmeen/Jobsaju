import test from 'node:test';
import assert from 'node:assert';
import { getSajuAnalysis } from '../src/utils/sajuCore.ts';

test('import sajuCore test', () => {
  const result = getSajuAnalysis(1992, 8, 28, 12, 0, 1, { isSolar: true, hasTime: true });
  assert.ok(result);
  console.log('Successfully imported and executed sajuCore:', result.dayGan.hanja);
});
