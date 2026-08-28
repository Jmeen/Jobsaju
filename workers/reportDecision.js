/**
 * 유료 리포트의 의사결정 척추.
 * 월별 점수가 판단의 원천이고, 오행·캐릭터는 우선 확인할 조건의 맥락만 보강한다.
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

export function summarizePeak(timeline, valueOf) {
  const values = timeline.map(valueOf);
  const sorted = [...values].sort((a, b) => b - a);
  const max = sorted[0] ?? 0;
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  return {
    max,
    average,
    runner_up_lead: max - (sorted[1] ?? max),
    range: max - (sorted.at(-1) ?? max),
  };
}

/**
 * 2026-08 기준 216개 실제 생년월일 표본에서 이직 최고점 p25=60,
 * 최고점-평균 p25=11.17, 최고점-2위 p50=8, 범위 p25=23이었다.
 * 하위 사분위 수준의 작은 흔들림은 고점으로 과장하지 않도록 보수적으로 잡는다.
 */
export const DISTINCT_PEAK_BASELINE = Object.freeze({
  minimum_peak: 60,
  minimum_average_lead: 10,
  minimum_runner_up_lead: 5,
  minimum_range: 20,
  calibration_sample_size: 216,
});

export function hasDistinctPeak(timeline, valueOf) {
  const summary = summarizePeak(timeline, valueOf);
  return summary.max >= DISTINCT_PEAK_BASELINE.minimum_peak
    && summary.max - summary.average >= DISTINCT_PEAK_BASELINE.minimum_average_lead
    && (summary.runner_up_lead >= DISTINCT_PEAK_BASELINE.minimum_runner_up_lead
      || summary.range >= DISTINCT_PEAK_BASELINE.minimum_range);
}

