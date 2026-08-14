import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

const token = 'valid-premium-token-1234567890';

function createKv() {
  const writes = [];
  const values = new Map([[`token:${token}`, JSON.stringify({ status: 'unlocked' })]]);
  return {
    writes,
    values,
    async get(key) { return values.get(key) ?? null; },
    async put(key, value, options) {
      writes.push([key, value, options]);
      values.set(key, value);
    },
  };
}

function createRequest() {
  return new Request('https://example.com/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unlock_token: token,
      user_context: {
        gender: '남성',
        current_status: '이직 지원 중',
        main_concern: '성장 정체',
        current_job: '7년 차 세일즈 담당자',
        career_goal: 'CEO',
        desired_answer: '합격이 안됨',
      },
      saju_data: {
        pillars: { year: '戊辰', month: '丙辰', day: '甲寅', hour: '甲子' },
        day_gan: '甲 (갑목)',
        elements: { wood: 3, fire: 1, earth: 2, metal: 0, water: 1 },
        scores: { job_change: 63, stay: 33, negotiation: 71 },
        body_strength: '신강',
        daewun: '庚申 대운',
        seewun_year: 2026,
        seewun_ganzhi: '丙午',
      },
    }),
  });
}

function validReport(overrides = {}) {
  return {
    intent_summary: { primary_question: '지원 전략 개선', role_interpretation: '리더 역할로 확장하려는 단계입니다.', assumptions: ['단계별 결과 확인이 필요합니다.'], needs_clarification: false },
    decision_factors: { summary: '지원 단계별 병목 확인이 필요합니다.', recommendation: '지원 기록을 먼저 나누어 보세요.', checks: ['서류와 면접 결과 구분'] },
    one_line_conclusion: '성과 근거를 정리한 뒤 선별적으로 지원해 보세요.',
    current_dilemma: { title: '성장 정체가 크게 느껴지는 이유', content: '불합격 원인은 입력만으로 확정할 수 없습니다.' },
    career_nature: { title: '업무 방식과 성장 조건', content: '성과를 문서로 남길 때 강점이 전달됩니다.', strengths: ['추진력'], cautions: ['기록을 미루는 경향'] },
    three_paths: [
      { key: 'change', title: '이직한다면', score: 63, content: '목표 역할을 정하세요.' },
      { key: 'stay', title: '남는다면', score: 33, content: '달라질 조건을 확인하세요.' },
      { key: 'negotiate', title: '협상한다면', score: 71, content: '성과 근거를 준비하세요.' },
    ],
    ideal_environment: { title: '잘 맞는 조직과 역할의 조건', content: '권한과 평가 기준이 명확한 조직을 확인하세요.', checklist: ['평가 기준 확인'] },
    action_plan: { do: ['지원 결과 정리'], avoid: ['감정적으로 지원 범위를 넓히기'] },
    personal_answer: { question: '이직 지원이 계속 불합격하는 이유와 개선 방향', content: '가능한 원인을 단계별로 확인해 보세요.' },
    closing_advice: '사주는 참고 자료이며 실제 지원 결과와 조건을 함께 확인하세요.',
    ...overrides,
  };
}

function geminiResponse(report) {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(report) }] } }],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

test('프리미엄 프롬프트는 서울 기준일과 미래 시점 규칙을 포함하고 백분위를 전달하지 않는다', async () => {
  const originalFetch = globalThis.fetch;
  let sentUrl;
  let sentHeaders;
  let sentBody;
  globalThis.fetch = async (url, options) => {
    sentUrl = String(url);
    sentHeaders = options.headers;
    sentBody = JSON.parse(options.body);
    return geminiResponse(validReport());
  };
  const kv = createKv();

  try {
    const response = await worker.fetch(createRequest(), {
      SAJU_KV: kv,
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'test-model',
      CF_AIG_ACCOUNT_ID: 'account-123',
      CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
      CF_AIG_TOKEN: 'gateway-token',
    });
    const systemText = sentBody.systemInstruction.parts[0].text;
    const promptText = sentBody.contents[0].parts[0].text;

    assert.equal(response.status, 200);
    assert.equal(sentUrl, 'https://gateway.ai.cloudflare.com/v1/account-123/jobsaju-gemini/google-ai-studio/v1/models/test-model:generateContent');
    assert.equal(sentHeaders['x-goog-api-key'], 'test-key');
    assert.equal(sentHeaders['cf-aig-authorization'], 'Bearer gateway-token');
    assert.match(systemText, /Asia\/Seoul/);
    assert.match(systemText, /기준일 이전.*추천하지/);
    assert.match(systemText, /정제.*질문 제목/);
    assert.match(promptText, /생성 기준일: \d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(`${systemText}\n${promptText}`, /또래 대비 백분위|상위 \d+%/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('첫 출력에 외국 문자가 섞이면 한 번 교정하고 검증된 결과만 버전 캐시에 저장한다', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return geminiResponse(fetchCount === 1
      ? validReport({ closing_advice: '내 ارزش을 증명하세요.' })
      : validReport());
  };
  const kv = createKv();

  try {
    const response = await worker.fetch(createRequest(), { SAJU_KV: kv, GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' });
    assert.equal(response.status, 200);
    assert.equal(fetchCount, 2);
    assert.ok(kv.writes.some(([key]) => key === `report:copy-v2:${token}`));
    assert.ok(!kv.writes.some(([key]) => key === `report:${token}`));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('두 번 모두 검증에 실패하면 캐시에 저장하지 않고 안전한 오류를 반환한다', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => geminiResponse(validReport({ closing_advice: '까다로운 정차를 견디세요.' }));
  const kv = createKv();

  try {
    const response = await worker.fetch(createRequest(), { SAJU_KV: kv, GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model' });
    const body = await response.json();
    assert.equal(response.status, 502);
    assert.equal(body.code, 'REPORT_INVALID_RESPONSE');
    assert.doesNotMatch(JSON.stringify(body), /정차|합격이 안됨|세일즈/);
    assert.ok(!kv.writes.some(([key]) => key.startsWith('report:')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
