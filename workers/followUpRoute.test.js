import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

const token = 'valid-followup-token-1234567890';

function createKv() {
  const writes = [];
  const values = new Map([[`token:${token}`, JSON.stringify({ status: 'unlocked' })]]);
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
        current_status: '이직 고민 중',
        current_job: '7년차 IT 서비스 기획자',
        career_goal: '핀테크 프로덕트 리더',
      },
    }),
  });
}

test('유효한 해금 토큰으로 공유 보너스를 등록한다', async () => {
  const kv = createKv();
  const response = await worker.fetch(new Request('https://example.com/api/share-bonus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock_token: token }),
  }), { SAJU_KV: kv });

  assert.equal(response.status, 200);
  assert.ok(kv.writes.some(write => write[0] === `share-bonus:${token}`));
});

test('공유 보너스가 있으면 두 번째 질문을 허용하고 세 번째는 거부한다', async () => {
  const originalFetch = globalThis.fetch;
  const validModelOutput = {
    question_analysis: { summary: '지원하기 좋은 구체적인 시점을 알고 싶다', primary_intent: 'timing', secondary_intents: [], answer_mode: 'timing', constraints: [] },
    answer: '공유 보너스로 받은 두 번째 질문은 지원 시점을 묻고 있으므로, 현재 준비 수준과 채용 일정부터 함께 확인해야 합니다. 경력기술서와 목표 기업 목록을 먼저 정리하고 공고 요구조건의 충족률이 높아지는 시점에 지원하는 편이 안전합니다. 면접에서 설명할 성과 세 가지와 희망 조건을 수치로 적은 뒤, 목표 회사의 공고가 두 개 이상 겹치는 주간부터 지원을 시작해 보세요. 준비가 덜 됐다면 날짜를 억지로 정하기보다 매주 공고 적합도를 확인하는 편이 낫습니다.',
  };
  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(validModelOutput) }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const kv = createKv();

  try {
    await kv.put(`followup:${token}`, new Date().toISOString());
    await kv.put(`share-bonus:${token}`, new Date().toISOString());
    const second = await worker.fetch(createRequest('두 번째 질문은 언제 지원하면 좋을까요?', 2), { SAJU_KV: kv, GEMINI_API_KEY: 'test-key' });
    const third = await worker.fetch(createRequest('세 번째 질문도 가능한가요?', 3), { SAJU_KV: kv, GEMINI_API_KEY: 'test-key' });

    assert.equal(second.status, 200);
    assert.equal(third.status, 409);
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
  const validModelOutput = {
    question_analysis: {
      summary: 'IT 경력을 유지할지 인접 산업으로 옮길지 알고 싶다',
      primary_intent: 'industry',
      secondary_intents: ['compare'],
      answer_mode: 'choice',
      constraints: ['현재 IT 경력 활용'],
    },
    answer: 'IT 경력을 버리고 완전히 낯선 업종으로 가기보다, 지금까지의 서비스 기획 경험이 통하는 핀테크나 B2B SaaS부터 확인하는 편이 낫습니다. '.repeat(4),
  };
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
    assert.equal(body.question_analysis.primary_intent, 'industry');
    assert.match(systemText, /question_analysis/);
    assert.match(systemText, /질문을 먼저 정리/);
    assert.match(promptText, /7년차 IT 서비스 기획자/);
    assert.match(promptText, /핀테크 프로덕트 리더/);
    assert.match(promptText, /업종/);
    // 질문권 소진 기록이 남아야 한다. 답변 이력 저장(followups:) 같은 부가 쓰기가
    // 늘어나도 깨지지 않도록, 전체 목록을 통째로 비교하지 않고 포함 여부만 본다.
    const writtenKeys = kv.writes.map(write => write[0]);
    assert.ok(writtenKeys.includes(`followup:${token}`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('잘못된 AI JSON은 질문권을 소진하지 않고 502를 반환한다', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify({ answer: '너무 짧고 분석도 없습니다.' }) }] } }],
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
