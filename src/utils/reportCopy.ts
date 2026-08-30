export const REPORT_HEADINGS = {
  verdict: '핵심 결론',
  strongestFlow: '현재 가장 강한 흐름',
  scoreComparison: '커리어 선택지 비교',
  scoreComparisonTitle: '이직·잔류·협상 점수',
  nextAction: '가장 먼저 할 일',
  evidence: '사주 해석의 기초 정보',
  chart: '사주 명식',
  intent: '커리어 목표와 현재 고민',
  decisionFactors: '이번 결정의 핵심 변수',
  situation: '현재 상황 진단',
  careerNature: '업무 성향과 강점',
  strengths: '강점이 발휘되는 방식',
  cautions: '주의가 필요한 업무 패턴',
  paths: '이직·잔류·협상 비교',
  environment: '나에게 맞는 조직 환경',
  actionPlan: '이번 주 실행 계획',
  actionDo: '이번 주 우선 과제',
  actionAvoid: '피할 행동',
  personalAnswer: '핵심 질문 분석',
  closing: '마무리 제언',
  roadmap: '향후 6개월 커리어 로드맵',
  elementProfile: '오행 기반 업무 성향 지표',
  elementBalance: '오행 균형 해석',
  followUp: '추가 질문 답변',
  shareCard: '공유용 커리어 카드',
} as const;

export const FOLLOW_UP_EXAMPLES = [
  '몇 월에 지원하는 게 좋을까요?',
  '연봉 협상은 언제 꺼내는 게 좋을까요?',
  '승진을 1년 더 기다려도 될까요?',
  '지금 받은 오퍼를 수락해도 될까요?',
] as const;

export const PAID_REPORT_WAIT_COPY = '리포트 작성에는 보통 3~5분 정도 걸려요';
export const PAID_REPORT_GENERATING_COPY = '수만 가지 경우의 수를 분석하여 리포트를 작성하고 있습니다...';
export const PAID_REPORT_POLL_INTERVAL_MS = 5_000;
export const PAID_REPORT_MAX_POLL_ATTEMPTS = 60;

export function buildCharacterTypeLabel(
  elementLabel: string,
  characterTitle: string,
  topAxisLabel: string,
): string {
  const role = characterTitle.trim().split(/\s+/).at(-1) || '본원';
  return `${elementLabel} ${role}형 · ${topAxisLabel} 우세`;
}
