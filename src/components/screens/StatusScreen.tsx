
import { useAppFlow, useAppActions } from '../../contexts/AppContext';


import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';

import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';




export function StatusScreen() {
  const {
    careerContext,
  } = useAppFlow();
  const {
    setStep,
    setCareerContext,
  } = useAppActions();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>현재 커리어 상황은 어떤가요?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>현재 상황과 가장 가까운 항목을 선택해 주세요.</p>
          </div>

          <div className="option-grid" style={{ marginBottom: 30 }}>
            {[
              "적극적으로 여러 회사에 이직 시도 중",
              "최근 오퍼 제안을 받고 이직 여부 조율 중",
              "현 직장에 남을지 이직을 시작할지 고민 중",
              "퇴사 후 휴식 혹은 1인 창업/사이드잡 준비 중"
            ].map(status => (
              <button 
                key={status}
                className={`option-button ${careerContext.current_status === status ? 'selected' : ''}`}
                onClick={() => setCareerContext({ ...careerContext, current_status: status })}
              >
                {status}
                {careerContext.current_status === status && <span style={{ color: 'var(--accent-purple)' }}>✓</span>}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('birth')}>이전</button>
            <button 
              className="btn-primary" style={{ flex: 2 }} 
              disabled={!careerContext.current_status}
              onClick={() => setStep('q_concern')}
            >다음 단계</button>
          </div>
        </div>
  );
}
