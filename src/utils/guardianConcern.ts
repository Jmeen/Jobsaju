// 결과 화면에서 고르는 3가지 고민 유형과, 유형별로 달라지는 무료 해설.
// guardian-flow 목업의 "새싹호랑이에게 고민 물어보기" 구간을 실제 데이터로 옮긴 것이다.
// 문구는 (수호신 캐릭터 × 3축 점수)만으로 정해지는 순수 함수라 테스트로 고정할 수 있다.
import type { GuardianCharacter } from './guardianCharacters.ts';
import type { CareerScores } from './sajuCore.ts';

export type GuardianConcernType = 'career_flow' | 'job_change' | 'work_fit';

export type GuardianConcernOption = {
  type: GuardianConcernType;
  icon: string;
  label: string;
  hint: string;
};

export type GuardianConcernView = {
  type: GuardianConcernType;
  label: string;
  /** 점수에서 나오는 한 줄 판정. 화살표는 방향 신호다. */
  verdict: string;
  /** 캐릭터 원문에서 가져온 본문 2문장. */
  body: string[];
  /** 유료 리포트로 넘기는 버튼 문구. */
  ctaLabel: string;
};

export const GUARDIAN_CONCERN_OPTIONS: readonly GuardianConcernOption[] = [
  { type: 'career_flow', icon: '🧭', label: '요즘 내 직업운', hint: '지금 커리어 흐름과 앞으로의 방향' },
  { type: 'job_change', icon: '🚪', label: '이직해도 될까?', hint: '움직일 시기와 조심할 점' },
  { type: 'work_fit', icon: '🌱', label: '나는 무슨 일이 맞을까?', hint: '잘 맞는 역할 · 회사 · 일하는 환경' },
];

const CTA_LABEL: Record<GuardianConcernType, string> = {
  career_flow: '직업운 흐름 · 6개월 타이밍 보기 →',
  job_change: '이직 점수 · 좋은 시기까지 보기 →',
  work_fit: '맞는 역할 · 회사 환경 자세히 보기 →',
};

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

// 캐릭터 원문은 세 문장 구조이고, 어떤 필드도 단독으로는 60종을 구분하지 못한다.
//   1·2번째 문장 = 천간(일간) 10종별로 동일
//   3번째 문장   = 지지(띠) 12종별로 동일
// 따라서 한쪽만 쓰면 최대 10종 또는 12종까지만 갈린다.
// 천간 문장과 지지 문장을 한 쌍으로 묶어야 비로소 10 × 12 = 60종이 모두 달라진다.
function frameSentence(text: string): string {
  return sentencesOf(text)[0] ?? text;
}

function distinctSentence(text: string): string {
  const sentences = sentencesOf(text);
  return sentences[sentences.length - 1] ?? text;
}

function verdictFor(type: GuardianConcernType, scores: CareerScores): string {
  if (type === 'career_flow') {
    const highest = Math.max(scores.jobChange, scores.negotiation, scores.stay);
    if (highest >= 60) return '새로운 흐름이 열리고 있어요 ↑';
    if (highest >= 50) return '조금씩 방향이 잡혀가고 있어요 →';
    return '지금은 힘을 모아둘 때예요 ↓';
  }

  if (type === 'job_change') {
    if (scores.jobChange >= 60) return '움직여볼 만해요 ↑';
    if (scores.jobChange >= 50) return '조건을 비교해볼 때예요 →';
    return '지금 당장은 서두르지 않아도 돼요 ↓';
  }

  // work_fit은 타이밍이 아니라 적성이라 점수의 방향 대신 강점이 드러나는 자리를 짚는다.
  return scores.negotiation >= scores.jobChange
    ? '내 가치를 드러내는 자리에서 힘이 나요 →'
    : '새 길을 만드는 일이 잘 맞아요 →';
}

function bodyFor(type: GuardianConcernType, character: GuardianCharacter): string[] {
  if (type === 'career_flow') {
    return [frameSentence(character.identity), distinctSentence(character.identity)];
  }
  if (type === 'job_change') {
    // 이직은 "가도 되나"와 "무엇을 조심하나"가 같이 필요하다.
    // 강점은 천간 문장, 주의점은 지지 문장으로 짝지어야 60종이 모두 갈린다
    // (둘 다 지지 문장을 쓰면 12종까지만 구분된다).
    return [frameSentence(character.strength), distinctSentence(character.blind_spot)];
  }
  return [frameSentence(character.best_environment), distinctSentence(character.best_environment)];
}

export function buildGuardianConcernView(
  type: GuardianConcernType,
  character: GuardianCharacter,
  scores: CareerScores,
): GuardianConcernView {
  const option = GUARDIAN_CONCERN_OPTIONS.find(candidate => candidate.type === type)
    ?? GUARDIAN_CONCERN_OPTIONS[0];
  return {
    type: option.type,
    label: option.label,
    verdict: verdictFor(option.type, scores),
    body: bodyFor(option.type, character),
    ctaLabel: CTA_LABEL[option.type],
  };
}

/** 수호신이 왜 이 캐릭터인지 설명하는 결과 화면 상단 블록. */
export function buildGuardianReason(
  character: GuardianCharacter,
  /** 화면에 노출되는 이름. 별명이 있으면 그것으로 불러야 제목과 어긋나지 않는다. */
  displayName: string = character.title,
): { headline: string; body: string; closing: string } {
  // core_type은 "🌿 유연하게 뻗는 덩굴"처럼 이모지가 앞에 붙어 있어 문장에 넣기 전에 떼어낸다.
  const coreType = character.core_type.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return {
    headline: `왜 ${displayName}일까요?`,
    body: [frameSentence(character.identity), distinctSentence(character.identity)].join(' '),
    // summary_og는 바로 위 인용구에서 이미 쓰므로 여기서 되풀이하지 않는다.
    closing: `그래서 당신의 수호신은, ${coreType} 같은 ${displayName}예요.`,
  };
}
