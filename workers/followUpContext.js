const REPORT_VERSION = 'copy-v2';

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function unwrapReport(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.report?.report && typeof payload.report.report === 'object') return payload.report.report;
  if (payload.report && typeof payload.report === 'object') return payload.report;
  return payload;
}

export function locateQuestionDate(report, generatedAt) {
  const timeline = Array.isArray(report?.timeline) ? report.timeline : [];
  const period = String(report?.snapshot?.analysis_period || '');
  const periodMonths = period.match(/\d{4}-\d{2}/g) || [];
  const firstMonth = timeline[0]?.year_month || periodMonths[0] || null;
  const lastMonth = timeline.at(-1)?.year_month || periodMonths.at(-1) || null;
  const currentMonth = String(generatedAt || '').slice(0, 7);
  const timelineIndex = timeline.findIndex(month => month?.year_month === currentMonth);

  if (!firstMonth || !lastMonth || !/^\d{4}-\d{2}$/.test(currentMonth)) {
    return { status: 'unknown', current_month: currentMonth || null, message: '분석기간 안의 현재 위치를 확인할 수 없습니다.' };
  }
  if (currentMonth < firstMonth) {
    return { status: 'before', current_month: currentMonth, message: `원본 분석기간(${firstMonth}~${lastMonth})이 시작되기 전입니다.` };
  }
  if (currentMonth > lastMonth) {
    return { status: 'after', current_month: currentMonth, message: `원본 분석기간(${firstMonth}~${lastMonth})이 지난 뒤입니다. 원본 결론은 바꾸지 말고 현재 확인할 조건을 안내해야 합니다.` };
  }
  return {
    status: 'inside',
    current_month: currentMonth,
    month_index: timelineIndex >= 0 ? timelineIndex + 1 : null,
    source_month: timelineIndex >= 0 ? timeline[timelineIndex] : null,
    message: timelineIndex >= 0
      ? `원본 6개월 분석기간 안의 ${timelineIndex + 1}번째 달입니다.`
      : `원본 분석기간(${firstMonth}~${lastMonth}) 안입니다.`,
  };
}

/** 토큰에 고정 저장된 원본만 읽는다. 브라우저가 보낸 리포트 문맥은 사용하지 않는다. */
export async function loadStoredFollowUpContext(kv, token, generatedAt) {
  if (!kv || !token) return null;
  const [currentReportText, legacyReportText, metaText, followupsText] = await Promise.all([
    kv.get(`report:${REPORT_VERSION}:${token}`),
    kv.get(`report:${token}`),
    kv.get(`meta:${token}`),
    kv.get(`followups:${token}`),
  ]);
  const payload = parseJson(currentReportText || legacyReportText, null);
  const report = unwrapReport(payload);
  if (!report) return null;
  const meta = parseJson(metaText, {});
  const previousFollowups = parseJson(followupsText, []);
  return {
    original_report: {
      snapshot: report.snapshot || null,
      report_summary: report.report_summary || null,
      timing_highlights: report.timing_highlights || null,
      timeline: Array.isArray(report.timeline) ? report.timeline : [],
      decision: report.decision || null,
      personalized_advice: report.personalized_advice || null,
    },
    user_context: meta.user_context || {},
    saju_summary: meta.saju_data || {},
    previous_followups: Array.isArray(previousFollowups) ? previousFollowups.slice(0, 2) : [],
    question_date_position: locateQuestionDate(report, generatedAt),
  };
}
