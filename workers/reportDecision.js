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

export function classifyScorePattern(timeline, valueOf) {
  const values = timeline.map(valueOf).map(Number);
  if (values.length < 2) return { type: 'flat', values, range: 0, direction_changes: 0 };
  const deltas = values.slice(1).map((value, index) => value - values[index]);
  const meaningful = deltas.filter(delta => Math.abs(delta) >= 5);
  const signs = meaningful.map(delta => Math.sign(delta));
  const directionChanges = signs.slice(1).reduce((count, sign, index) => count + (sign !== signs[index] ? 1 : 0), 0);
  const range = Math.max(...values) - Math.min(...values);
  const net = values.at(-1) - values[0];

  if (range <= 10 || meaningful.length <= 1) return { type: 'flat', values, range, direction_changes: directionChanges };
  if (directionChanges >= 2 && range >= 20) return { type: 'wave', values, range, direction_changes: directionChanges };
  if (net >= 15 && meaningful.filter(delta => delta > 0).length >= meaningful.filter(delta => delta < 0).length + 2) {
    return { type: 'rising', values, range, direction_changes: directionChanges };
  }
  if (net <= -15 && meaningful.filter(delta => delta < 0).length >= meaningful.filter(delta => delta > 0).length + 2) {
    return { type: 'falling', values, range, direction_changes: directionChanges };
  }
  return { type: 'mixed', values, range, direction_changes: directionChanges };
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

function formatShortMonth(yearMonth) {
  const [, month] = String(yearMonth || '').split('-');
  return month ? `${Number(month)}월` : String(yearMonth || '');
}

function formatMonthSpan(start, end) {
  if (!start || !end || start.year_month === end.year_month) return formatShortMonth(start?.year_month || end?.year_month);
  return `${Number(String(start.year_month).split('-')[1])}~${Number(String(end.year_month).split('-')[1])}월`;
}

function actionWindowLabel(current, next, generatedAt) {
  const regularLabel = formatMonth(current.year_month);
  if (!generatedAt) return regularLabel;
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) return regularLabel;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  if (parts.day < lastDay - 6 || !next) return regularLabel;
  return `${formatShortMonth(current.year_month)} 말부터 ${formatShortMonth(next.year_month)} 초까지`;
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
    redFlag: '최종 승인 전마다 책임 범위가 달라지고 결정권자 설명도 계속 바뀜',
    redReason: '주도적으로 움직일수록 권한 없는 책임을 혼자 떠안을 가능성이 커집니다.',
    preparation: '맡고 싶은 결정과 맡지 않을 책임의 경계를 한 장에 적기',
  },
  {
    id: 'precision', keywords: ['전문성', '정교함', '정확성', '완성', '기준', '마감', '집중력'],
    must: '성과와 품질을 판단하는 기준이 구체적으로 합의될 것',
    check: '좋은 결과물의 기준과 검토 책임자는 누구인가?',
    checkReason: '완성도를 높이는 강점은 평가 기준이 선명할 때 성과로 인정받기 쉽습니다.',
    redFlag: '면접관마다 좋은 결과물과 첫 6개월 성공 기준을 다르게 설명함',
    redReason: '기준이 엇갈리면 강점인 정교함이 끝없는 수정 업무로 바뀔 수 있습니다.',
    preparation: '대표 성과 한 건의 문제·판단 기준·결과를 세 문장으로 정리하기',
  },
  {
    id: 'relationship', keywords: ['관계감각', '공감', '관계조율', '돌봄', '포용', '수용'],
    must: '협업 조정 역할이 공식 책임과 평가에 반영될 것',
    check: '갈등이나 우선순위 충돌은 어떤 절차로 조정하는가?',
    checkReason: '관계를 연결하는 강점이 비공식 감정노동으로만 소비되지 않는지 확인해야 합니다.',
    redFlag: '면접 내내 갈등 수습 사례만 요구하면서 공식 역할과 평가 방식은 설명하지 못함',
    redReason: '관계 감각이 좋을수록 조직의 빈틈을 무급 책임처럼 떠안을 수 있습니다.',
    preparation: '협업으로 해결한 갈등 한 건과 본인의 기여를 사실 중심으로 정리하기',
  },
  {
    id: 'stability', keywords: ['안정감', '책임', '지속력', '축적', '정리', '실용성'],
    must: '인력·예산·인수인계가 책임 범위에 맞게 제공될 것',
    check: '현재 팀의 인력 공백과 인수인계 계획은 어떻게 되는가?',
    checkReason: '끝까지 책임지는 강점이 구조 없는 조직의 뒷수습으로 바뀌지 않아야 합니다.',
    redFlag: '인수인계 담당자와 인력 계획을 밝히지 않은 채 즉시 정상화부터 요구함',
    redReason: '책임감이 강할수록 준비되지 않은 운영 부담을 오래 떠안을 가능성이 있습니다.',
    preparation: '지속해서 맡을 일과 추가 자원이 필요한 일을 구분해 적기',
  },
];

