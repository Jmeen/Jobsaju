import assert from 'node:assert/strict';
import test from 'node:test';
import { renderAllResultCards } from './resultCardTargets.ts';

test('화면에 있는 두 결과 카드 캔버스를 모두 렌더링한다', () => {
  const first = { id: 'summary' };
  const second = { id: 'viral' };
  const rendered: string[] = [];

  renderAllResultCards([first, second], canvas => rendered.push(canvas.id));

  assert.deepEqual(rendered, ['summary', 'viral']);
});

test('없는 캔버스와 중복 캔버스를 건너뛴다', () => {
  const canvas = { id: 'summary' };
  let renderCount = 0;

  renderAllResultCards([canvas, null, canvas], () => { renderCount += 1; });

  assert.equal(renderCount, 1);
});
