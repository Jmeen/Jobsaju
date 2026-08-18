// 목업 5번 화면 — 고민 선택.
// 사용자가 관심사를 직접 골라 선언하게 만들어, 다음 유료 화면의 이유를 스스로 갖게 한다.
import { useAppActions, useAppReport } from '../../contexts/AppContext';
import { GUARDIAN_CONCERN_OPTIONS, buildGuardianConcernView } from '../../utils/guardianConcern';
import { getGuardianCharacter } from '../../utils/guardianCharacters';
import { GuardianImage } from '../guardian/GuardianImage';

export function ConcernScreen() {
  const { guardian, guardianConcern, sajuResult } = useAppReport();
  const { setStep, setGuardianConcern } = useAppActions();

  if (!guardian || !sajuResult) return null;

  return (
    <section className="jg-screen">
      <div className="jg-question-guide">
        <GuardianImage guardian={guardian} eager />
        <div className="jg-kicker">{guardian.nickname}에게 물어보기</div>
      </div>

      <h1 className="jg-title">요즘 뭐가<br />제일 궁금해요?</h1>
      <p className="jg-sub">
        하나만 골라주세요.<br />
        {guardian.nickname}가 지금 어떤 방향이 좋은지 살짝 알려드릴게요.
      </p>

      <div className="jg-questions">
        {GUARDIAN_CONCERN_OPTIONS.map(option => {
          const isOpen = guardianConcern === option.type;
          const answer = isOpen
            ? buildGuardianConcernView(option.type, getGuardianCharacter(guardian.id), sajuResult.scores)
            : null;

          return (
            <div className={`jg-question-item ${isOpen ? 'is-open' : ''}`} key={option.type}>
              <button
                className={`jg-question ${isOpen ? 'is-selected' : ''}`}
                type="button"
                aria-expanded={isOpen}
                onClick={() => setGuardianConcern(option.type)}
              >
                <span className="jg-qicon" aria-hidden="true">{option.icon}</span>
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
              </button>

              {answer && (
                <div className="jg-answer">
                  <strong>{answer.verdict}</strong>
                  {answer.body.map(sentence => <p key={sentence}>{sentence}</p>)}
                  <button className="jg-answer-cta" type="button" onClick={() => setStep('paywall')}>
                    {answer.ctaLabel}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="jg-text-link" type="button" onClick={() => setStep('result')}>
        내 수호신 다시 보기
      </button>
    </section>
  );
}
