import type { CareerScores } from './reportViewModel.ts';

export interface ElementsCount {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

type ElementKey = keyof ElementsCount;

export const ELEMENT_INFO: Record<ElementKey, { name: string; office: string; strong: string; weak: string; env: string }> = {
  wood: {
    name: '목(나무)',
    office: '추진력·시작',
    strong: '새 일을 벌이고 방향을 먼저 제시하는 추진력이 도드라집니다. 이직 과정에서도 먼저 움직여 판을 여는 쪽이 잘 맞습니다.',
    weak: '시작의 동력이 약해 마음을 먹고도 지원서 제출을 미루기 쉽습니다. 마감일을 스스로 정해 첫 발을 강제로 떼는 장치가 필요합니다.',
    env: '성장하는 조직, 체계를 만들어가야 하는 초기 단계의 프로젝트',
  },
  fire: {
    name: '화(불)',
    office: '표현·소통',
    strong: '자신을 드러내고 사람을 설득하는 힘이 강해 면접과 프레젠테이션에서 실제 실력보다 좋은 인상을 남깁니다.',
    weak: '성과를 밖으로 알리는 힘이 약해 일한 만큼 존재감을 인정받지 못하기 쉽습니다. 성과 공유와 자기 PR을 의식적으로 늘려야 합니다.',
    env: '발표, 미팅, 외부 협업 등 사람과 에너지를 주고받는 자리',
  },
  earth: {
    name: '토(흙)',
    office: '끈기·안정',
    strong: '맡은 자리를 지키는 안정감과 신뢰가 강점입니다. 조직에서 오래 신뢰를 쌓아 협상 때 평판이 무기가 됩니다.',
    weak: '진득하게 눌러앉는 힘이 약해 환경이 흔들리면 마음도 같이 흔들리기 쉽습니다. 결정 전에 냉각 기간을 두는 습관이 도움이 됩니다.',
    env: '갈등을 중재하고 일정을 지켜내야 하는 장기 프로젝트',
  },
  metal: {
    name: '금(쇠)',
    office: '결단·실행',
    strong: '한 번 결단하면 단호하게 끝까지 밀어붙이는 실행력이 뛰어납니다. 협상에서도 기준선을 지키는 힘이 됩니다.',
    weak: '맺고 끊는 결단이 약해 제안을 앞에 두고 오래 망설이기 쉽습니다. 판단 기준을 미리 문서로 정해두면 결정이 빨라집니다.',
    env: '품질과 마감이 중요하고, 명확한 기준과 권한이 있는 곳',
  },
  water: {
    name: '수(물)',
    office: '기획·전략',
    strong: '정보를 모아 판을 읽는 전략적 사고가 강해, 이직 시장의 흐름과 회사의 속사정을 읽어내는 눈이 좋습니다.',
    weak: '큰 그림을 그리는 여유가 부족해 눈앞의 조건만 보고 결정할 위험이 있습니다. 선택지를 표로 비교하는 과정을 꼭 거치세요.',
    env: '변화가 빠르고 맥락을 짚어 유연하게 대응해야 하는 환경',
  },
};

/**
 * 실제 오행 분포에서 가장 강하고 약한 오행을 골라 균형 해석을 생성한다.
 */
export function buildElementInsight(counts: ElementsCount): string {
  const entries = (Object.keys(ELEMENT_INFO) as ElementKey[]).map(key => ({ key, count: counts[key] }));
  const max = Math.max(...entries.map(e => e.count));
  const min = Math.min(...entries.map(e => e.count));

  if (max - min <= 1) {
    return '다섯 가지 기운이 고르게 퍼져 있는 균형형 사주입니다. 특정 능력에 치우치지 않아 어떤 조직에서든 무난히 적응하지만, 반대로 확실한 한 방이 안 보일 수 있으니 경력 스토리에서 대표 강점 하나를 의도적으로 앞세우는 전략이 필요합니다.';
  }

  const strongest = entries.find(e => e.count === max)!;
  const weakest = entries.find(e => e.count === min)!;
  const s = ELEMENT_INFO[strongest.key];
  const w = ELEMENT_INFO[weakest.key];

  return `${s.name} 기운이 ${strongest.count}개로 가장 강합니다. ${s.strong} 반면 ${w.office}을 맡는 ${w.name} 기운은 ${weakest.count === 0 ? '원국에 거의 드러나지 않습니다' : `${weakest.count}개로 약한 편입니다`}. ${w.weak}`;
}

const DAY_GAN_TITLE: Record<string, string> = {
  갑: '곧게 뻗는 개척자',
  을: '유연한 생존 전략가',
  병: '판을 밝히는 스포트라이터',
  정: '섬세한 불씨 설계자',
  무: '흔들리지 않는 산맥',
  기: '판을 고르는 조율가',
  경: '거침없는 돌파 장인',
  신: '날카로운 완벽주의 보석',
  임: '깊이를 아는 바다 전략가',
  계: '스며드는 지혜의 참모',
};

const AXIS_TAG: Record<keyof CareerScores, string> = {
  jobChange: '이직 순풍형 🚀',
  stay: '뿌리 성장형 🛡️',
  negotiation: '협상 지배형 💼',
};

/**
 * 일간 10종 × 최고 점수 축(이직/잔류/협상) 조합으로 공유용 캐릭터명을 만든다.
 * 예: "유연한 생존 전략가 · 협상 지배형 💼"
 */
export function buildCharacterName(dayGan: string, scores: CareerScores): string {
  const title = DAY_GAN_TITLE[dayGan] || '커리어 항해자';
  const topAxis = (Object.keys(AXIS_TAG) as Array<keyof CareerScores>)
    .reduce((a, b) => (scores[b] > scores[a] ? b : a), 'jobChange' as keyof CareerScores);
  return `${title} · ${AXIS_TAG[topAxis]}`;
}