const ELEMENT_PROFILES = {
  wood: { must: '다음 역할로 성장할 경로가 구체적으로 보일 것', redFlag: '성장 기회라는 말만 반복하고 6개월 뒤 맡게 될 업무 예시는 끝내 제시하지 않음' },
  fire: { must: '성과가 조직 안에서 보이고 피드백받는 구조가 있을 것', redFlag: '대외 노출을 강조하지만 성과를 검토할 사람과 주기를 면접마다 다르게 말함' },
  earth: { must: '책임 증가에 맞는 인력과 운영 자원이 있을 것', redFlag: '합류를 재촉하면서 배정 인력·예산 질문에는 입사 뒤 정하겠다고 답함' },
  metal: { must: '평가 기준과 의사결정 권한이 문서로 분명할 것', redFlag: '결과 책임을 거듭 강조하면서 승인 절차 질문에는 면접관마다 다른 답을 함' },
  water: { must: '사업 방향과 보고 체계가 잦게 흔들리지 않을 것', redFlag: '최근 우선순위 변경 이유와 최종 결정자를 묻자 답변이 면접 단계마다 달라짐' },
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

function combinedAction(month, { isJob, isNegotiation, isRisk, isLast }) {
  if (isJob && isRisk) return { phase: '조건부 이직 판단', detail: '외부 기회를 탐색하되 역할·보상·보고라인을 서면으로 확인한 뒤 결정하세요.' };
  if (isJob) return { phase: '외부 탐색·이직 검토', detail: '지원과 면접을 진행하고 제안 조건을 현재 역할의 개선 가능성과 비교하세요.' };
  if (isNegotiation) return { phase: '내부 협상', detail: '성과 근거와 원하는 조건을 문서로 정리해 역할·보상 대화를 진행하세요.' };
  if (isRisk) return { phase: '조건 점검', detail: '감정적인 결정보다 역할·조직·계약 조건을 먼저 확인하세요.' };
  if (isLast && scoreOf(month, 'stay') >= 60 && scoreOf(month, 'negotiation') >= 50) {
    return { phase: '조건 재협상', detail: '잔류했다면 역할·보상·업무 범위를 다시 협상하고 다음 사이클 기준을 남기세요.' };
  }
  return currentAction(month);
}

function buildStrategyRoadmap({ timeline, steps, hasJobPeak, hasNegotiationPeak, riskSharesJobMonth, bestJob, bestNegotiation }) {
  const lastIndex = timeline.length - 1;
  const decisionMonth = hasJobPeak ? bestJob : hasNegotiationPeak ? bestNegotiation : timeline[Math.min(2, lastIndex)];
  const decisionIndex = Math.max(0, timeline.findIndex(month => month.year_month === decisionMonth.year_month));
  const preparationEnd = Math.max(0, decisionIndex - 1);
  const fallbackStart = Math.min(decisionIndex + 1, lastIndex);
  const fallbackEnd = Math.max(fallbackStart, lastIndex - 1);
  const decisionAction = hasJobPeak
    ? riskSharesJobMonth ? '외부 제안 판단' : '외부 제안 비교'
    : hasNegotiationPeak ? '내부 조건 협상' : '선택지 비교';

  return [
    { when: formatMonthSpan(timeline[0], timeline[preparationEnd]), action: '선택 기준 정비' },
    { when: formatShortMonth(decisionMonth.year_month), action: decisionAction },
    { when: formatMonthSpan(timeline[fallbackStart], timeline[fallbackEnd]), action: '기준 미충족 시 관망' },
    { when: formatShortMonth(timeline[lastIndex].year_month), action: steps[lastIndex].phase },
  ];
}

function buildDecisionGuide({ timeline, generatedAt, isFlat, hasJobPeak, hasNegotiationPeak, riskSharesJobMonth, bestJob, bestNegotiation, current, personalization }) {
  const { characterProfile, elementProfile } = personalization;
  const currentWindow = actionWindowLabel(current, timeline[1], generatedAt);
  const jobMonth = formatMonth(bestJob.year_month);
  const negotiationMonth = formatMonth(bestNegotiation.year_month);
  const mustHaves = uniqueBy([
    characterProfile.must,
    elementProfile.must,
    '보상 또는 성장성 중 하나가 현재보다 분명하게 개선될 것',
  ], item => item).slice(0, 3);
  const checks = uniqueBy([
    { text: '입사 후 첫 6개월에 가장 먼저 기대하는 결과는 무엇인가?', reason: characterProfile.checkReason },
    { text: '이 역할은 누구에게 직접 보고하고, 주요 의사결정은 어떤 회의에서 확정되는가?' },
    { text: '기존 담당자가 있었다면 왜 자리가 비었는가?' },
    { text: '평가와 인센티브 조건은 서면으로 확인 가능한가?' },
    { text: '합류 전 반드시 완료될 인수인계와 지원은 무엇인가?' },
  ], item => item.text).slice(0, 5);

  const patternRedFlag = riskSharesJobMonth
    ? { text: '빠른 합류를 요구하면서 계약 조건 확인 일정은 계속 미룸' }
    : { text: '면접관마다 역할과 첫 6개월 성공 기준 설명이 다름' };
  const redFlags = uniqueBy([
    patternRedFlag,
    { text: characterProfile.redFlag },
    { text: '채용이 진행될수록 보상·직급·근무 조건이 처음 설명보다 계속 축소됨' },
  ], item => item.text).slice(0, 3);

  let ifThen;
  if (isFlat) {
    ifThen = [
      { summary: '외부 제안이 생겼다면 → 기준 충족 시 검토', if: '외부 제안이 생긴다', then: '비교는 하되 이번 6개월 안에 이동해야 한다고 보지 말고 Must Have를 모두 충족할 때만 다음 단계로 가세요.' },
      { summary: '맞는 제안이 없다면 → 다음 사이클 준비', if: '기준을 충족하는 제안이 없다', then: '현 직장의 역할·보상 개선 가능성을 확인하고 다음 사이클의 비교 기준을 남기세요.' },
      { summary: '내부 조건을 바꿀 수 있다면 → 협상', if: '현 직장에서 조정 가능한 역할이나 보상 조건이 확인된다', then: '바로 이동하기보다 실행 일정과 책임자를 문서로 합의하세요.' },
    ];
  } else if (hasNegotiationPeak && !hasJobPeak) {
    ifThen = [
      { summary: '내부 조건이 좋아졌다면 → 실행 일정 확인', if: `${negotiationMonth} 내부 협상에서 역할·보상 개선안이 문서로 나온다`, then: '즉시 이동하기보다 합의한 조건의 실행 일정을 먼저 확인하세요.' },
      { summary: '구두 약속에 그쳤다면 → 외부 비교', if: '협상 결과가 구두 약속에 그친다', then: '외부 제안을 비교하되 특정 달을 이직 적기로 단정하지 말고 Must Have 충족 여부로 판단하세요.' },
      { summary: '외부 역할이 불명확하다면 → 보류', if: '외부 제안의 역할이나 보고 체계가 불명확하다', then: '수락을 미루고 첫 6개월 기대성과와 의사결정 구조를 서면으로 확인하세요.' },
    ];
  } else {
    ifThen = [
      { summary: '내부 조건이 좋아졌다면 → 비교', if: hasNegotiationPeak ? `${negotiationMonth} 내부 협상 결과가 만족스럽다` : '현 직장에서 역할·보상 개선안이 문서로 확인된다', then: `${jobMonth} 외부 제안은 즉시 이동하기보다 현재 조건과 비교하는 기준으로 활용하세요.` },
      { summary: '더 좋은 외부 제안이 왔다면 → 서면 검증', if: `${jobMonth}에 더 좋은 외부 제안이 들어온다`, then: riskSharesJobMonth ? '역할·보고라인·6개월 기대성과가 서면으로 확인될 때만 최종 결정을 검토하세요.' : '보상과 함께 역할 범위·보고라인·6개월 기대성과를 확인한 뒤 결정하세요.' },
      { summary: '보상만 높다면 → 보류', if: '보상은 높지만 역할과 조직 구조가 불명확하다', then: '수락을 미루고 R&R·보고라인·평가 기준을 먼저 확인하세요.' },
    ];
  }

  return {
    must_haves: mustHaves,
    checks: checks.slice(0, 4),
    red_flags: redFlags,
    if_then: ifThen.slice(0, 3),
    now_actions: [
      `${currentWindow} 현재 역할에서 유지할 것과 바꿀 것을 각각 3개씩 적기`,
      '오퍼 비교에 사용할 Must Have와 Red Flag 기준을 미리 한 장으로 만들기',
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
  const stayPattern = classifyScorePattern(timeline, month => scoreOf(month, 'stay'));

  const steps = timeline.map((month, index) => ({
    year_month: month.year_month,
    ...combinedAction(month, {
      isJob: hasJobPeak && month.year_month === bestJob.year_month,
      isNegotiation: hasNegotiationPeak && month.year_month === bestNegotiation.year_month,
      isRisk: hasRisk && month.year_month === highestRisk.year_month,
      isCurrent: month === current,
      isLast: index === timeline.length - 1,
    }),
  }));
  const strategy = steps.map(step => `${formatShortMonth(step.year_month)} ${step.phase}`).join(' → ');
  const strategyRoadmap = buildStrategyRoadmap({ timeline, steps, hasJobPeak, hasNegotiationPeak, riskSharesJobMonth, bestJob, bestNegotiation });
  const decisionGuide = buildDecisionGuide({ timeline, generatedAt: context.generatedAt, isFlat, hasJobPeak, hasNegotiationPeak, riskSharesJobMonth, bestJob, bestNegotiation, current, personalization });
  const jobPeakStats = summarizePeak(timeline, month => scoreOf(month, 'job_change'));
  const negotiationPeakStats = summarizePeak(timeline, month => scoreOf(month, 'negotiation'));

  const last = timeline.at(-1);
  const lastMonth = formatMonth(last.year_month);
  const lastScores = last.scores || {};
  const lastExit = Number(lastScores.stay) >= 60 && Number(lastScores.negotiation) >= 50
    ? `${lastMonth}에는 협상 여지와 내부 안정성이 다시 강해집니다.`
    : Number(lastScores.negotiation) >= Number(lastScores.job_change) && Number(lastScores.negotiation) >= Number(lastScores.stay)
      ? `${lastMonth}에는 역할·보상 조건을 다시 협상할 여지가 커집니다.`
      : Number(lastScores.stay) >= Number(lastScores.job_change)
        ? `${lastMonth}에는 내부 조건을 다시 점검하며 잔류 여부를 판단할 수 있습니다.`
        : `${lastMonth}에는 다음 외부 탐색으로 이어집니다.`;
  const jobMoment = hasJobPeak
    ? `${formatMonth(bestJob.year_month)}에 ${riskSharesJobMonth ? '외부 이동 기회와 변동 리스크가 함께 커집니다.' : '외부 이동 기회가 가장 강해집니다.'}`
    : '특정 달을 이직 적기로 단정할 만큼 뚜렷한 외부 이동 고점은 없습니다.';
  const patternLead = stayPattern.type === 'wave'
    ? '내부 안정성이 크게 출렁이는 가운데'
    : stayPattern.type === 'rising'
      ? '내부 안정성이 점차 회복되는 가운데'
      : stayPattern.type === 'falling'
        ? '내부 안정성이 점차 약해지는 가운데'
        : stayPattern.type === 'flat'
          ? '내부 안정성이 비교적 일정하게 이어지는 가운데'
          : '내부 안정성이 오르내리는 가운데';
  const headline = `${patternLead}, ${jobMoment} ${lastExit}`;

  return {
    report_summary: {
      headline,
      one_line_action: `${actionWindowLabel(current, timeline[1], context.generatedAt)} ${currentAction(current).detail}`,
    },
    timing_highlights: {
      best_job_change: hasJobPeak ? {
        kind: 'peak', year_month: bestJob.year_month, score: scoreOf(bestJob, 'job_change'), title: scoreOf(bestJob, 'job_change') >= 75 ? '가장 좋은 이직 시기' : '외부 이동 기회가 가장 강한 시기', reason: scoreOf(bestJob, 'job_change') >= 75 ? '절대 점수와 다른 달 대비 차이가 모두 뚜렷한 달입니다.' : '절대적으로 매우 높은 점수는 아니지만 이번 6개월 중 외부 이동 기회가 상대적으로 가장 강한 달입니다.',
      } : {
        kind: 'flat', year_month: null, score: null, title: '뚜렷한 이동 고점이 없는 6개월', reason: '최고점의 절대 수준과 평균·차순위 대비 차이가 작아 특정 달을 이직 적기로 정하지 않습니다.',
      },
      best_negotiation: hasNegotiationPeak ? {
        kind: 'peak', year_month: bestNegotiation.year_month, score: scoreOf(bestNegotiation, 'negotiation'), title: scoreOf(bestNegotiation, 'negotiation') >= 75 ? '가장 좋은 협상 시기' : '협상 여지가 상대적으로 강한 시기', reason: '이번 6개월의 협상 점수 중 상대적으로 힘이 가장 실리는 달입니다.',
      } : null,
      caution_month: hasRisk ? {
        year_month: highestRisk.year_month, title: '가장 조심해야 하는 시기', reason: '월별 흐름 중 변동 리스크 신호가 가장 높은 달입니다.',
      } : null,
    },
    strategy,
    strategy_roadmap: strategyRoadmap,
    steps,
    is_flat: isFlat,
    has_distinct_job_peak: hasJobPeak,
    has_distinct_negotiation_peak: hasNegotiationPeak,
    peak_profile: { job_change: jobPeakStats, negotiation: negotiationPeakStats, baseline: DISTINCT_PEAK_BASELINE },
    stay_pattern: stayPattern,
    personalization: {
      character_id: personalization.characterId,
      character_mode: personalization.characterProfile.id,
      dominant_element: personalization.dominantElement,
    },
    recommendation: isFlat ? `특정 달에 이동을 서두르기보다 ${strategy} 순서로 마지막 달까지 조건을 점검하세요.` : `추천 전략: ${strategy}.`,
    decision_guide: decisionGuide,
    watch_out: [decisionGuide.caution],
  };
}
