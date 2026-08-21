// 목업 4번 화면 — 수호신 발표 + 무료 커리어 신호.
// 무료 구간의 핵심이다. 두 가지를 준다: (1) "나 같다"는 캐릭터 감각, (2) 그 결과가 실제 커리어
// 판단으로 이어진다는 신호. 세부 점수·긴 분석은 여기서 주지 않는다 — 방향과 한 문장까지만.
// 화면 순서: 수호신 → 캐릭터 설명 → 같이 일하면 잘 맞는 유형 + 공유 → 무료 커리어 신호 → 유료 전환.
// 캐릭터에 충분히 애착을 가진 뒤 공유하게 만들고, 그다음에야 커리어 판단으로 넘긴다.
import { useAppActions, useAppReport } from '../../contexts/AppContext';
import { buildGuardianReason } from '../../utils/guardianConcern';
import { buildCareerSignal } from '../../utils/careerSignal';
import { getGuardianCharacter } from '../../utils/guardianCharacters';
import { ChemistryBlock } from '../guardian/ChemistryBlock';
import { GuardianImage } from '../guardian/GuardianImage';

export function GuardianResultScreen() {
  const { guardian, sajuResult, isShareLoading } = useAppReport();
  const { setStep, handleGuardianKakaoShare, handleGuardianLinkCopy, trackMatchSectionView } = useAppActions();

  if (!guardian || !sajuResult) return null;
  const reason = buildGuardianReason(getGuardianCharacter(guardian.id), guardian.nickname);
  const signal = buildCareerSignal(sajuResult.scores);

  return (
    <section className="jg-screen">
      <div className="jg-kicker" style={{ textAlign: 'center' }}>당신의 수호신이 도착했어요</div>
      <p className="jg-arrival">오늘부터 당신과 함께 출근할 친구예요</p>

      <GuardianImage className="jg-guardian" guardian={guardian} eager />

      <h1 className="jg-result-name">
        {guardian.nickname}
        <span className="jg-ganzhi">
          {guardian.ganzhiKo} {guardian.id} · {guardian.elementLabel} 기운의 수호신
        </span>
      </h1>

      <p className="jg-quote">“{guardian.copy}”</p>

      <div className="jg-result-why">
        <strong>{reason.headline}</strong>
        <p>{reason.body}</p>
        <em>{reason.closing}</em>
      </div>

      {/* 같이 일하면 잘 맞는 유형 + 공유 허브. 커리어 판단으로 넘기기 전에, 캐릭터에 애착이 붙은
          이 자리에서 먼저 친구를 떠올리게 한다. */}
      <ChemistryBlock
        guardian={guardian}
        isSharing={isShareLoading}
        onKakaoShare={handleGuardianKakaoShare}
        onCopyLink={handleGuardianLinkCopy}
        onView={trackMatchSectionView}
      />

      {/* 무료 커리어 신호 — 캐릭터가 커리어 판단으로 이어지는 다리.
          방향(◎○△)과 한 문장까지만. 근거·타이밍·행동은 유료 리포트로 넘긴다. */}
      <section className="jg-signal">
        <div className="jg-signal-head">
          <span className="jg-kicker" style={{ margin: 0 }}>지금의 커리어 신호</span>
          <small>{guardian.nickname}가 살펴본 지금의 흐름이에요</small>
        </div>

        <div className="jg-signal-marks">
          {signal.items.map(item => (
            <div className={`jg-signal-mark ${item.axis === signal.topAxis ? 'is-top' : ''}`} key={item.axis}>
              <span className="jg-signal-icon" aria-hidden="true">{item.icon}</span>
              <span className="jg-signal-label">{item.label}</span>
              <span className="jg-signal-badge" aria-label={`${item.label} 우선순위 ${item.mark}`}>{item.mark}</span>
            </div>
          ))}
        </div>

        <p className="jg-signal-sentence">{signal.sentence}</p>
        <p className="jg-signal-legend">◎ 지금 우선 · ○ 여지 있음 · △ 지금은 아님</p>

        <div className="jg-signal-bridge">
          <p>{signal.bridge}</p>
        </div>

        <button className="jg-btn" type="button" onClick={() => setStep('paywall')}>
          {signal.ctaLabel}
        </button>
        <p className="jg-result-options">왜 유리한지 · 언제 움직일지 · 어떻게 행동할지</p>
      </section>
    </section>
  );
}
