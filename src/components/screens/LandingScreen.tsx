// 목업 1번 화면 — "60마리 중 내 수호신은 누구?"
//
// 이 화면은 사주 설명 페이지가 아니라 캐릭터 발견 페이지다. 만들어야 하는 감정은
// "캐릭터가 계속 바뀌네 → 이름이 웃기네 → 나는 뭐가 나올까 → 해봐야지"까지다.
//
// 공유 유도는 여기에 두지 않는다. 아직 자기 캐릭터가 없는 사람에게 "친구에게 보내라"고 하면
// 무슨 말인지 와닿지 않고, 첫 화면의 유일한 액션이어야 할 CTA만 흐려진다.
// 공유는 자기 수호신을 확인한 뒤 결과 화면에서 핵심 행동으로 받는다.
import { useAppActions, useAppFlow, useAppReport } from '../../contexts/AppContext';
import { getGuardianAsset } from '../../utils/guardianAssets';
import { GuardianCarousel } from '../guardian/GuardianCarousel';
import { GuardianImage } from '../guardian/GuardianImage';

export function LandingScreen() {
  const { savedSession } = useAppFlow();
  const { shareInbound } = useAppReport();
  const { setStep, restoreSavedSession, setShowLookupModal } = useAppActions();

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

      <h1>60마리 중<br />내 수호신은 누구?</h1>
      <p className="jg-landing-sub">직장인마다 하나씩 있는, 내 일머리 수호신 찾기</p>

      <GuardianCarousel />

      <div className="jg-landing-cta">
        <button className="jg-btn" type="button" onClick={() => setStep('birth')}>
          내 수호신 뽑아보기
        </button>
        <p className="jg-landing-note">생년월일 입력 후 바로 확인 · 무료</p>
      </div>

      {/* 재방문자용 통로. 첫 방문자의 유일한 액션(CTA)을 흐리지 않도록 아래로 내리고 톤을 낮춘다. */}
      <div className="jg-landing-minor">
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
