import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

const token = 'valid-followup-token-1234567890';

function createKv() {
  const writes = [];
  const values = new Map([
    [`token:${token}`, JSON.stringify({ status: 'unlocked' })],
    [`report:copy-v2:${token}`, JSON.stringify({
      status: 'success',
      report: {
        snapshot: { generated_at: '2026-08-29T00:00:00.000Z', timezone: 'Asia/Seoul', analysis_period: '2026-08 ~ 2027-01' },
        report_summary: { headline: '서버에 저장된 결론', one_line_action: '서버에 저장된 첫 행동' },
        timeline: [{ year_month: '2026-08', scores: { job_change: 62, negotiation: 51, stay: 45 }, action: '2026년 8월에는 서버 원본 행동을 확인하세요.' }],
        decision: { strategy: '서버 원본 전략', decision_guide: { must_haves: ['서버 원본 조건'] } },
        personalized_advice: { recommendation: '서버 원본 추천' },
      },
    })],
    [`meta:${token}`, JSON.stringify({
      user_context: { current_job: '서버 저장 7년차 IT 서비스 기획자', career_goal: '서버 저장 핀테크 프로덕트 리더' },
      saju_data: { dayGan: { gan: '병' }, elementsCount: { wood: 2, fire: 3, earth: 1, metal: 1, water: 1 } },
    })],
  ]);
  return {
    writes,
    async get(key) {
      return values.get(key) ?? null;
    },
    async put(...args) {
      writes.push(args);
      values.set(args[0], args[1]);
    },
  };
}

function createRequest(question, questionIndex = 1) {
  return new Request('https://example.com/api/followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unlock_token: token,
      question,
      question_index: questionIndex,
      saju_summary: { scores: { jobChange: 60, stay: 55, negotiation: 52 } },
      user_context: {
        current_status: '변조된 브라우저 상황',
        current_job: '클라이언트가 바꾼 직무',
        career_goal: '클라이언트가 바꾼 목표',
      },
      report_timeline: [{ year_month: '2099-99', action: '변조된 브라우저 리포트' }],
      previous_followups: [{ question: '변조 질문', answer: '변조 답변' }],
    }),
  });
}

function modelOutput(overrides = {}) {
  return {
    question_analysis: { summary: '지원하기 좋은 구체적인 시점을 알고 싶다', primary_intent: 'timing', secondary_intents: [], answer_mode: 'timing', constraints: [] },
    answer_sections: {
      conclusion: '지금 바로 지원하기보다 목표 공고의 요구조건을 확인한 뒤 준비가 맞는 곳부터 먼저 지원하는 편을 추천합니다.',
      reasons: [
        '원본 리포트에서는 현재 달을 조건을 정리하고 비교를 시작하는 구간으로 봅니다.',
        '채용 일정만 보고 날짜를 정하기보다 지금까지의 성과와 목표 역할이 공고 요구조건에 얼마나 맞는지 확인해야 지원 시점을 현실적으로 고를 수 있습니다.',
      ],
      action: '오늘 목표 회사 공고 세 개를 골라 공통 요구조건과 부족한 근거를 한 장에 적어보세요.',
    },
    ...overrides,
  };
}

test('일반 직접 등록은 막고, 유료 토큰의 링크 복사 보상과 공유 ID 연결만 허용한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: token }),
  }), { SAJU_KV: kv });

  assert.equal(response.status, 403);

  const copyResponse = await worker.fetch(new Request('https://example.com/api/share-bonus/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: token }),
  }), { SAJU_KV: kv });
  assert.equal(copyResponse.status, 200);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));

  const bindResponse = await worker.fetch(new Request('https://example.com/api/share-bonus/bind', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: token, share_id: '11111111-1111-4111-8111-111111111111' }),
  }), { SAJU_KV: kv });
  assert.equal(bindResponse.status, 200);
  assert.ok(kv.writes.some(write => write[0] === 'share-auth:11111111-1111-4111-8111-111111111111'));
});

test('결제하지 않은 토큰은 링크 복사 보상을 만들 수 없다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus/copy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: 'not-paid-token-1234567890' }),
  }), { SAJU_KV: kv });

  assert.equal(response.status, 403);
  assert.equal(kv.writes.some(write => write[0].startsWith('share-bonus:')), false);
});

