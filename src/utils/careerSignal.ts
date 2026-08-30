// 무료 수호신 결과 화면 하단에 붙는 "무료 커리어 신호".
// 캐릭터로 진입한 사람을 커리어 판단으로 넘기는 다리다. 세부 점수·긴 분석은 여기서 주지 않는다 —
// 방향(이직/잔류/협상 중 지금 무엇이 우선인지)과 한 문장 판단, 그리고 "왜·언제"라는 다음 질문만 남긴다.
// 근거·타이밍·행동은 전부 유료 리포트의 몫이다.
import type { CareerScores } from './sajuCore.ts';

/** 3축 중 지금 가장 힘이 실리는 축. 유료 전환 문구의 방향을 정한다. */
export type CareerAxis = 'jobChange' | 'negotiation' | 'stay';

/** ◎ = 지금 우선순위, ○ = 여지 있음, △ = 지금은 아님. 점수 크기가 아니라 순위로 정한다. */
export type SignalMark = '◎' | '○' | '△';

export type CareerSignalItem = {
  axis: CareerAxis;
  label: string;
  icon: string;
  mark: SignalMark;
};

export type CareerSignalView = {
  /** 화면 노출 순서. 앱의 다른 곳(유료 전환 미리보기)과 같은 이직·협상·잔류 순서로 고정한다. */
  items: CareerSignalItem[];
  /** 지금 가장 힘이 실리는 축. */
  topAxis: CareerAxis;
  /** 방향을 알려주는 한 문장. "그래서 지금 뭐가 유리한데?"까지만 답한다. */
  sentence: string;
  /** 유료 전환으로 넘기는 다음 질문. "왜·언제"를 스스로 묻게 만든다. */
  bridge: string;
  /** 유료 전환 버튼 문구. */
  ctaLabel: string;
};

const AXIS_META: Record<CareerAxis, { label: string; icon: string }> = {
  jobChange: { label: '이직', icon: '🚪' },
  negotiation: { label: '협상', icon: '💰' },
  stay: { label: '잔류', icon: '🪑' },
};

// 화면 노출 순서. 유료 전환 화면의 3점수 미리보기와 같은 순서를 써서 사용자가 다시 배우지 않게 한다.
const DISPLAY_ORDER: CareerAxis[] = ['jobChange', 'negotiation', 'stay'];

// 동점일 때도 판단이 흔들리지 않도록 우선순위를 고정한다.
// 협상은 "지금 자리에서 조건을 바꾼다"라 마찰이 가장 작고, 잔류가 그다음, 이직이 가장 큰 결정이다.
const TIE_PRIORITY: CareerAxis[] = ['negotiation', 'stay', 'jobChange'];

const SENTENCE: Record<CareerAxis, string> = {
  negotiation: '지금은 바로 움직이기보다, 현재 자리에서 조건을 먼저 끌어올리는 흐름이 강해요.',
  jobChange: '지금은 안에서 버티기보다, 밖의 기회를 함께 열어두는 흐름이 강해요.',
  stay: '지금은 무리해서 움직이기보다, 지금 자리에서 실력을 다지며 때를 고르는 흐름이 강해요.',
};

const BRIDGE: Record<CareerAxis, string> = {
  negotiation: '그런데 왜 협상이 더 유리할까요? 언제 움직이면 흐름이 바뀔까요?',
  jobChange: '그런데 왜 지금 이직 흐름이 열릴까요? 언제 움직이는 게 좋을까요?',
  stay: '그런데 왜 지금은 잔류가 유리할까요? 언제부터 움직이면 좋을까요?',
};

/**
 * 3축 점수를 방향 신호로 바꾼다. 점수 자체는 노출하지 않는다 — 순위만 ◎/○/△로 남긴다.
 * 순위가 같은(동점) 경우 TIE_PRIORITY로 결정론적으로 가른다.
 */
export function rankCareerAxes(scores: CareerScores): CareerAxis[] {
  return [...DISPLAY_ORDER].sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return TIE_PRIORITY.indexOf(a) - TIE_PRIORITY.indexOf(b);
  });
}

/** 무료 결과와 유료 리포트가 같은 출발 결론을 쓰도록 공유하는 축 판정 함수. */
export function resolveCareerAxis(scores: CareerScores): CareerAxis {
  return rankCareerAxes(scores)[0];
}

export function buildCareerSignal(scores: CareerScores): CareerSignalView {
  const ranked = rankCareerAxes(scores);

  const MARKS: SignalMark[] = ['◎', '○', '△'];
  const markByAxis = new Map<CareerAxis, SignalMark>();
  ranked.forEach((axis, index) => markByAxis.set(axis, MARKS[index]));

  const topAxis = ranked[0];
  const items: CareerSignalItem[] = DISPLAY_ORDER.map(axis => ({
    axis,
    label: AXIS_META[axis].label,
    icon: AXIS_META[axis].icon,
    mark: markByAxis.get(axis) as SignalMark,
  }));

  return {
    items,
    topAxis,
    sentence: SENTENCE[topAxis],
    bridge: BRIDGE[topAxis],
    ctaLabel: '내 6개월 커리어 흐름 보기 →',
  };
}
