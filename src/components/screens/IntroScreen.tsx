
import { useAppFlow, useAppReport, useAppActions } from '../../contexts/AppContext';
import { CHECKOUT_COPY } from '../../utils/checkoutPresentation';

import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';

import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';




export function IntroScreen() {
  const {
    savedSession,
    copy,
    shareAttribution,
  } = useAppFlow();
  const {
    isUnlocked,
  } = useAppReport();
  const {
    setStep,
    setShowLookupModal,
    setLookupError,
    restoreSavedSession,
  } = useAppActions();

  return (
    <div className="intro-screen">
          <div className="intro-brand"><span>커리어 사주</span></div>
          {shareAttribution && (
            <div style={{ margin: '0 20px 16px', padding: '12px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#e5e7eb', lineHeight: 1.5 }}>
                친구의 캐릭터는 {shareAttribution.fromCharacterName || '멋진 캐릭터'}예요<br />
                당신의 캐릭터는 누구일까요?
              </p>
            </div>
          )}
          <div className="intro-content">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.headline.map((line: any, i: any) => (
              <span key={line}>{i > 0 && <br />}{line}</span>
            ))}</h1>
            <p>{copy.subcopy.map((line: any, i: any) => (
              <span key={line}>{i > 0 && <br />}{line}</span>
            ))}</p>
            <div className="intro-proof">
              {copy.proof.map((item: any) => (
                <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>
              ))}
            </div>
          </div>
          <div className="intro-cta">
            <button className="btn-primary" onClick={() => setStep('birth')}>{copy.cta} <span>→</span></button>
            {savedSession && (
              <button className="btn-secondary" style={{ width: '100%' }} onClick={restoreSavedSession}>
                지난 결과 다시 보기{savedSession.isUnlocked ? CHECKOUT_COPY.savedResultSuffix : ''}
              </button>
            )}
            <button 
              className="btn-secondary" 
              style={{ width: '100%', borderColor: 'var(--border-neon)' }} 
              onClick={() => { setShowLookupModal(true); setLookupError(null); }}
            >
              이메일로 내 리포트 찾기 🔍
            </button>
            <p>{copy.ctaNote}</p>
          </div>
        </div>
  );
}