test('공유 보너스가 있으면 두 번째 질문을 허용하고 세 번째는 거부한다', async () => {
  const originalFetch = globalThis.fetch;
  const validModelOutput = modelOutput();
  let sentPrompt = '';
  globalThis.fetch = async (_url, options) => {
    sentPrompt = JSON.parse(options.body).contents[0].parts[0].text;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validModelOutput) }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const kv = createKv();

  try {
    await kv.put(`followup:${token}`, new Date().toISOString());
    await kv.put(`share-bonus:${token}`, new Date().toISOString());
    await kv.put(`followups:${token}`, JSON.stringify([{ question: '첫 질문입니다', answer: '첫 답변입니다', answeredAt: '2026-08-29' }]));
    const second = await worker.fetch(createRequest('두 번째 질문은 언제 지원하면 좋을까요?', 2), { SAJU_KV: kv, GEMINI_API_KEY: 'test-key' });
    const third = await worker.fetch(createRequest('세 번째 질문도 가능한가요?', 3), { SAJU_KV: kv, GEMINI_API_KEY: 'test-key' });

    assert.equal(second.status, 200);
    assert.equal(third.status, 409);
    assert.match(sentPrompt, /첫 질문입니다/);
    assert.match(sentPrompt, /첫 답변입니다/);
    assert.ok(kv.writes.some(write => write[0] === `followup:${token}:bonus`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('차단 질문은 Gemini를 호출하거나 질문권을 소진하지 않는다', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    throw new Error('Gemini를 호출하면 안 됩니다');
  };
  const kv = createKv();

  try {
    const response = await worker.fetch(createRequest('로또 번호 6개를 정확히 알려줘'), {
      SAJU_KV: kv,
      GEMINI_API_KEY: 'test-key',
    });
    const body = await response.json();

    assert.equal(response.status, 422);
    assert.equal(body.code, 'FOLLOWUP_BLOCKED');
    assert.match(body.error, /안전|제공할 수/);
    assert.match(body.suggestion, /커리어|이직|직무/);
    assert.equal(fetchCount, 0);
    assert.deepEqual(kv.writes, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('허용 질문은 구조화 분석 계약과 사용자 커리어 정보를 Gemini에 전달한다', async () => {
  const originalFetch = globalThis.fetch;
  let sentUrl;
  let sentHeaders;
  let sentBody;
  const validModelOutput = modelOutput({
    question_analysis: {
      summary: 'IT 경력을 유지할지 인접 산업으로 옮길지 알고 싶다',
      primary_intent: 'industry',
      secondary_intents: ['compare'],
      answer_mode: 'choice',
      constraints: ['현재 IT 경력 활용'],
    },
  });
  globalThis.fetch = async (url, options) => {
    sentUrl = String(url);
    sentHeaders = options.headers;
    sentBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validModelOutput) }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const kv = createKv();

  try {
    const response = await worker.fetch(createRequest('어떤 업종의 회사로 가는 게 낫나요. IT를 유지하는 게 맞나요?'), {
      SAJU_KV: kv,
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'test-model',
      CF_AIG_ACCOUNT_ID: 'account-123',
      CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
      CF_AIG_TOKEN: 'gateway-token',
    });
    const body = await response.json();
    const systemText = sentBody.systemInstruction.parts[0].text;
    const promptText = sentBody.contents[0].parts[0].text;

    assert.equal(response.status, 200);
    assert.equal(sentUrl, 'https://gateway.ai.cloudflare.com/v1/account-123/jobsaju-gemini/google-ai-studio/v1/models/test-model:generateContent');
    assert.equal(sentHeaders['x-goog-api-key'], 'test-key');
    assert.equal(sentHeaders['cf-aig-authorization'], 'Bearer gateway-token');
    assert.equal(sentBody.contents[0].role, 'user');
    assert.equal(body.question_analysis.primary_intent, 'industry');
    assert.match(systemText, /question_analysis/);
    assert.match(systemText, /질문을 먼저 정리/);
    assert.match(systemText, /서로 겹치지 않는 근거를 정확히 2~3개/);
    assert.match(promptText, /서버 저장 7년차 IT 서비스 기획자/);
    assert.match(promptText, /서버 저장 핀테크 프로덕트 리더/);
    assert.match(promptText, /서버 원본 전략/);
    assert.match(promptText, /원본 6개월 분석기간 안의 1번째 달/);
    assert.doesNotMatch(promptText, /클라이언트가 바꾼 직무|변조된 브라우저 리포트|변조 질문/);
    assert.match(promptText, /업종/);
    // 질문권 소진 기록이 남아야 한다. 답변 이력 저장(followups:) 같은 부가 쓰기가
    // 늘어나도 깨지지 않도록, 전체 목록을 통째로 비교하지 않고 포함 여부만 본다.
    const writtenKeys = kv.writes.map(write => write[0]);
    assert.ok(writtenKeys.includes(`followup:${token}`));
    // 저장되는 답변은 반드시 문자열이어야 한다. 객체(question_analysis 포함)로 저장하면
    // 재열람 시 FormattedAnswer가 문자열을 기대하다 렌더에서 깨진다.
    const followupsWrite = kv.writes.find(write => write[0] === `followups:${token}`);
    assert.ok(followupsWrite, 'followups 목록이 저장되어야 한다');
    const savedFollowups = JSON.parse(followupsWrite[1]);
    assert.equal(typeof savedFollowups[0].answer, 'string');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('잘못된 AI JSON은 질문권을 소진하지 않고 502를 반환한다', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ answer_sections: { conclusion: '짧음', reasons: ['짧음'], action: '짧음' } }) }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const kv = createKv();

  try {
    const response = await worker.fetch(createRequest('어떤 업종으로 가야 할까요?'), {
      SAJU_KV: kv,
      GEMINI_API_KEY: 'test-key',
    });
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.equal(body.code, 'FOLLOWUP_INVALID_RESPONSE');
    assert.deepEqual(kv.writes, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
