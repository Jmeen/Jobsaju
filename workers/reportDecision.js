/**
 * 유료 리포트의 의사결정 척추.
 *
 * 월별 타임라인만을 원천으로 사용한다. LLM은 각 달의 맥락을 설명할 수는 있지만,
 * 핵심 시기·요약 결론·행동 순서를 새로 판단하거나 바꿀 수 없다.
 */
function scoreOf(month, axis) {
  return Number(month?.scores?.[axis] ?? 0);
}

function riskOf(month) {
  return Number(month?.debug?.semantic_signals?.Risk ?? 0);
}

function peakMonth(timeline, valueOf) {
  return timeline.reduce((best, month) => valueOf(month) > valueOf(best) ? month : best, timeline[0]);
}

function currentAction(month) {
  const scores = month.scores;
  if (scores.job_change >= scores.negotiation && scores.job_change >= scores.stay) {
    return { phase: '외부 탐색', detail: '외부 기회를 넓게 확인하되, 목표 역할과 최소 조건을 먼저 정리하세요.' };
  }
  if (scores.negotiation >= scores.stay) {
    return { phase: '내부 협상', detail: '성과와 원하는 조건을 정리해 현 직장에서의 역할·보상 대화를 시작하세요.' };
  }
  return { phase: '내부 안정 정비', detail: '현재 역할의 성과와 관계를 정비하며 다음 선택을 위한 기준을 다지세요.' };
}

function combinedAction(month, { isJob, isNegotiation, isRisk, isCurrent }) {
  if (isJob && isRisk) {
    return {
      phase: '조건부 이직 판단',
      detail: '외부 기회를 적극적으로 탐색하되, 역할·보상·조직 문화를 확인한 뒤 조건이 기준을 넘을 때만 결정하세요.',
    };
  }
  if (isJob) {
    return { phase: '외부 탐색·이직 검토', detail: '지원과 면접을 진행하며, 제안 조건을 현재 역할의 개선 가능성과 비교하세요.' };
  }
  if (isNegotiation) {
    return { phase: '내부 협상', detail: '성과 근거와 원하는 조건을 문서로 정리해 역할·보상 대화를 진행하세요.' };
  }
  if (isRisk) {
    return { phase: '조건 점검', detail: '변동 신호가 큰 달이므로 감정적인 결정보다 역할·조직·계약 조건을 먼저 확인하세요.' };
  }
  return isCurrent ? currentAction(month) : { phase: '흐름 점검', detail: '현재 조건과 외부 기회를 비교하며 다음 행동 기준을 점검하세요.' };
}

/** 월별 점수에서 핵심 시기와 복합 행동 전략을 단일하게 도출한다. */
export function deriveReportDecision(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    throw new Error('월별 타임라인 없이 리포트 결론을 만들 수 없습니다.');
  }

  const current = timeline[0];
  const bestJob = peakMonth(timeline, month => scoreOf(month, 'job_change'));
  const bestNegotiation = peakMonth(timeline, month => scoreOf(month, 'negotiation'));
  const highestRisk = peakMonth(timeline, riskOf);

  const markedMonths = new Map();
  const addMonth = (month, key) => {
    const existing = markedMonths.get(month.year_month) ?? { month, isJob: false, isNegotiation: false, isRisk: false, isCurrent: month === current };
    if (key === 'job') existing.isJob = true;
    if (key === 'negotiation') existing.isNegotiation = true;
    if (key === 'risk') existing.isRisk = true;
    markedMonths.set(month.year_month, existing);
  };

  // 행동 가이드는 반드시 이번 달부터 시작한다. 같은 달의 복수 신호는 하나의 행동으로 합친다.
  addMonth(current, 'current');
  addMonth(bestJob, 'job');
  addMonth(bestNegotiation, 'negotiation');
  addMonth(highestRisk, 'risk');

  const steps = [...markedMonths.values()]
    .sort((a, b) => a.month.year_month.localeCompare(b.month.year_month))
    .map(item => ({
      year_month: item.month.year_month,
      ...combinedAction(item.month, item),
    }));

  const strategy = steps.map(step => step.phase).join(' → ');
  const riskSharesJobMonth = highestRisk.year_month === bestJob.year_month;

  return {
    report_summary: {
      headline: `앞으로 6개월은 ${strategy} 순서로 움직이는 흐름입니다.`,
      one_line_action: `이번 달에는 ${steps[0].detail}`,
    },
    timing_highlights: {
      best_job_change: {
        year_month: bestJob.year_month,
        score: scoreOf(bestJob, 'job_change'),
        reason: '월별 흐름 중 외부 이동 점수가 가장 높은 달입니다.',
        action: riskSharesJobMonth
          ? '외부 기회를 적극적으로 탐색하되, 역할·보상·조직 문화를 확인한 뒤 조건이 기준을 넘을 때만 결정하세요.'
          : '지원과 면접을 진행하며, 제안 조건을 현재 역할의 개선 가능성과 비교하세요.',
      },
      best_negotiation: {
        year_month: bestNegotiation.year_month,
        score: scoreOf(bestNegotiation, 'negotiation'),
        reason: '월별 흐름 중 협상 점수가 가장 높은 달입니다.',
        action: '성과 근거와 원하는 조건을 문서로 정리해 역할·보상 대화를 진행하세요.',
      },
      caution_month: {
        year_month: highestRisk.year_month,
        reason: '월별 흐름 중 변동 리스크 신호가 가장 높은 달입니다.',
        action: riskSharesJobMonth
          ? '외부 기회를 적극적으로 탐색하되, 역할·보상·조직 문화를 확인한 뒤 조건이 기준을 넘을 때만 결정하세요.'
          : '감정적인 결정보다 역할·조직·계약 조건을 먼저 확인하세요.',
      },
    },
    strategy,
    steps,
    recommendation: `추천 전략: ${strategy}.`,
    watch_out: riskSharesJobMonth
      ? ['기회와 리스크가 같은 달에 겹칩니다. 검토 속도와 최종 결정 속도를 같게 두지 마세요.']
      : ['변동 신호가 큰 달에는 감정적인 퇴사나 구두 약속만으로 결론 내리는 일을 피하세요.'],
  };
}
