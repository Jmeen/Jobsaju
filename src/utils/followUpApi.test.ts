import test from 'node:test';
import assert from 'node:assert/strict';
import { requestFollowUp } from './followUpApi.ts';

test('객체 또는 빈 답변은 화면 상태에 들어가지 않는다', async () => {
  for (const answer of [{ answer: 'nested' }, '', null]) {
    await assert.rejects(requestFollowUp('token', '질문입니다', 1, async () => Response.json({ answer }, { headers: { 'X-Request-Id': 'trace-id' } })), error => {
      assert.match((error as Error).message, /답변 내용을 읽지 못했습니다/);
      assert.equal((error as { requestId: string }).requestId, 'trace-id');
      return true;
    });
  }
});
test('타임아웃은 요청을 중단하고 질문권 미사용을 단정하지 않는다', async () => {
  const fetcher: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });
  await assert.rejects(requestFollowUp('token', '질문입니다', 1, fetcher, 5), /같은 질문으로 다시 시도/);
});
test('저장된 재시도 답변은 정상 반환된다', async () => {
  assert.equal(await requestFollowUp('token', '질문입니다', 1, async () => Response.json({ answer: '저장된 답변', recovered: true })), '저장된 답변');
});
