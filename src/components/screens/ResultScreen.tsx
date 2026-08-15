
import { useAppContext } from '../../contexts/AppContext';
import { WheelColumn, STORAGE_KEY } from '../../contexts/AppContext';
import type { MonthTone } from '../../contexts/AppContext';

import { getCharacterAsset } from '../../utils/characterAssets';
import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';
import { buildMonthlyFlow } from '../../utils/monthlyFlow';
import { buildElementInsight, buildCharacterName, ELEMENT_INFO } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';
import { FOLLOW_UP_MAX_LENGTH } from '../../utils/followUp';
import { ReportProse } from '../ReportProse';


export function ResultScreen() {
  const {
    step,
    birthData,
    careerContext,
    sajuResult,
    isUnlocked,
    emailInput,
    isAILoading,
    unlockLoadingText,
    unlockError,
    aiReport,
    showManualPayModal,
    savedSession,
    showLookupModal,
    lookupEmailInput,
    isLookupLoading,
    lookupError,
    lookupSentMessage,
    reportHistory,
    deepLinkError,
    couponInput,
    appliedCoupon,
    couponMessage,
    couponError,
    isCouponChecking,
    showSecretCoupon,
    secretClickCount,
    followUps,
    shareBonusGranted,
    followUpInput,
    followUpError,
    isFollowUpLoading,
    isShareLoading,
    isShareConfirming,
    unlockToken,
    setStep,
    setBirthData,
    setCareerContext,
    setSajuResult,
    setIsUnlocked,
    setEmailInput,
    setIsAILoading,
    setUnlockLoadingText,
    setUnlockError,
    setAiReport,
    setShowManualPayModal,
    setSavedSession,
    setShowLookupModal,
    setLookupEmailInput,
    setIsLookupLoading,
    setLookupError,
    setLookupSentMessage,
    setReportHistory,
    setDeepLinkError,
    setCouponInput,
    setAppliedCoupon,
    setCouponMessage,
    setCouponError,
    setIsCouponChecking,
    setShowSecretCoupon,
    setSecretClickCount,
    setFollowUps,
    setShareBonusGranted,
    setFollowUpInput,
    setFollowUpError,
    setIsFollowUpLoading,
    setIsShareLoading,
    setIsShareConfirming,
    setUnlockToken,
    restoreSavedSession,
    handleUnlock,
    handleEmailLookup,
    handleSelectPastReport,
    handleFollowUpSubmit,
    handleDownloadCard,
    handleShareResult,
    handleApplyCoupon,
    pollShareBonusStatus,
    checkout,
    price,
    copy,
    currentInputStep,
    wheelDayCount,
    wheelDays,
    birthError,
    loadingText,
    viralCardCanvasRef,
    summaryCardCanvasRef
  } = useAppContext();

  return (
    <div className="result-screen">
          
          {/* Top Header info */}
          <div className="result-header">
            <div className="intro-brand"><span>커리어 리포트</span></div>
            <span className="result-date">
              {birthData.isSolar ? '양력' : '음력'} {birthData.year}.{birthData.month}.{birthData.day} {birthData.hasTime ? `${birthData.hour}:${birthData.minute}` : '(시간 모름)'}
              {!birthData.isSolar && ` · 양력 ${sajuResult.solarDate.year}.${sajuResult.solarDate.month}.${sajuResult.solarDate.day} 기준 계산`}
            </span>
          </div>

          <div className="result-primary">
          {(() => {
            const character = getCharacterAsset(sajuResult.dayGan.char);
            const top = buildTopScore(sajuResult.scores);
            const verdict = buildVerdictView(sajuResult.scores);
            const ELEMENT_MAP: Record<string, keyof typeof ELEMENT_INFO> = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };
            const myElementInfo = ELEMENT_INFO[ELEMENT_MAP[sajuResult.dayGan.element] || 'wood'];

            return (
              <>
                {/* 1. 최상단 캐릭터 & 한 줄 요약 */}
                <section className="creature-hero" aria-label={character.title}>
                  <div className={`creature-hero-stage tone-${top.tone}`}>
                    <img
                      src={character.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="creature-hero-img"
                      width={640}
                      height={640}
                      loading="eager"
                    />
                  </div>
                  <span className="creature-hero-type">{sajuResult.dayGan.char}{sajuResult.dayGan.element} 본원</span>
                  <strong className="creature-hero-title">{character.title}</strong>
                  <div className="creature-verdict-highlight" style={{ marginTop: 16, background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>"{verdict.title}"</p>
                  </div>
                </section>

                {/* 공유 CTA 1 (요약 직후) */}
                <div style={{ padding: '0 20px', marginBottom: 32 }}>
                  <button className="btn-secondary share-btn" onClick={handleShareResult} disabled={isShareLoading} style={{ width: '100%' }}>
                    {isShareLoading ? '공유 준비 중...' : '친구에게 내 캐릭터 공유하기'}
                  </button>
                </div>

                {/* 3축 점수 시각화 */}
                <section className="glass-card score-report">
                  <div className="section-heading"><div><span className="eyebrow">현재 나의 흐름</span><h3>이직 vs 잔류 vs 협상</h3></div><span>100점 기준</span></div>
                  <div className="score-bars">
                    {buildScoreBars(sajuResult.scores).map(score => {
                      const scoreView = buildAllScoreViews(sajuResult.scores).find(view => view.axis === score.key);
                      return (
                        <div className="score-row" key={score.key}>
                          <div className="score-meta">
                            <span>{score.label}{scoreView && <em className="score-rank">{scoreView.level}</em>}</span>
                            <strong>{score.value}</strong>
                          </div>
                          <div className="score-track"><span className={`score-fill ${score.tone}`} style={{ width: `${score.width}%` }} /></div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 성향 요약 3 카드 */}
                <section className="insight-cards" style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
                  <div className="section-heading"><div><span className="eyebrow">업무 성향 요약</span><h3>나의 커리어 DNA</h3></div></div>
                  
                  <div className="glass-card insight-item" style={{ padding: '16px' }}>
                    <span className="insight-label" style={{ color: 'var(--accent-purple)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>💪 Strength (강점)</span>
                    <p style={{ fontSize: '14px', lineHeight: 1.5, margin: 0, color: 'var(--text-secondary)' }}>{myElementInfo.strong}</p>
                  </div>
                  
                  <div className="glass-card insight-item" style={{ padding: '16px' }}>
                    <span className="insight-label" style={{ color: 'var(--accent-pink)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>⚠️ Blind Spot (주의할 점)</span>
                    <p style={{ fontSize: '14px', lineHeight: 1.5, margin: 0, color: 'var(--text-secondary)' }}>{myElementInfo.weak}</p>
                  </div>
                  
                  <div className="glass-card insight-item" style={{ padding: '16px' }}>
                    <span className="insight-label" style={{ color: 'var(--border-neon)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>🏢 Best Environment (맞는 환경)</span>
                    <p style={{ fontSize: '14px', lineHeight: 1.5, margin: 0, color: 'var(--text-secondary)' }}>{myElementInfo.env}</p>
                  </div>
                </section>
              </>
            );
          })()}
        </div>

        {/* === LOCKED / UNLOCKED AREA === */}
          <div className="locked-area">
            
            {/* 1. Locked Overlay (Only shown when not unlocked) */}
            {!isUnlocked && (
              <div className="unlock-overlay">
                <div className="unlock-card paywall-teaser">
                  <div className="teaser-header" style={{ textAlign: 'center', marginBottom: 24 }}>
                    <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 8, lineHeight: 1.4 }}>성향은 알았습니다.<br/>이제 중요한 건 타이밍입니다.</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      지금 움직여야 할지, 기다려야 할지<br/>12개월 흐름을 확인하세요.
                    </p>
                  </div>

                  <div className="locked-preview-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                    <div className="locked-preview-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#e5e7eb' }}>🔥 올해 가장 강한 이직 시기</span>
                      <span className="blur-text" style={{ fontSize: 14, color: 'var(--accent-purple)', fontWeight: 600, filter: 'blur(4px)' }}>9월~10월</span>
                    </div>
                    <div className="locked-preview-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#e5e7eb' }}>💰 연봉 이야기하기 좋은 시기</span>
                      <span className="blur-text" style={{ fontSize: 14, color: 'var(--accent-pink)', fontWeight: 600, filter: 'blur(4px)' }}>11월</span>
                    </div>
                    <div className="locked-preview-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#e5e7eb' }}>⚠️ 조심해야 하는 구간</span>
                      <span className="blur-text" style={{ fontSize: 14, color: '#f87171', fontWeight: 600, filter: 'blur(4px)' }}>4월~5월</span>
                    </div>
                    <div className="locked-preview-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: '#e5e7eb' }}>🗓 12개월 커리어 캘린더</span>
                      <span className="blur-text" style={{ fontSize: 14, color: 'var(--border-neon)', fontWeight: 600, filter: 'blur(4px)' }}>전체 열람</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 12, color: 'var(--accent-purple)', margin: '16px 0 20px', textAlign: 'center' }}>
                    ✓ 궁금증 1가지를 추가로 질문할 수 있습니다.
                  </p>
                  
                  <button className="btn-primary" onClick={() => setShowManualPayModal(true)} style={{ width: '100%', marginBottom: 12 }}>
                    내 커리어 타이밍 확인하기 · 8,900원
                  </button>

                  <button className="btn-text-only" onClick={handleShareResult} disabled={isShareLoading} style={{ width: '100%' }}>
                    {isShareLoading ? '공유 준비 중...' : '결과 공유하고 할인받기'}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Content Area (Blurred when locked) */}
            <div className={`report-details${!isUnlocked ? ' blur-content' : ''}`}>
              
              {/* Continuous premium report */}
              {aiReport && (
                <div>
                  {reportHistory.length > 1 && (
                    <div className="glass-card" style={{ textAlign: 'left', marginBottom: 16, padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        이 이메일로 구매한 리포트가 {reportHistory.length}건 있어요. 보고 싶은 리포트를 선택하세요.
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {reportHistory.map((entry: any, idx: any) => {
                          const isActive = entry.unlock_token === unlockToken;
                          return (
                            <button
                              key={entry.unlock_token}
                              type="button"
                              onClick={() => handleSelectPastReport(entry.unlock_token)}
                              disabled={isLookupLoading}
                              style={{
                                textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                                border: isActive ? '1px solid var(--border-neon-bright)' : '1px solid rgba(255,255,255,0.08)',
                                background: isActive ? 'rgba(168,85,247,0.12)' : 'transparent',
                                color: '#fff', cursor: isLookupLoading ? 'default' : 'pointer', fontSize: 12,
                              }}
                            >
                              <strong>{entry.label}</strong>
                              {idx === 0 && <span style={{ marginLeft: 6, color: '#4ade80' }}>· 최신</span>}
                              {entry.created_at && (
                                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                                  {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {lookupError && (
                        <p style={{ color: '#f87171', fontSize: 12, marginTop: 8, marginBottom: 0 }}>{lookupError}</p>
                      )}
                    </div>
                  )}
                  {aiReport.source === 'fallback' && (
                    <p className="fallback-notice">
                      규칙 기반 간이 리포트입니다 — AI 상담 서버가 연결되면 입력한 고민을 더 깊게 반영한 해석이 제공됩니다.
                    </p>
                  )}
                  {aiReport.report?.report_summary && (
                    <section className="glass-card" style={{ textAlign: 'left', marginBottom: 24 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', display: 'block', marginBottom: 6 }}>리포트 요약</span>
                      <h3 style={{ fontSize: 18, lineHeight: 1.5, color: '#f3f4f6', marginBottom: 12 }}>{aiReport.report.report_summary.headline}</h3>
                      <strong style={{ color: 'var(--accent-pink)', fontSize: 14 }}>💡 {aiReport.report.report_summary.one_line_action}</strong>
                    </section>
                  )}

                  {aiReport.report?.personalized_advice && (
                    <section className="glass-card premium-section">
                      <span className="report-number">01</span>
                      <span className="eyebrow">맞춤 진단</span>
                      <h3 style={{ fontSize: 18, marginBottom: 16 }}>고민에 대한 명리학적 솔루션</h3>
                      <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}><strong>Q.</strong> {aiReport.report.personalized_advice.question_summary}</p>
                      </div>
                      <p style={{ marginBottom: 16, lineHeight: 1.6 }}><strong>진단:</strong> {aiReport.report.personalized_advice.diagnosis}</p>
                      <p style={{ marginBottom: 16, lineHeight: 1.6 }}><strong>기질 분석:</strong> {aiReport.report.personalized_advice.character_connection}</p>
                      <p style={{ marginBottom: 24, lineHeight: 1.6, color: 'var(--accent-purple)' }}><strong>전략 제안:</strong> {aiReport.report.personalized_advice.recommendation}</p>
                      
                      <div className="action-columns">
                        <div>
                          <strong>지금 해야 할 일</strong>
                          {aiReport.report.personalized_advice.action_steps.map((item: string) => <span key={item}>{item}</span>)}
                        </div>
                        <div>
                          <strong>주의해야 할 일</strong>
                          {aiReport.report.personalized_advice.watch_out.map((item: string) => <span key={item}>{item}</span>)}
                        </div>
                      </div>
                    </section>
                  )}

                  {aiReport.report?.timing_highlights && (
                    <section className="glass-card premium-section">
                      <span className="report-number">02</span>
                      <span className="eyebrow">타이밍 하이라이트</span>
                      <h3 style={{ fontSize: 18, marginBottom: 16 }}>행동하기 가장 좋은 시기</h3>
                      <div className="path-list">
                        <article>
                          <div><h4 style={{ color: 'var(--accent-pink)' }}>이직·이동 최적기</h4><strong>{aiReport.report.timing_highlights.best_job_change.year_month}</strong></div>
                          <p>{aiReport.report.timing_highlights.best_job_change.reason}</p>
                          <span style={{ fontSize: 12, marginTop: 8, display: 'block', color: 'var(--text-muted)' }}>👉 {aiReport.report.timing_highlights.best_job_change.action}</span>
                        </article>
                        <article>
                          <div><h4 style={{ color: 'var(--accent-purple)' }}>협상·제안 최적기</h4><strong>{aiReport.report.timing_highlights.best_negotiation.year_month}</strong></div>
                          <p>{aiReport.report.timing_highlights.best_negotiation.reason}</p>
                          <span style={{ fontSize: 12, marginTop: 8, display: 'block', color: 'var(--text-muted)' }}>👉 {aiReport.report.timing_highlights.best_negotiation.action}</span>
                        </article>
                        <article>
                          <div><h4 style={{ color: '#ef4444' }}>주의 및 리스크 구간</h4><strong>{aiReport.report.timing_highlights.caution_month.year_month}</strong></div>
                          <p>{aiReport.report.timing_highlights.caution_month.reason}</p>
                          <span style={{ fontSize: 12, marginTop: 8, display: 'block', color: 'var(--text-muted)' }}>👉 {aiReport.report.timing_highlights.caution_month.action}</span>
                        </article>
                      </div>
                    </section>
                  )}

                  {aiReport.report?.timeline && (
                    <section className="glass-card premium-section">
                      <span className="report-number">03</span>
                      <span className="eyebrow">월별 상세 흐름</span>
                      <h3 style={{ fontSize: 18, marginBottom: 16 }}>앞으로 12개월의 기운</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {aiReport.report.timeline.map((item: any) => (
                          <div key={item.year_month} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <strong style={{ fontSize: 16, color: '#f3f4f6' }}>{item.year_month}</strong>
                              <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>{item.keyword}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                              <span>이직운 {item.scores?.job_change ?? 0}</span> | 
                              <span>협상운 {item.scores?.negotiation ?? 0}</span> | 
                              <span>잔류운 {item.scores?.stay ?? 0}</span>
                            </div>
                            <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8, color: '#d1d5db' }}>{item.summary}</p>
                            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>✅ {item.action}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {aiReport.closing_advice && (
                    <section className="closing-card">
                      <span className="eyebrow">{REPORT_HEADINGS.closing}</span>
                      <p>{aiReport.closing_advice}</p>
                    </section>
                  )}
                </div>
              )}

              {/* Monthly Timeline Calendar (월운 규칙 엔진 기반) */}
              <div className="glass-card" style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 12 }}>{REPORT_HEADINGS.roadmap}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>내 일간과 매달 실제 월운(월건)을 대조해 계산한 달별 추천 행동입니다.</p>

                  <div className="timeline-list">
                    {(() => {
                      const natalZhis = [
                        sajuResult.pillars.year.zhi,
                        sajuResult.pillars.month.zhi,
                        sajuResult.pillars.day.zhi,
                        ...(sajuResult.pillars.hour.zhi ? [sajuResult.pillars.hour.zhi] : []),
                      ];
                      const toneColor: Record<MonthTone, string> = {
                        move: 'var(--accent-purple)',
                        nego: 'var(--accent-pink)',
                        press: '#b3583f',
                        doc: 'var(--accent-blue)',
                        peer: 'var(--accent-cyan)',
                        calm: '#4d5a78',
                      };
                      return buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 6).map(plan => (
                        <div className="timeline-item" key={`${plan.year}-${plan.month}`}>
                          <div>
                            <span className="timeline-badge" style={{ background: toneColor[plan.tone] }}>
                              {plan.label}{plan.isPeak ? ' ★' : ''}
                            </span>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{plan.description}</p>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
              </div>

              {/* Elements Radar Chart */}
              <div className="glass-card">
                  <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 12, textAlign: 'left' }}>{REPORT_HEADINGS.elementProfile}</h3>
                  
                  {/* Radar Chart SVG rendering */}
                  <div className="radar-wrapper">
                    <svg className="radar-svg" width="220" height="220" viewBox="0 0 220 220">
                      {/* Grid Pentagon 1 (Outer) */}
                      <polygon points="110,10 205,79 169,191 51,191 15,79" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      {/* Grid Pentagon 2 (Middle) */}
                      <polygon points="110,60 157.5,94.5 139.5,150.5 80.5,150.5 62.5,94.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      
                      {/* Axes */}
                      <line x1="110" y1="110" x2="110" y2="10" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="205" y2="79" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="169" y2="191" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="51" y2="191" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      <line x1="110" y1="110" x2="15" y2="79" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

                      {/* Labels */}
                      <text x="110" y="5" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">추진력 (목)</text>
                      <text x="210" y="82" fill="var(--text-secondary)" fontSize="10" textAnchor="start">열정/소통 (화)</text>
                      <text x="175" y="202" fill="var(--text-secondary)" fontSize="10" textAnchor="start">끈기/안정 (토)</text>
                      <text x="45" y="202" fill="var(--text-secondary)" fontSize="10" textAnchor="end">결단/실행 (금)</text>
                      <text x="10" y="82" fill="var(--text-secondary)" fontSize="10" textAnchor="end">기획/전략 (수)</text>

                      {/* Data polygon (Dynamically generated based on elementsCount) */}
                      {/* Scale elementsCount to radar coordinate. Element maximum = 5 */}
                      {(() => {
                        const maxVal = 5;
                        const w = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.wood));
                        const f = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.fire));
                        const e = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.earth));
                        const m = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.metal));
                        const wa = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.water));

                        const p1 = { x: 110, y: 110 - (100 * (w / maxVal)) };
                        const p2 = { x: 110 + (95 * (f / maxVal)), y: 110 - (31 * (f / maxVal)) };
                        const p3 = { x: 110 + (59 * (e / maxVal)), y: 110 + (81 * (e / maxVal)) };
                        const p4 = { x: 110 - (59 * (m / maxVal)), y: 110 + (81 * (m / maxVal)) };
                        const p5 = { x: 110 - (95 * (wa / maxVal)), y: 110 - (31 * (wa / maxVal)) };

                        const points = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y}`;

                        return (
                          <>
                            <polygon points={points} fill="rgba(168, 85, 247, 0.25)" stroke="var(--accent-purple)" strokeWidth="2" />
                            {/* Dots */}
                            <circle cx={p1.x} cy={p1.y} r="3" fill="#fff" />
                            <circle cx={p2.x} cy={p2.y} r="3" fill="#fff" />
                            <circle cx={p3.x} cy={p3.y} r="3" fill="#fff" />
                            <circle cx={p4.x} cy={p4.y} r="3" fill="#fff" />
                            <circle cx={p5.x} cy={p5.y} r="3" fill="#fff" />
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 13, fontWeight: 'bold', color: '#fff', display: 'block', marginBottom: 4 }}>{REPORT_HEADINGS.elementBalance}</span>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {buildElementInsight(sajuResult.elementsCount)}
                    </p>
                  </div>
              </div>
            </div>

            {/* 추가 질문 — 상세 리포트 다음, 이직운 캐릭터 카드 바로 위 */}
            {isUnlocked && (
              <section className="followup-card">
                <div className="section-heading" style={{ marginBottom: 12 }}>
                  <div>
                    <span className="eyebrow">{REPORT_HEADINGS.followUp}</span>
                    <h3>{isFollowUpLoading ? '질문을 살펴보고 있어요' : followUps.length ? REPORT_HEADINGS.followUp : '아직 궁금한 게 남았나요?'}</h3>
                  </div>
                  <span>{isFollowUpLoading ? '답변 생성 중' : `${followUps.length}/${shareBonusGranted ? 2 : 1} 사용`}</span>
                </div>

                {followUps.map((record: any, index: any) => (
                  <div className="followup-thread" key={record.answeredAt}>
                    <p className="followup-q">Q{index + 1}. {record.question}</p>
                    <div className="followup-a"><FormattedAnswer answer={record.answer} /></div>
                  </div>
                ))}

                {isFollowUpLoading ? (
                  <FollowUpLoading />
                ) : followUps.length < (shareBonusGranted ? 2 : 1) ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                      리포트를 읽고 남은 궁금증 하나를 적어주세요. 내 사주 데이터를 근거로 그 질문에만 집중해 답합니다.
                    </p>
                    <div className="followup-examples">
                      {['몇 월에 지원하는 게 좋을까요?', '연봉을 얼마나 불러도 될까요?', '승진을 1년 더 기다려도 될까요?', '지금 받은 오퍼를 수락해도 될까요?'].map(example => (
                        <button key={example} type="button" onClick={() => { setFollowUpInput(example); setFollowUpError(null); }}>
                          {example}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="input-text followup-input"
                      rows={3}
                      maxLength={FOLLOW_UP_MAX_LENGTH}
                      placeholder="예: 지금 회사에서 딱 1년만 더 버티면 승진 가능성이 있는데, 그걸 기다리는 게 나을까요?"
                      value={followUpInput}
                      onChange={e => { setFollowUpInput(e.target.value); setFollowUpError(null); }}
                    />
                    <div className="followup-foot">
                      <span>{followUpInput.trim().length}/{FOLLOW_UP_MAX_LENGTH}</span>
                      {followUpError && <em>{followUpError}</em>}
                    </div>
                    <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleFollowUpSubmit}>
                      내 사주 기준으로 답변 받기
                    </button>
                  </>
                ) : !shareBonusGranted ? (
                  <>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 10px', lineHeight: 1.5 }}>
                      {isShareConfirming
                        ? '카카오톡에서 실제로 보내기를 누르면 자동으로 확인돼요. 잠시만 기다려 주세요.'
                        : '결과를 친구에게 공유하면 추가 질문 1회가 열립니다.'}
                    </p>
                    <button className="btn-primary" onClick={handleShareResult} disabled={isShareLoading || isShareConfirming}>
                      {isShareConfirming ? '카카오톡 전송 확인 중...' : isShareLoading ? '공유 카드 준비 중...' : '친구에게 공유하고 한 번 더 물어보기'}
                    </button>
                  </>
                ) : (
                  <small>추가 질문 2회를 모두 사용했습니다.</small>
                )}
              </section>
            )}

            {/* === 바이럴 공유 카드 섹션 === */}
            <section className="glass-card" style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(236,72,153,0.18) 100%)',
              border: '1px solid var(--border-neon-bright)',
              textAlign: 'center',
              padding: '24px 20px',
              marginTop: 24,
              marginBottom: 20
            }}>
              <span className="eyebrow" style={{ color: 'var(--accent-pink)' }}>{REPORT_HEADINGS.shareCard}</span>
              <h3 style={{ fontSize: 17, color: '#fff', margin: '8px 0 6px' }}>
                커리어 성향 공유 카드
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                카카오톡이나 SNS에 공유하여 동기나 지인들의 이직운 점수와 비교해 보세요.
              </p>

              {/* 시각적으로 바로 보이는 결과 카드 (Canvas) */}
              <canvas 
                ref={viralCardCanvasRef} 
                width="800" 
                height="800" 
                role="img"
                aria-label="커리어 성향과 선택지 점수 공유 카드"
                style={{ 
                  width: '100%', 
                  maxWidth: 360, 
                  height: 'auto', 
                  borderRadius: 16, 
                  border: '1px solid var(--border-neon-bright)', 
                  margin: '12px auto 18px', 
                  display: 'block', 
                  boxShadow: '0 0 20px rgba(168,85,247,0.25)' 
                }} 
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  className="btn-primary"
                  style={{ padding: '13px 8px', fontSize: 13 }}
                  onClick={handleShareResult}
                  disabled={isShareLoading || isShareConfirming}
                >
                  {isShareConfirming ? '전송 확인 중...' : isShareLoading ? '준비 중...' : '💬 카톡 공유'}
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ padding: '13px 8px', fontSize: 13, borderColor: 'var(--accent-purple)' }}
                  onClick={() => void handleDownloadCard(viralCardCanvasRef.current, '이직사주_캐릭터카드.png')}
                >
                  🖼️ 이미지 저장
                </button>
              </div>
            </section>
          </div>

          {/* 다시 입력하기는 잠금 여부와 무관하게 항상 눌릴 수 있어야 한다 */}
          <button
            className="btn-secondary" style={{ width: '100%', margin: '24px 0 16px' }}
            onClick={() => {
              try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
              setSavedSession(null);
              setStep('intro');
              setIsUnlocked(false);
              setAiReport(null);
              setFollowUps([]);
              setShareBonusGranted(false);
              setFollowUpInput('');
              setFollowUpError(null);
              setReportHistory([]);
              setCareerContext({ current_status: '', main_concern: [], current_job: '', career_goal: '', desired_answer: '', email: '' });
            }}
          >
            처음부터 다시 입력하기
          </button>

          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, margin: '4px 0 8px' }}>
            본 결과는 명리학을 바탕으로 한 참고 자료이며, 오락과 자기 성찰 목적으로 제공됩니다.<br />
            이직·퇴사 등 중요한 결정은 반드시 현실 조건을 함께 검토해 주세요.
          </p>
        </div>
  );
}
