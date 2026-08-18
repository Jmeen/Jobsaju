// 목업 3번 화면 — 수호신 소환.
// 연출은 목업의 3박자(주머니 흔들림 → 실루엣 → 깨어남)를 그대로 따르되,
// "내 수호신 만나기" 버튼은 연출이 끝나고 실제 계산까지 done이어야 열린다.
import { useEffect, useState } from 'react';
import { useAppActions, useAppReport } from '../../contexts/AppContext';
import { GuardianImage } from '../guardian/GuardianImage';

const REVEAL_AT_MS = 1100;
const READY_AT_MS = 2700;

type Phase = 'reading' | 'revealing' | 'ready';

const COPY: Record<Phase, { main: string[]; sub: string | null }> = {
  reading: { main: ['태어난 날의 기운을', '읽는 중…'], sub: '잠시만 기다려주세요' },
  revealing: { main: ['60마리 중 당신의 수호신을', '찾는 중…'], sub: '잠시만 기다려주세요' },
  ready: { main: ['당신의 수호신이', '깨어났어요!'], sub: null },
};

export function SummonScreen() {
  const { guardian, sajuResult } = useAppReport();
  const { setStep } = useAppActions();
  const [phase, setPhase] = useState<Phase>('reading');

  useEffect(() => {
    const toRevealing = window.setTimeout(() => setPhase('revealing'), REVEAL_AT_MS);
    const toReady = window.setTimeout(() => setPhase('ready'), READY_AT_MS);
    return () => {
      window.clearTimeout(toRevealing);
      window.clearTimeout(toReady);
    };
  }, []);

  // 연출이 끝나도 계산이 안 끝났으면 기다린다 — 빈 결과 화면으로 넘기지 않는다.
  const animationDone = phase === 'ready';
  const canMeet = animationDone && Boolean(sajuResult && guardian);
  const copy = COPY[canMeet ? 'ready' : phase === 'ready' ? 'revealing' : phase];

  return (
    <section className={`jg-screen jg-summon ${phase === 'reading' ? '' : 'is-revealing'} ${canMeet ? 'is-ready' : ''}`}>
      {guardian && (
        <GuardianImage className="jg-summon-guardian" guardian={guardian} alt="희미하게 나타나는 수호신" eager />
      )}
      <div className="jg-pouch" aria-hidden="true">🌱</div>

      <p className="jg-summon-copy" aria-live="polite">
        {copy.main.map((line, index) => (
          <span key={line}>{line}{index < copy.main.length - 1 && <br />}</span>
        ))}
      </p>
      {copy.sub && <p className="jg-summon-sub">{copy.sub}</p>}

      <button className="jg-btn" type="button" disabled={!canMeet} onClick={() => setStep('result')}>
        내 수호신 만나기
      </button>
    </section>
  );
}
