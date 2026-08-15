import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAndRepairPaidReport } from './paidReportValidator.js';

test('Validator: Corrupted Highlights and Timeline', async () => {
  const timeline = [];
  for (let i = 0; i < 12; i++) {
    timeline.push({ year_month: `2026-${String(8+i).padStart(2, '0')}`, scores: { job_change: 85, negotiation: 40, stay: 15 } });
  }
  const precomputed_highlights = {
    best_job_change_month: "2026-08",
    best_negotiation_month: "2026-09",
    caution_month: "2026-08"
  };

  const corruptedLLMResponse = JSON.stringify({
    report_summary: { headline: "Good", one_line_action: "Do good" },
    timing_highlights: {
      best_job_change: {
        year_month: "2099-99", // Wrong year_month
        score: 999, // Wrong score
        reason: "Fake reason",
        action: "Fake action"
      },
      // Missing best_negotiation and caution_month
    },
    timeline: [
      {
        year_month: "2099-99", // Wrong year_month
        scores: { job_change: 100, negotiation: 100, stay: 100 }, // Manipulated scores
        keyword: "Fake keyword",
        summary: "Fake summary",
        action: "Fake action"
      }
    ],
    // Missing personalized_advice
  });

  const repaired = validateAndRepairPaidReport(corruptedLLMResponse, timeline, precomputed_highlights);

  // Assert Highlights Restored
  assert.equal(repaired.timing_highlights.best_job_change.year_month, "2026-08");
  assert.equal(repaired.timing_highlights.best_job_change.score, 85);
  
  assert.equal(repaired.timing_highlights.best_negotiation.year_month, "2026-09");
  assert.equal(repaired.timing_highlights.best_negotiation.score, 40);

  assert.equal(repaired.timing_highlights.caution_month.year_month, "2026-08");

  // Assert Timeline Restored
  assert.equal(repaired.timeline[0].year_month, "2026-08");
  assert.equal(repaired.timeline[0].scores.job_change, 85);

  // Assert Missing Fields Restored (Safety net)
  assert.ok(repaired.personalized_advice.action_steps.length > 0);
});

test('Validator: Completely Empty / Malformed JSON', async () => {
  const timeline = [{ year_month: "2026-08", scores: { job_change: 85, negotiation: 40, stay: 15 } }];
  const precomputed_highlights = { best_job_change_month: "2026-08", best_negotiation_month: "2026-08", caution_month: "2026-08" };

  try {
    validateAndRepairPaidReport("INVALID JSON", timeline, precomputed_highlights);
    assert.fail("Should throw on invalid JSON");
  } catch (e) {
    assert.match(e.message, /Failed to parse/);
  }
});

import { handlePaidReportRequest } from './paidReportApi.js';

test('API: 같은 payment_id로 동시에 들어오면 한 건만 생성하고 나머지는 202로 돌린다', async () => {
  const paymentId = "concurrent_test_123";
  const reqBody = {
    payment_id: paymentId,
    birth: { year: 1990, month: 1, day: 1, isSolar: true, gender: "M" },
    career_context: { worry_text: "test" }
  };

  const createMockReq = () => ({ json: async () => reqBody });
  const env = { GEMINI_API_KEY: "fake" };

  // D1 바인딩이 없으면 isolate 메모리 Set으로 중복을 막는다(paidReportApi의 폴백 경로).
  // Gemini는 실제로 부르지 않는다 — 여기서 보려는 건 중복 차단이지 리포트 생성이 아니다.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: '{}' }] } }],
  }), { status: 200 });

  try {
    const [res1, res2] = await Promise.all([
      handlePaidReportRequest(createMockReq(), env),
      handlePaidReportRequest(createMockReq(), env),
    ]);

    const statuses = [res1.status, res2.status];
    // 뒤늦게 들어온 쪽은 생성을 다시 시작하지 않고 "생성 중"으로 돌아가야 한다.
    assert.ok(statuses.includes(202), `둘 중 하나는 202여야 한다 (실제: ${statuses.join(', ')})`);
    assert.equal(statuses.filter(status => status === 202).length, 1, '한 건은 실제로 생성을 진행해야 한다');

    const pending = res1.status === 202 ? res1 : res2;
    assert.match(await pending.text(), /Generating/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
