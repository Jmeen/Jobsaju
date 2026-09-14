export class FollowUpRequestError extends Error {
  requestId: string;
  constructor(message: string, requestId = '') {
    super(message);
    this.requestId = requestId;
  }
}

export async function requestFollowUp(
  token: string, question: string, questionIndex: number,
  fetcher: typeof fetch = fetch, timeoutMs = 110000,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let requestId = '';
  try {
    const response = await fetcher('/api/followup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ unlock_token: token, question, question_index: questionIndex }),
    });
    requestId = response.headers.get('X-Request-Id') || '';
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof data?.error === 'string' ? data.error : '답변을 만들지 못했습니다. 잠시 후 같은 질문으로 다시 시도해 주세요.';
      throw new FollowUpRequestError([message, typeof data?.suggestion === 'string' ? data.suggestion : ''].filter(Boolean).join(' '), requestId);
    }
    if (typeof data?.answer !== 'string' || !data.answer.trim()) {
      throw new FollowUpRequestError('답변 내용을 읽지 못했습니다. 같은 질문으로 다시 시도해 주세요.', requestId);
    }
    return data.answer;
  } catch (error) {
    if (error instanceof FollowUpRequestError) throw error;
    throw new FollowUpRequestError(controller.signal.aborted
      ? '답변을 기다리는 시간이 길어졌습니다. 잠시 후 같은 질문으로 다시 시도해 주세요.'
      : '연결이 끊겨 답변을 확인하지 못했습니다. 같은 질문으로 다시 시도하면 저장된 답변을 확인할 수 있습니다.', requestId);
  } finally { clearTimeout(timer); }
}
