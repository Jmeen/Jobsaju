// 목업 1번 화면 — "60마리 중 내 수호신은 누구?"
// 결과를 보여주기 전에 60종 컬렉션의 존재를 먼저 각인시키는 자리다.
import { useEffect, useRef } from 'react';
import { useAppActions, useAppFlow, useAppReport } from '../../contexts/AppContext';
import { LANDING_MARQUEE_SEQUENCES, getGuardianAsset } from '../../utils/guardianAssets';
import { GuardianImage } from '../guardian/GuardianImage';

const MARQUEE_SPEED_PX_PER_FRAME = 1.25;

export function LandingScreen() {
  const { savedSession } = useAppFlow();
  const { shareInbound } = useAppReport();
  const { setStep, restoreSavedSession, setShowLookupModal } = useAppActions();
  const marqueeRef = useRef<HTMLDivElement>(null);

  // 목업의 좌우 무한 흐름. 같은 목록을 두 벌 이어 붙이고 절반을 넘으면 되감는다.
  useEffect(() => {
    const marquee = marqueeRef.current;
    if (!marquee) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let paused = false;
    const step = () => {
      if (!paused) {
        marquee.scrollLeft += MARQUEE_SPEED_PX_PER_FRAME;
        if (marquee.scrollLeft >= marquee.scrollWidth / 2) marquee.scrollLeft -= marquee.scrollWidth / 2;
      }
      frame = window.requestAnimationFrame(step);
    };
    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    marquee.addEventListener('pointerenter', pause);
    marquee.addEventListener('pointerleave', resume);
    marquee.addEventListener('pointerdown', pause);
    marquee.addEventListener('pointerup', resume);
    frame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frame);
      marquee.removeEventListener('pointerenter', pause);
      marquee.removeEventListener('pointerleave', resume);
      marquee.removeEventListener('pointerdown', pause);
      marquee.removeEventListener('pointerup', resume);
    };
  }, []);

  const marqueeGuardians = LANDING_MARQUEE_SEQUENCES.map(getGuardianAsset);
  const leftSample = getGuardianAsset('甲子');   // 저지르쥐
  const rightSample = getGuardianAsset('乙卯');  // 예민보스토끼

  return (
    <section className="jg-screen jg-landing">
      {shareInbound && (() => {
        // 보낸 사람의 수호신 문맥. 잘못된 id는 여기까지 오지 않는다(파싱에서 걸러진다).
        const sender = getGuardianAsset(shareInbound.fromGuardianId);
        return (
          <div className="jg-inbound">
            <GuardianImage guardian={sender} eager />
            <p>
              <strong>{sender.nickname}</strong>가<br />당신의 수호신을 궁금해해요.
            </p>
            <small>당신은 어떤 수호신일까요?</small>
          </div>
        );
      })()}

      <p className="jg-landing-pre">직장인마다 하나씩 있다는</p>
      <h1>60마리 중<br />내 수호신은 누구?</h1>
      <p className="jg-landing-lead">태어난 날의 기운으로 만나는<br />나랑 꼭 닮은 직장생활 수호신</p>

      <div className="jg-guardian-cluster">
        <div className="jg-guardian-sample">
          <GuardianImage guardian={leftSample} eager />
          <span>{leftSample.nickname}</span>
        </div>
        <div className="jg-guardian-sample">
          <div className="jg-mystery" aria-hidden="true">?</div>
          <span>내 수호신은?</span>
        </div>
        <div className="jg-guardian-sample">
          <GuardianImage guardian={rightSample} eager />
          <span>{rightSample.nickname}</span>
        </div>
      </div>

      <div className="jg-marquee" ref={marqueeRef} aria-label="대표 커리어 수호신 20종">
        <div className="jg-marquee-track">
          {[...marqueeGuardians, ...marqueeGuardians].map((guardian, index) => (
            <span className="jg-marquee-chip" key={`${guardian.id}-${index}`}>
              <GuardianImage guardian={guardian} />
              <span>{guardian.nickname}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="jg-landing-cta">
        <button className="jg-btn" type="button" onClick={() => setStep('birth')}>
          내 수호신 뽑아보기
        </button>
        <p className="jg-landing-note">생년월일로 정해져요 · 10초 · 무료</p>

        {savedSession && (
          <button className="jg-text-link" type="button" onClick={restoreSavedSession}>
            지난 수호신 다시 보기
          </button>
        )}
        <button className="jg-text-link" type="button" onClick={() => setShowLookupModal(true)}>
          이메일로 내 리포트 찾기
        </button>
      </div>
    </section>
  );
}
