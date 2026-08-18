// 목업 4번 화면 — 수호신 발표.
// 무료 구간의 핵심이다. 숫자를 보여주지 않고 "나 같다"는 감각과 근거 한 문단만 준다.
import { useAppActions, useAppReport } from '../../contexts/AppContext';
import { buildGuardianReason } from '../../utils/guardianConcern';
import { getGuardianCharacter } from '../../utils/guardianCharacters';
import { ChemistryBlock } from '../guardian/ChemistryBlock';
import { GuardianImage } from '../guardian/GuardianImage';

export function GuardianResultScreen() {
  const { guardian, isShareLoading } = useAppReport();
  const { setStep, handleGuardianShare, trackMatchSectionView } = useAppActions();

  if (!guardian) return null;
  const reason = buildGuardianReason(getGuardianCharacter(guardian.id), guardian.nickname);

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

      <ChemistryBlock
        guardian={guardian}
        isSharing={isShareLoading}
        onShare={handleGuardianShare}
        onView={trackMatchSectionView}
      />

      <button className="jg-btn jg-btn-guardian" type="button" onClick={() => setStep('concern')}>
        {guardian.nickname}에게 고민 물어보기 →
      </button>
      <p className="jg-result-options">직업운 · 이직운 · 잘 맞는 일</p>
    </section>
  );
}
