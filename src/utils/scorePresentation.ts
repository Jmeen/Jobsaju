import type { CareerScores } from './reportViewModel.ts';

export type ScoreAxis = keyof CareerScores;
export type ScoreLevel = '높음' | '보통 이상' | '보통' | '낮음';
export type ScoreTone = 'elite' | 'high' | 'mid' | 'low';

const AXIS_ORDER: ScoreAxis[] = ['jobChange', 'stay', 'negotiation'];

const AXIS_LABEL: Record<ScoreAxis, string> = {
  jobChange: '이직운',
  stay: '잔류운',
  negotiation: '협상운',
};

export const AXIS_ICON: Record<ScoreAxis, string> = {
  jobChange: '🚀',
  stay: '🛡️',
  negotiation: '💼',
};

const DETAIL: Record<ScoreAxis, Record<ScoreLevel, string>> = {
  jobChange: {
    높음: '이동을 검토할 힘이 강한 구간입니다. 퇴사부터 결정하기보다 목표 역할과 조건을 정해 시장 반응을 확인해 보세요.',
    '보통 이상': '이직 가능성을 탐색해 볼 만한 구간입니다. 기존 역할을 반복하기보다 다음 단계의 책임 범위를 분명히 정하는 편이 좋습니다.',
    보통: '이동과 준비의 균형이 필요한 구간입니다. 조건이 분명한 자리부터 선별해 확인해 보세요.',
    낮음: '지금은 이동 자체보다 준비의 완성도를 높이는 편이 유리합니다. 성과와 원하는 조건을 먼저 정리해 보세요.',
  },
  stay: {
    높음: '현재 조직에서 더 확보할 수 있는 역할·성과·보상이 있는지 구체적으로 확인해 볼 구간입니다.',
    '보통 이상': '잔류의 이점이 남아 있는 구간입니다. 기한과 조건이 분명한 경우에만 기다림을 선택하세요.',
    보통: '남는 것과 떠나는 것의 이득이 비슷합니다. 회사에 대한 감정보다 실제 조건을 기준으로 판단하세요.',
    낮음: '현재 자리에 머무를 이유가 충분한지 다시 확인할 구간입니다. 역할·보상·성장 조건을 구체적으로 점검하세요.',
  },
  negotiation: {
    높음: '연봉과 역할을 다시 논의해 볼 힘이 강한 구간입니다. 성과 자료와 시장 기준을 준비해 협상 가능성을 확인해 보세요.',
    '보통 이상': '조건을 조율해 볼 만한 구간입니다. 원하는 수준과 양보 가능한 범위를 문서로 정리해 두세요.',
    보통: '협상에서는 시기보다 근거의 완성도가 중요합니다. 시장 데이터와 성과 기록을 중심으로 접근하세요.',
    낮음: '요구를 서두르기보다 협상 근거를 먼저 쌓는 편이 좋습니다. 성과와 책임 범위를 눈에 보이게 정리하세요.',
  },
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getScoreLevel(score: number): ScoreLevel {
  const value = clampScore(score);
  if (value >= 70) return '높음';
  if (value >= 55) return '보통 이상';
  if (value >= 40) return '보통';
  return '낮음';
}

function toneForLevel(level: ScoreLevel): ScoreTone {
  if (level === '높음') return 'elite';
  if (level === '보통 이상') return 'high';
  if (level === '보통') return 'mid';
  return 'low';
}

export type ScoreView = {
  axis: ScoreAxis;
  axisLabel: string;
  score: number;
  level: ScoreLevel;
  tone: ScoreTone;
  headline: string;
  detail: string;
};

export function buildScoreView(axis: ScoreAxis, score: number): ScoreView {
  const normalizedScore = clampScore(score);
  const level = getScoreLevel(normalizedScore);
  const axisLabel = AXIS_LABEL[axis];
  return {
    axis,
    axisLabel,
    score: normalizedScore,
    level,
    tone: toneForLevel(level),
    headline: `${axisLabel} ${normalizedScore}점 · ${level}`,
    detail: DETAIL[axis][level],
  };
}

export function buildAllScoreViews(scores: CareerScores): ScoreView[] {
  return AXIS_ORDER.map(axis => buildScoreView(axis, scores[axis]));
}

export function buildTopScore(scores: CareerScores): ScoreView {
  return buildAllScoreViews(scores).reduce((best, current) => (
    current.score > best.score ? current : best
  ));
}
