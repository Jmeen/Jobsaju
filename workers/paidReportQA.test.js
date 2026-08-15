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

test('API: Concurrency check on identical payment_id', async () => {
  const paymentId = "concurrent_test_123";
  const reqBody = {
    payment_id: paymentId,
    birth: { year: 1990, month: 1, day: 1, isSolar: true, gender: "M" },
    career_context: { worry_text: "test" }
  };
  
  const createMockReq = () => ({ json: async () => reqBody });
  
  // Create a mock env that fakes the LLM request to just delay
  // But wait, the code uses fetch globally. We can't easily mock global fetch in node:test
  // without messing with globals. However, we can just test that handlePaidReportRequest 
  // catches the duplicate in the in-memory set immediately.
  
  const env = {
    GEMINI_API_KEY: "fake"
  };

  // Trigger both simultaneously
  const p1 = handlePaidReportRequest(createMockReq(), env);
  const p2 = handlePaidReportRequest(createMockReq(), env);
  
  const [res1, res2] = await Promise.all([p1, p2]);
  
  // One of them should be a 429
  const statuses = [res1.status, res2.status];
  assert.ok(statuses.includes(429), "One request should be rate-limited (429)");
});
