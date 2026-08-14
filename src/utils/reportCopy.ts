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

export function buildCharacterTypeLabel(
  elementLabel: string,
  characterTitle: string,
  topAxisLabel: string,
): string {
  const role = characterTitle.trim().split(/\s+/).at(-1) || '본원';
  return `${elementLabel} ${role}형 · ${topAxisLabel} 우세`;
}
