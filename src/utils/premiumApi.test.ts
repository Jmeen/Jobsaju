import assert from 'node:assert/strict';
import test from 'node:test';
import { requestPremiumReport } from './premiumApi.ts';

const payload = {
  user_context: { current_status: '퇴사 고민 중' },
  saju_data: { scores: { job_change: 70 } },
};

test('샌드박스 승인으로 받은 토큰을 사용해 전체 리포트를 요청한다', async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, body: JSON.parse(String(init?.body)) });
    if (url === '/api/payment/validate') {
      return Response.json({ status: 'success', unlockToken: 'issued-token' });
    }
    return Response.json({ one_line_conclusion: '개인화된 전체 리포트' });
  };

  const report = await requestPremiumReport(payload, fakeFetch, 'sandbox-test-payment');

  assert.equal(report.one_line_conclusion, '개인화된 전체 리포트');
  assert.equal(report.unlockToken, 'issued-token');
  assert.deepEqual(requests.map(request => request.url), ['/api/payment/validate', '/api/interpret']);
  assert.equal(requests[1].body.unlock_token, 'issued-token');
});

test('배포 환경에 AI 키가 없으면 모의 리포트로 숨기지 않고 설정 오류를 전달한다', async () => {
  const fakeFetch: typeof fetch = async (input) => {
    if (String(input) === '/api/payment/validate') {
      return Response.json({ status: 'success', unlockToken: 'issued-token' });
    }
    return Response.json({ error: '서버 AI API Key 설정 오류' }, { status: 500 });
  };

  await assert.rejects(
    requestPremiumReport(payload, fakeFetch, 'sandbox-test-payment'),
    /AI 리포트 서버 설정이 완료되지 않았습니다/,
  );
});

test('해금 토큰 발급이 실패하면 AI 요청을 보내지 않는다', async () => {
  let requestCount = 0;
  const fakeFetch: typeof fetch = async () => {
    requestCount += 1;
    return Response.json({ error: '결제 검증에 실패했습니다.' }, { status: 400 });
  };

  await assert.rejects(
    requestPremiumReport(payload, fakeFetch, 'sandbox-test-payment'),
    /결제 검증에 실패했습니다/,
  );
  assert.equal(requestCount, 1);
});
