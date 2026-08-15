export function validateAndRepairPaidReport(rawJsonText, timeline, precomputed_highlights) {
  let report;
  try {
    report = JSON.parse(rawJsonText);
  } catch (e) {
    throw new Error("Failed to parse LLM JSON output.");
  }

  // 1. Force restore highlights
  if (!report.timing_highlights) report.timing_highlights = {};
  
  // best_job_change
  if (!report.timing_highlights.best_job_change) report.timing_highlights.best_job_change = {};
  report.timing_highlights.best_job_change.year_month = precomputed_highlights.best_job_change_month;
  const bjcMonth = timeline.find(m => m.year_month === precomputed_highlights.best_job_change_month);
  report.timing_highlights.best_job_change.score = bjcMonth ? bjcMonth.scores.job_change : 0;
  report.timing_highlights.best_job_change.reason = report.timing_highlights.best_job_change.reason || "기회와 이동운이 강한 시기입니다.";
  report.timing_highlights.best_job_change.action = report.timing_highlights.best_job_change.action || "적극적으로 면접과 오퍼를 진행하세요.";

  // best_negotiation
  if (!report.timing_highlights.best_negotiation) report.timing_highlights.best_negotiation = {};
  report.timing_highlights.best_negotiation.year_month = precomputed_highlights.best_negotiation_month;
  const bnMonth = timeline.find(m => m.year_month === precomputed_highlights.best_negotiation_month);
  report.timing_highlights.best_negotiation.score = bnMonth ? bnMonth.scores.negotiation : 0;
  report.timing_highlights.best_negotiation.reason = report.timing_highlights.best_negotiation.reason || "협상력이 극대화되는 시기입니다.";
  report.timing_highlights.best_negotiation.action = report.timing_highlights.best_negotiation.action || "원하는 조건을 명확히 제시하세요.";

  // caution_month
  if (!report.timing_highlights.caution_month) report.timing_highlights.caution_month = {};
  report.timing_highlights.caution_month.year_month = precomputed_highlights.caution_month;
  report.timing_highlights.caution_month.reason = report.timing_highlights.caution_month.reason || "변동성과 리스크가 높은 시기입니다.";
  report.timing_highlights.caution_month.action = report.timing_highlights.caution_month.action || "신중하게 관망하며 결정을 보류하세요.";

  // 2. Force restore timeline
  if (!Array.isArray(report.timeline)) {
    report.timeline = [];
  }
  
  const repairedTimeline = [];
  for (let i = 0; i < 12; i++) {
    const t = timeline[i];
    const generatedMonth = report.timeline.find(m => m && m.year_month === t.year_month) || report.timeline[i] || {};
    
    repairedTimeline.push({
      year_month: t.year_month,
      scores: {
        job_change: t.scores.job_change,
        negotiation: t.scores.negotiation,
        stay: t.scores.stay
      },
      keyword: generatedMonth.keyword || "흐름 전환",
      summary: generatedMonth.summary || "조용히 내실을 다지며 때를 기다리는 것이 좋은 시기입니다.",
      action: generatedMonth.action || "현재의 안정성에 집중하세요."
    });
  }
  report.timeline = repairedTimeline;

  // 3. Guarantee other structures
  if (!report.report_summary) report.report_summary = { headline: "커리어 흐름", one_line_action: "상황을 주시하세요." };
  if (!report.personalized_advice) {
    report.personalized_advice = {
      question_summary: "현재 커리어 상황에 대한 방향성 고민",
      diagnosis: "전반적으로 흐름이 변동하는 시기입니다.",
      character_connection: "현재 성향상 너무 급한 결정은 독이 될 수 있습니다.",
      recommendation: "장기적인 안목으로 판단하세요.",
      action_steps: ["이력서를 업데이트하세요.", "네트워킹을 강화하세요.", "내부 성과를 기록하세요."],
      watch_out: ["충동적인 퇴사는 피하세요."]
    };
  }

  return report;
}
