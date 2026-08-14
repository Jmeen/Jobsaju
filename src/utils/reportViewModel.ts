export type CareerScores = {
  jobChange: number;
  stay: number;
  negotiation: number;
};

export type ScoreBar = {
  key: keyof CareerScores;
  label: string;
  value: number;
  width: number;
  tone: 'primary' | 'neutral' | 'secondary';
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

export function buildScoreBars(scores: CareerScores): ScoreBar[] {
  return [
    { key: 'jobChange', label: '이직', value: scores.jobChange, width: clampScore(scores.jobChange), tone: 'primary' },
    { key: 'stay', label: '잔류', value: scores.stay, width: clampScore(scores.stay), tone: 'neutral' },
    { key: 'negotiation', label: '협상', value: scores.negotiation, width: clampScore(scores.negotiation), tone: 'secondary' },
  ];
}

export type VerdictView = {
  title: string;
  subtitle: string;
  action: { title: string; desc: string };
  /** 1·2위가 붙어 단정하기 어려운 경우 */
  isClose: boolean;
};

/** 이 점수차 이내면 우열을 단정하지 않는다 */
const CLOSE_CALL_GAP = 6;

type AxisKey = keyof CareerScores;

const CLOSE_VERDICTS: Record<string, Omit<VerdictView, 'isClose'>> = {
  'jobChange+stay': {
    title: '떠날 이유와 남을 이유가 지금은 팽팽합니다.',
    subtitle: '회사가 문제인지 조건이 문제인지가 아직 갈리지 않은 상태입니다. 먼저 그것부터 구분해야 합니다.',
    action: {
      title: '바뀌면 남을 수 있는 조건 세 가지를 적어보세요.',
      desc: '그 세 가지가 앞으로 6개월 안에 달라질 가능성이 없다면, 그때 이동을 결정해도 늦지 않습니다.',
    },
  },
  'jobChange+negotiation': {
    title: '움직이는 힘과 조건을 바꾸는 힘이 함께 실려 있습니다.',
    subtitle: '둘 중 하나를 고르기보다, 순서를 정하는 편이 이득인 흐름입니다.',
    action: {
      title: '외부 오퍼를 먼저 확보하고, 그 카드로 협상하세요.',
      desc: '지원과 면접으로 시장 가격을 확인한 뒤에 협상 테이블에 앉으면 요구할 수 있는 폭이 달라집니다.',
    },
  },
  'stay+negotiation': {
    title: '옮기는 것보다, 지금 자리의 조건을 바꾸는 쪽에 힘이 있습니다.',
    subtitle: '이동 자체의 이득은 크지 않지만, 내부에서 역할과 보상을 다시 짜는 데는 유리합니다.',
    action: {
      title: '이직 준비보다 역할·보상 재조정을 먼저 요청하세요.',
      desc: '옮겨서 얻을 수 있는 것과 지금 요청해서 얻을 수 있는 것을 나란히 적어 비교해 보세요.',
    },
  },
};

export function buildVerdictView(scores: CareerScores): VerdictView {
  const ranked = (Object.keys(scores) as AxisKey[])
    .sort((a, b) => scores[b] - scores[a]);
  const gap = scores[ranked[0]] - scores[ranked[1]];

  if (gap <= CLOSE_CALL_GAP) {
    const pair = [ranked[0], ranked[1]].sort().join('+');
    const close = CLOSE_VERDICTS[pair];
    if (close) return { ...close, isClose: true };
  }

  if (scores.jobChange >= scores.stay && scores.jobChange >= scores.negotiation) {
    return {
      title: '지금은 퇴사보다, 조건을 확인하며 이직을 준비할 때입니다.',
      subtitle: '당장 회사를 나가기보다 선택지를 확보한 뒤 움직이는 편이 유리합니다.',
      action: {
        title: '퇴사 결정보다 이력서부터 업데이트하세요.',
        desc: '성과를 숫자로 정리하고, 원하는 연봉과 역할의 하한선을 먼저 적어두세요.',
      },
      isClose: false,
    };
  }

  if (scores.stay >= scores.negotiation) {
    return {
      title: '지금은 이동보다, 현재 자리에서 다음 조건을 만들 때입니다.',
      subtitle: '흐름상 무리하게 이동하기보다 현재 자리에서 실적과 평판을 쌓는 편이 더 유리합니다.',
      action: {
        title: '옮길 이유보다 남을 조건을 먼저 협상 카드로 만드세요.',
        desc: '6개월 안에 역할 확대·보상 조정 중 무엇이 가능한지 리더와 논의 일정을 잡아보세요.',
      },
      isClose: false,
    };
  }

  return {
    title: '지금은 결정보다, 원하는 조건을 먼저 협상할 때입니다.',
    subtitle: '떠나고 남는 것보다, 지금은 조건을 바꿔낼 힘이 가장 강하게 실려 있습니다.',
    action: {
      title: '연봉·역할 협상 자료부터 준비하세요.',
      desc: '최근 성과 3가지와 시장 연봉 데이터를 한 장으로 정리하면 협상의 주도권이 생깁니다.',
    },
    isClose: false,
  };
}

export function buildVerdict(scores: CareerScores): string {
  return buildVerdictView(scores).title;
}