function formatMonth(yearMonth) {
  const [year, month] = String(yearMonth || '').split('-');
  return year && month ? `${year}년 ${Number(month)}월` : yearMonth;
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter(item => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CHARACTER_PROFILES = [
  {
    id: 'autonomy', keywords: ['주도성', '독립성', '결단', '전진성', '확장성'],
    must: '책임 범위와 함께 실제 의사결정 권한이 주어질 것',
    check: '중요한 우선순위를 누가 최종 결정하는가?',
    checkReason: '스스로 방향을 잡는 강점이 살아나려면 책임과 결정권이 같은 자리에 있어야 합니다.',
    redFlag: '신규 사업 책임은 크지만 의사결정 권한은 없음',
    redReason: '주도적으로 움직일수록 권한 없는 책임을 혼자 떠안을 가능성이 커집니다.',
    preparation: '맡고 싶은 결정과 맡지 않을 책임의 경계를 한 장에 적기',
  },
  {
    id: 'precision', keywords: ['전문성', '정교함', '정확성', '완성', '기준', '마감', '집중력'],
    must: '성과와 품질을 판단하는 기준이 구체적으로 합의될 것',
    check: '좋은 결과물의 기준과 검토 책임자는 누구인가?',
    checkReason: '완성도를 높이는 강점은 평가 기준이 선명할 때 성과로 인정받기 쉽습니다.',
    redFlag: '면접관마다 품질 기준과 성공 기준 설명이 다름',
    redReason: '기준이 엇갈리면 강점인 정교함이 끝없는 수정 업무로 바뀔 수 있습니다.',
    preparation: '대표 성과 한 건의 문제·판단 기준·결과를 세 문장으로 정리하기',
  },
  {
    id: 'relationship', keywords: ['관계감각', '공감', '관계조율', '돌봄', '포용', '수용'],
    must: '협업 조정 역할이 공식 책임과 평가에 반영될 것',
    check: '갈등이나 우선순위 충돌은 어떤 절차로 조정하는가?',
    checkReason: '관계를 연결하는 강점이 비공식 감정노동으로만 소비되지 않는지 확인해야 합니다.',
    redFlag: '갈등 조정 업무만 늘고 공식 권한과 평가 반영은 없음',
    redReason: '관계 감각이 좋을수록 조직의 빈틈을 무급 책임처럼 떠안을 수 있습니다.',
    preparation: '협업으로 해결한 갈등 한 건과 본인의 기여를 사실 중심으로 정리하기',
  },
  {
    id: 'stability', keywords: ['안정감', '책임', '지속력', '축적', '정리', '실용성'],
    must: '인력·예산·인수인계가 책임 범위에 맞게 제공될 것',
    check: '현재 팀의 인력 공백과 인수인계 계획은 어떻게 되는가?',
    checkReason: '끝까지 책임지는 강점이 구조 없는 조직의 뒷수습으로 바뀌지 않아야 합니다.',
    redFlag: '인수인계와 인력 계획 없이 즉시 정상화만 요구함',
    redReason: '책임감이 강할수록 준비되지 않은 운영 부담을 오래 떠안을 가능성이 있습니다.',
    preparation: '지속해서 맡을 일과 추가 자원이 필요한 일을 구분해 적기',
  },
];

const ELEMENT_PROFILES = {
  wood: { must: '다음 역할로 성장할 경로가 구체적으로 보일 것', check: '6개월 뒤 넓어지는 역할은 무엇인가?', redFlag: '성장 기회라고 하지만 역할 확장 경로가 없음', reason: '성장 여지는 직함보다 실제로 넓어지는 책임과 학습 범위에서 확인해야 합니다.' },
  fire: { must: '성과가 조직 안에서 보이고 피드백받는 구조가 있을 것', check: '성과를 누구에게 어떤 주기로 공유하는가?', redFlag: '대외 노출은 많지만 성공 지표와 피드백 책임자가 없음', reason: '표현력과 영향력은 성과가 보이는 구조에서 강점으로 이어집니다.' },
  earth: { must: '책임 증가에 맞는 인력과 운영 자원이 있을 것', check: '책임 범위에 배정된 인력과 예산은 얼마인가?', redFlag: '책임만 넓어지고 인력·예산 지원은 그대로임', reason: '운영을 받치는 힘이 무제한 부담으로 바뀌지 않도록 자원을 확인해야 합니다.' },
  metal: { must: '평가 기준과 의사결정 권한이 문서로 분명할 것', check: '평가 기준과 최종 승인 권한은 문서로 확인 가능한가?', redFlag: '결과 책임은 분명하지만 승인 권한과 평가 기준은 모호함', reason: '명확한 기준과 권한이 있어야 판단력과 실행력이 제대로 평가받습니다.' },
  water: { must: '사업 방향과 보고 체계가 잦게 흔들리지 않을 것', check: '사업 우선순위가 바뀔 때 누가 어떤 기준으로 결정하는가?', redFlag: '사업 방향이 자주 바뀌는데 최종 결정권자가 불분명함', reason: '변수를 읽는 강점은 정보와 결정 구조가 투명할 때 성과로 이어집니다.' },
};

function resolvePersonalization(context = {}) {
  const character = context.character || null;
  const keywords = Array.isArray(character?.keywords) ? character.keywords : [];
  const characterProfile = CHARACTER_PROFILES.find(profile => profile.keywords.some(keyword => keywords.includes(keyword)))
    || CHARACTER_PROFILES[0];
  const entries = Object.entries(context.elements || {}).filter(([, value]) => Number.isFinite(Number(value)));
  const dominantElement = entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'wood';
  return {
    characterId: character?.id || null,
    characterProfile,
    dominantElement,
    elementProfile: ELEMENT_PROFILES[dominantElement] || ELEMENT_PROFILES.wood,
  };
}

function currentAction(month) {
  const scores = month.scores;
  if (scores.job_change >= scores.negotiation && scores.job_change >= scores.stay) {
    return { phase: '외부 탐색', detail: '목표 역할과 최소 조건을 먼저 적고 맞는 공고를 비교하세요.' };
  }
  if (scores.negotiation >= scores.stay) {
    return { phase: '내부 협상', detail: '최근 성과와 원하는 조건을 정리해 역할·보상 대화를 준비하세요.' };
  }
  return { phase: '내부 안정 정비', detail: '현재 역할의 성과·관계·업무 범위를 점검해 다음 선택 기준을 남기세요.' };
}

function combinedAction(month, { isJob, isNegotiation, isRisk, isCurrent }) {
  if (isJob && isRisk) return { phase: '조건부 이직 판단', detail: '외부 기회를 탐색하되 역할·보상·보고라인을 서면으로 확인한 뒤 결정하세요.' };
  if (isJob) return { phase: '외부 탐색·이직 검토', detail: '지원과 면접을 진행하고 제안 조건을 현재 역할의 개선 가능성과 비교하세요.' };
  if (isNegotiation) return { phase: '내부 협상', detail: '성과 근거와 원하는 조건을 문서로 정리해 역할·보상 대화를 진행하세요.' };
  if (isRisk) return { phase: '조건 점검', detail: '감정적인 결정보다 역할·조직·계약 조건을 먼저 확인하세요.' };
  return isCurrent ? currentAction(month) : { phase: '흐름 점검', detail: '현재 조건과 외부 기회를 비교해 다음 행동 기준을 점검하세요.' };
}

function buildDecisionGuide({ isFlat, hasJobPeak, hasNegotiationPeak, riskSharesJobMonth, bestJob, bestNegotiation, current, personalization }) {
  const { characterProfile, elementProfile } = personalization;
  const currentMonth = formatMonth(current.year_month);
  const jobMonth = formatMonth(bestJob.year_month);
  const negotiationMonth = formatMonth(bestNegotiation.year_month);
  const mustHaves = uniqueBy([
    characterProfile.must,
    elementProfile.must,
    '보상 또는 성장성 중 하나가 현재보다 분명하게 개선될 것',
  ], item => item).slice(0, 3);
  const checks = uniqueBy([
    { text: characterProfile.check, reason: characterProfile.checkReason },
    { text: elementProfile.check, reason: elementProfile.reason },
    { text: '입사 후 6개월의 기대성과는 무엇인가?' },
    { text: '기존 담당자가 있었다면 왜 자리가 비었는가?' },
    { text: '평가와 인센티브 조건은 서면으로 확인 가능한가?' },
  ], item => item.text).slice(0, 5);

  const patternRedFlag = riskSharesJobMonth
    ? { text: '빠른 합류를 요구하면서 역할·계약 조건 확인은 미룸', reason: '기회와 리스크가 겹치는 달에는 검토 속도와 서명 속도를 분리해야 합니다.' }
    : { text: '면접관마다 역할과 성공 기준 설명이 다름', reason: '월별 기회를 활용해도 역할 기준이 엇갈리면 입사 뒤 변동 비용이 커집니다.' };
  const redFlags = uniqueBy([
    patternRedFlag,
    { text: characterProfile.redFlag, reason: characterProfile.redReason },
    { text: elementProfile.redFlag, reason: elementProfile.reason },
  ], item => item.text).slice(0, 3);

  let ifThen;
  if (isFlat) {
    ifThen = [
      { if: '외부 제안이 생긴다', then: '비교는 하되 이번 6개월 안에 이동해야 한다고 보지 말고 Must Have를 모두 충족할 때만 다음 단계로 가세요.' },
      { if: '기준을 충족하는 제안이 없다', then: '현 직장의 역할·보상 개선 가능성을 확인하고 다음 사이클의 비교 기준을 남기세요.' },
    ];
  } else if (hasNegotiationPeak && !hasJobPeak) {
    ifThen = [
      { if: `${negotiationMonth} 내부 협상에서 역할·보상 개선안이 문서로 나온다`, then: '즉시 이동하기보다 합의한 조건의 실행 일정을 먼저 확인하세요.' },
      { if: '협상 결과가 구두 약속에 그친다', then: '외부 제안을 비교하되 특정 달을 이직 적기로 단정하지 말고 Must Have 충족 여부로 판단하세요.' },
    ];
  } else {
    ifThen = [
      { if: hasNegotiationPeak ? `${negotiationMonth} 내부 협상 결과가 만족스럽다` : '현 직장에서 역할·보상 개선안이 문서로 확인된다', then: `${jobMonth} 외부 제안은 즉시 이동하기보다 현재 조건과 비교하는 기준으로 활용하세요.` },
      { if: `${jobMonth}에 더 좋은 외부 제안이 들어온다`, then: riskSharesJobMonth ? '역할·보고라인·6개월 기대성과가 서면으로 확인될 때만 최종 결정을 검토하세요.' : '보상과 함께 역할 범위·보고라인·6개월 기대성과를 확인한 뒤 결정하세요.' },
      { if: '보상은 높지만 역할과 조직 구조가 불명확하다', then: '수락을 미루고 R&R·보고라인·평가 기준을 먼저 확인하세요.' },
    ];
  }

  const secondAction = hasJobPeak
    ? `${jobMonth} 제안은 Must Have와 Red Flag를 한 표에서 비교하기`
    : hasNegotiationPeak
      ? `${negotiationMonth} 협상 전에 성과 근거와 원하는 조건을 문서로 준비하기`
      : '외부 제안이 오면 역할·조직·성장 기준을 현재 조건과 비교하기';
  return {
    must_haves: mustHaves,
    checks,
    red_flags: redFlags,
    if_then: ifThen,
    now_actions: [
      `${currentMonth}에 ${currentAction(current).detail.replace(/하세요\.$/, '하기')}`,
      secondAction,
      characterProfile.preparation,
    ],
    caution: isFlat
      ? '뚜렷한 이동·협상 고점이 없는 6개월입니다. 제안이 와도 조급함 때문에 기준을 낮추지 마세요.'
      : riskSharesJobMonth
        ? '기회와 리스크가 같은 달에 겹칩니다. 검토를 시작하는 속도와 최종 서명하는 속도를 같게 두지 마세요.'
        : '변동 신호가 큰 달에는 감정적인 퇴사나 구두 약속만으로 결론 내리지 마세요.',
  };
}

/** 월별 점수에서 핵심 시기와 행동 순서를 만들고 개인화 맥락을 조건 우선순위에 반영한다. */
export function deriveReportDecision(timeline, context = {}) {
  if (!Array.isArray(timeline) || timeline.length === 0) throw new Error('월별 타임라인 없이 리포트 결론을 만들 수 없습니다.');

  const current = timeline[0];
  const bestJob = peakMonth(timeline, month => scoreOf(month, 'job_change'));
  const bestNegotiation = peakMonth(timeline, month => scoreOf(month, 'negotiation'));
  const highestRisk = peakMonth(timeline, riskOf);
  const hasJobPeak = hasDistinctPeak(timeline, month => scoreOf(month, 'job_change'));
  const hasNegotiationPeak = hasDistinctPeak(timeline, month => scoreOf(month, 'negotiation'));
  const isFlat = !hasJobPeak && !hasNegotiationPeak;
  const hasRisk = riskOf(highestRisk) > 0;
  const riskSharesJobMonth = hasJobPeak && hasRisk && highestRisk.year_month === bestJob.year_month;
  const personalization = resolvePersonalization(context);

  const markedMonths = new Map();
  const addMonth = (month, key) => {
    const existing = markedMonths.get(month.year_month) ?? { month, isJob: false, isNegotiation: false, isRisk: false, isCurrent: month === current };
    if (key === 'job') existing.isJob = true;
    if (key === 'negotiation') existing.isNegotiation = true;
    if (key === 'risk') existing.isRisk = true;
    markedMonths.set(month.year_month, existing);
  };
  addMonth(current, 'current');
  if (hasJobPeak) addMonth(bestJob, 'job');
  if (hasNegotiationPeak) addMonth(bestNegotiation, 'negotiation');
  if (hasRisk) addMonth(highestRisk, 'risk');

  const steps = [...markedMonths.values()]
    .sort((a, b) => a.month.year_month.localeCompare(b.month.year_month))
    .map(item => ({ year_month: item.month.year_month, ...combinedAction(item.month, item) }));
  const strategy = isFlat ? '기준 정리 → 선택지 비교 → 다음 기회 준비' : steps.map(step => step.phase).join(' → ');
  const decisionGuide = buildDecisionGuide({ isFlat, hasJobPeak, hasNegotiationPeak, riskSharesJobMonth, bestJob, bestNegotiation, current, personalization });
  const jobPeakStats = summarizePeak(timeline, month => scoreOf(month, 'job_change'));
  const negotiationPeakStats = summarizePeak(timeline, month => scoreOf(month, 'negotiation'));

  return {
    report_summary: {
      headline: isFlat
        ? '앞으로 6개월은 특정 달에 승부를 걸기보다 현재 조건을 정리하고 다음 기회를 준비하는 흐름입니다.'
        : `앞으로 6개월은 ${strategy} 순서로 움직이는 흐름입니다.`,
      one_line_action: decisionGuide.now_actions[0],
    },
    timing_highlights: {
      best_job_change: hasJobPeak ? {
        kind: 'peak', year_month: bestJob.year_month, score: scoreOf(bestJob, 'job_change'), title: '가장 좋은 이직 시기', reason: '월별 흐름 중 외부 이동 점수가 분포 기준상 뚜렷하게 높은 달입니다.',
      } : {
        kind: 'flat', year_month: null, score: null, title: '뚜렷한 이동 고점이 없는 6개월', reason: '최고점의 절대 수준과 평균·차순위 대비 차이가 작아 특정 달을 이직 적기로 정하지 않습니다.',
      },
      best_negotiation: hasNegotiationPeak ? {
        kind: 'peak', year_month: bestNegotiation.year_month, score: scoreOf(bestNegotiation, 'negotiation'), title: '가장 좋은 협상 시기', reason: '월별 흐름 중 협상 점수가 분포 기준상 뚜렷하게 높은 달입니다.',
      } : null,
      caution_month: hasRisk ? {
        year_month: highestRisk.year_month, title: '가장 조심해야 하는 시기', reason: '월별 흐름 중 변동 리스크 신호가 가장 높은 달입니다.',
      } : null,
    },
    strategy,
    steps,
    is_flat: isFlat,
    has_distinct_job_peak: hasJobPeak,
    has_distinct_negotiation_peak: hasNegotiationPeak,
    peak_profile: { job_change: jobPeakStats, negotiation: negotiationPeakStats, baseline: DISTINCT_PEAK_BASELINE },
    personalization: {
      character_id: personalization.characterId,
      character_mode: personalization.characterProfile.id,
      dominant_element: personalization.dominantElement,
    },
    recommendation: isFlat ? '외부 제안이 생기면 비교는 하되, 이번 사이클에서 반드시 이동해야 할 필요는 없습니다.' : `추천 전략: ${strategy}.`,
    decision_guide: decisionGuide,
    watch_out: [decisionGuide.caution],
  };
}
