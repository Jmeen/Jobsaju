
import { useAppContext } from '../../contexts/AppContext';


import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';

import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';




export function ConcernScreen() {
  const {
    careerContext,
    setStep,
    setCareerContext,
  } = useAppContext();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>현 직장에서 가장 큰 고민은 무엇인가요?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>여러 항목을 선택할 수 있으며, 선택한 내용은 종합 분석에 반영됩니다.</p>
          </div>

          <div className="option-grid" style={{ marginBottom: 30 }}>
            {[
              "연봉 및 보상 (내가 일한 가치에 미치지 못하는 보상)",
              "성장 가능성 (이 직무에 더 배울 것이 없거나 도태되는 느낌)",
              "조직 문화 및 상사/동료 갈등 (인간관계 스트레스)",
              "안정성 (회사의 경영난 및 구조조정 불안감)",
              "워라밸 (야근이 너무 많아 삶의 균형 붕괴)"
            ].map(concern => {
              const isSelected = careerContext.main_concern.includes(concern);
              const toggleConcern = () => {
                setCareerContext((prev: any) => {
                  const newConcerns = isSelected
                    ? prev.main_concern.filter((c: any) => c !== concern)
                    : [...prev.main_concern, concern];
                  return { ...prev, main_concern: newConcerns };
                });
              };

              return (
                <button 
                  key={concern}
                  className={`option-button ${isSelected ? 'selected' : ''}`}
                  onClick={toggleConcern}
                >
                  {concern.split(' ')[0]} {/* 요약어 노출 */}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                    {concern.slice(concern.indexOf('('))}
                  </span>
                  {isSelected && <span style={{ color: 'var(--accent-purple)' }}>✓</span>}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('q_status')}>이전</button>
            <button 
              className="btn-primary" style={{ flex: 2 }} 
              disabled={careerContext.main_concern.length === 0}
              onClick={() => setStep('q_desired')}
            >다음 단계</button>
          </div>
        </div>
  );
}
