// 추가 질문의 길이·정책 검증만 담는 가벼운 모듈.
//
// 답변 생성(buildLocalFollowUpAnswer)은 사주 엔진(만세력)을 끌고 오는데,
// 입력창은 글자수 제한과 검증만 있으면 된다. 한 모듈에 같이 두면 결과 화면이
// 상수 하나 때문에 엔진 전체를 초기 번들로 끌어온다.
import {
  assessFollowUpQuestion,
  buildRefusalMessage,
} from '../../workers/followUpPolicy.js';

export const FOLLOW_UP_MAX_LENGTH = 300;

export interface FollowUpRecord {
  question: string;
  answer: string;
  answeredAt: string;
}

export interface FollowUpContext {
  current_job?: string;
  career_goal?: string;
}

export function validateFollowUpQuestion(question: string): string | null {
  const q = question.trim();
  if (q.length < 5) return '질문을 5자 이상 적어주세요.';
  if (q.length > FOLLOW_UP_MAX_LENGTH) return `질문은 ${FOLLOW_UP_MAX_LENGTH}자 이내로 적어주세요.`;
  const assessment = assessFollowUpQuestion(q);
  if (!assessment.allowed) return buildRefusalMessage(assessment);
  return null;
}
