import type { ShareResult } from './kakaoShare';

type CareerScores = {
  jobChange: number;
  stay: number;
  negotiation: number;
};

export function buildShareHook(scores: CareerScores): string {
  const dominant = [
    { score: scores.stay, label: '잔류형' },
    { score: scores.jobChange, label: '이직 준비형' },
    { score: scores.negotiation, label: '협상형' },
  ].sort((a, b) => b.score - a.score)[0];

  return `나는 ${dominant.label} 나왔어.\n너는 어떤 이직 타입일까?`;
}

export function earnsBonusQuestion(result: ShareResult): boolean {
  return result === 'kakao' || result === 'link' || result === 'file';
}
