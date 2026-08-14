import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { WheelColumn } from '../../contexts/AppContext'; // Wait, WheelColumn is not exported, we'll fix this
import { CHECKOUT_COPY } from '../../utils/checkoutPresentation';
import { getCharacterAsset } from '../../utils/characterAssets';
import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';
import { buildMonthlyFlow } from '../../utils/monthlyFlow';
import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
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

          {/* 내 일간 크리처 — 결과를 열자마자 가장 먼저 보이는 "내 카드" */}
          {(() => {
            const character = getCharacterAsset(sajuResult.dayGan.char);
            const top = buildTopScore(sajuResult.scores);
            return (
              <section className="creature-hero" aria-label={`${character.title}, ${top.axisLabel} 우세`}>
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
                  <div className="creature-hero-no">No. {String(character.collectionNo).padStart(2, '0')} / {character.collectionTotal}</div>
                  <div className="creature-hero-badge">{AXIS_ICON[top.axis]} {top.axisLabel} 우세</div>
                </div>
                <strong className="creature-hero-title">{character.title}</strong>
                <span className="creature-hero-type">{buildCharacterTypeLabel(character.elementLabel, character.title, top.axisLabel)}</span>
              </section>
            );
          })()}

          <section className="verdict-card">
            <span className="eyebrow">{buildVerdictView(sajuResult.scores).isClose ? `${REPORT_HEADINGS.verdict} · 점수 근접` : REPORT_HEADINGS.verdict}</span>
            <h1>{buildVerdictView(sajuResult.scores).title}</h1>
            <p>{buildVerdictView(sajuResult.scores).subtitle}</p>
          </section>

          {/* 현재 가장 높은 선택 지표 */}
          {(() => {
            const top = buildTopScore(sajuResult.scores);
            return (
              <section className={`rank-card rank-${top.tone}`}>
                <span className="eyebrow">{REPORT_HEADINGS.strongestFlow}</span>
                <strong>{top.headline}</strong>
                <p>{top.detail}</p>
              </section>
            );
          })()}

          <section className="glass-card score-report">
            <div className="section-heading"><div><span className="eyebrow">{REPORT_HEADINGS.scoreComparison}</span><h3>{REPORT_HEADINGS.scoreComparisonTitle}</h3></div><span>100점 기준</span></div>
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

          <section className="next-action-card">
            <span className="action-index">01</span>
            <div><span className="eyebrow">{REPORT_HEADINGS.nextAction}</span><h3>{buildVerdictView(sajuResult.scores).action.title}</h3><p>{buildVerdictView(sajuResult.scores).action.desc}</p></div>
          </section>

          {/* 이번 달 브리핑 — 매달 바뀌므로 다시 찾아올 이유가 된다 (무료) */}
          {(() => {
            const natalZhis = [
              sajuResult.pillars.year.zhi,
              sajuResult.pillars.month.zhi,
              sajuResult.pillars.day.zhi,
              ...(sajuResult.pillars.hour.zhi ? [sajuResult.pillars.hour.zhi] : []),
            ];
            const thisMonth = buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 1)[0];
            if (!thisMonth) return null;

            return (
              <section className="month-brief-card">
                <div className="month-brief-head">
                  <span className="eyebrow">{thisMonth.year}년 {thisMonth.month}월의 흐름</span>
                  <span className="month-brief-ganzhi">{thisMonth.ganZhi}월</span>
                </div>
                <h3>{thisMonth.label.replace(/^\d+월 \[|\]$/g, '')}</h3>
                <p>{thisMonth.description}</p>
                <small>달이 바뀌면 이 조언도 함께 바뀝니다.</small>
              </section>
            );
          })()}

          </div>

          {/* 사주 원국표 (무료) — 판단과 행동 요약 다음에 근거로 제공 */}
          <div className="glass-card evidence-card result-evidence">
            <div className="section-heading"><div><span className="eyebrow">{REPORT_HEADINGS.evidence}</span><h3>{REPORT_HEADINGS.chart}</h3></div><span>{sajuResult.dayGan.char}목 본원</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {/* 시주 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>시주</span>
                {sajuResult.pillars.hour.gan ? (
                  <>
                    <h4 style={{ color: 'var(--accent-purple)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.hour.ganHanja}{sajuResult.pillars.hour.zhiHanja}</h4>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.hour.gan}{sajuResult.pillars.hour.zhi}</span>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.hour.shiShen}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>모름</div>
                )}
              </div>

              {/* 일주 */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid var(--border-neon)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>일주 (나)</span>
                <h4 style={{ color: 'var(--accent-pink)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.day.ganHanja}{sajuResult.pillars.day.zhiHanja}</h4>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.day.gan}{sajuResult.pillars.day.zhi}</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.day.shiShen}</div>
              </div>

              {/* 월주 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>월주</span>
                <h4 style={{ color: 'var(--accent-purple)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.month.ganHanja}{sajuResult.pillars.month.zhiHanja}</h4>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.month.gan}{sajuResult.pillars.month.zhi}</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.month.shiShen}</div>
              </div>

              {/* 연주 */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>연주</span>
                <h4 style={{ color: 'var(--accent-purple)', fontSize: 18, marginTop: 4 }}>{sajuResult.pillars.year.ganHanja}{sajuResult.pillars.year.zhiHanja}</h4>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sajuResult.pillars.year.gan}{sajuResult.pillars.year.zhi}</span>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sajuResult.pillars.year.shiShen}</div>
              </div>
            </div>
          </div>

          {/* === LOCKED / UNLOCKED AREA === */}
          <div className="locked-area">
            
            {/* 1. Locked Overlay (Only shown when not unlocked) */}
            {!isUnlocked && (
              <div className="unlock-overlay">
                <div className="unlock-card">
                  <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 8 }}>{copy.unlockTitle}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                    {copy.unlockBody}
                  </p>

                  {/* 6개월 로드맵 미리보기 — 가장 반응이 좋은 기능이므로 결제 전에 실물을 보여준다 */}
                  {(() => {
                    const natalZhis = [
                      sajuResult.pillars.year.zhi,
                      sajuResult.pillars.month.zhi,
                      sajuResult.pillars.day.zhi,
                      ...(sajuResult.pillars.hour.zhi ? [sajuResult.pillars.hour.zhi] : []),
                    ];
                    const preview = buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 6);
                    return (
                      <div className="roadmap-teaser">
                        <span className="roadmap-teaser-title">내 6개월 이직 로드맵</span>
                        <ul>
                          {preview.map((m, i) => (
                            <li key={`${m.year}-${m.month}`} className={i < 2 ? 'open' : 'locked'}>
                              <strong>{m.month}월</strong>
                              <span>{i < 2 ? m.label.replace(/^\d+월 \[|\]$/g, '') : '••••••'}</span>
                              {m.isPeak && i < 2 && <em>가장 강한 달</em>}
                              {i >= 2 && <i>🔒</i>}
                            </li>
                          ))}
                        </ul>
                        <small>달마다 무엇을 해야 하는지, 왜 그런지까지 전부 열립니다.</small>
                      </div>
                    );
                  })()}

                  <p style={{ fontSize: 12, color: 'var(--accent-purple)', margin: '16px 0 20px' }}>
                    ✓ 궁금증 1가지를 추가로 질문할 수 있습니다.
                  </p>
                  <button className="btn-primary" onClick={() => setShowManualPayModal(true)}>
                    {copy.unlockCta(price.label)}
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
                        {reportHistory.map((entry, idx) => {
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
                  {aiReport.intent_summary && (
                    <section className="intent-card">
                      <span className="eyebrow">{REPORT_HEADINGS.intent}</span>
                      <h3>{aiReport.intent_summary.primary_question}</h3>
                      <p>{aiReport.intent_summary.role_interpretation}</p>
                      <div className="assumption-list">
                        {aiReport.intent_summary.assumptions.map((item: string) => <span key={item}>{item}</span>)}
                      </div>
                      {aiReport.intent_summary.needs_clarification && <small>직함의 정확한 의미는 실제 업무 범위를 확인한 뒤 판단해야 합니다.</small>}
                    </section>
                  )}
                  {aiReport.decision_factors && (
                    <section className="decision-factor-card">
                      <span className="eyebrow">{REPORT_HEADINGS.decisionFactors}</span>
                      <p>{aiReport.decision_factors.summary}</p>
                      <strong>{aiReport.decision_factors.recommendation}</strong>
                      <div className="decision-checks">
                        {aiReport.decision_factors.checks?.map((item: string) => <span key={item}>{item}</span>)}
                      </div>
                    </section>
                  )}
                  {/* One line conclusion */}
                  <div className="glass-card" style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', display: 'block', marginBottom: 6 }}>총평</span>
                    <p style={{ fontSize: 15, lineHeight: 1.5, color: '#f3f4f6' }}>{aiReport.one_line_conclusion}</p>
                  </div>

                  {aiReport.personal_answer && (
                    <section className="glass-card premium-section personal-answer">
                      <span className="report-number">01</span>
                      <span className="eyebrow">{REPORT_HEADINGS.personalAnswer}</span>
                      <h3>“{aiReport.personal_answer.question}”</h3>
                      <ReportProse text={aiReport.personal_answer.content} />
                    </section>
                  )}

                  {aiReport.current_dilemma && (
                    <section className="glass-card premium-section">
                      <span className="report-number">02</span>
                      <span className="eyebrow">{REPORT_HEADINGS.situation}</span>
                      <h3>{aiReport.current_dilemma.title}</h3>
                      <ReportProse text={aiReport.current_dilemma.content} />
                    </section>
                  )}

                  {aiReport.career_nature && (
                    <section className="glass-card premium-section">
                      <span className="report-number">03</span>
                      <span className="eyebrow">{REPORT_HEADINGS.careerNature}</span>
                      <h3>{aiReport.career_nature.title}</h3>
                      <ReportProse text={aiReport.career_nature.content} />
                      <div className="trait-grid">
                        <div><strong>{REPORT_HEADINGS.strengths}</strong>{aiReport.career_nature.strengths.map((item: string) => <span key={item}>{item}</span>)}</div>
                        <div><strong>{REPORT_HEADINGS.cautions}</strong>{aiReport.career_nature.cautions.map((item: string) => <span key={item}>{item}</span>)}</div>
                      </div>
                    </section>
                  )}

                  {aiReport.three_paths && (
                    <section className="glass-card premium-section">
                      <span className="report-number">04</span>
                      <span className="eyebrow">{REPORT_HEADINGS.paths}</span>
                      <h3>선택에 따라 무엇이 달라지는지</h3>
                      <div className="path-list">
                        {aiReport.three_paths.map((path: any) => (
                          <article key={path.key}>
                            <div><h4>{path.title}</h4><strong>{path.score}</strong></div>
                            <p>{path.content}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  {aiReport.ideal_environment && (
                    <section className="glass-card premium-section">
                      <span className="report-number">05</span>
                      <span className="eyebrow">{REPORT_HEADINGS.environment}</span>
                      <h3>{aiReport.ideal_environment.title}</h3>
                      <ReportProse text={aiReport.ideal_environment.content} />
                      <div className="check-list">{aiReport.ideal_environment.checklist.map((item: string) => <span key={item}>{item}</span>)}</div>
                    </section>
                  )}

                  {aiReport.action_plan && (
                    <section className="glass-card premium-section">
                      <span className="report-number">06</span>
                      <span className="eyebrow">{REPORT_HEADINGS.actionPlan}</span>
                      <h3>이번 주에 할 일과 미룰 일</h3>
                      <div className="action-columns">
                        <div><strong>{REPORT_HEADINGS.actionDo}</strong>{aiReport.action_plan.do.map((item: string) => <span key={item}>{item}</span>)}</div>
                        <div><strong>{REPORT_HEADINGS.actionAvoid}</strong>{aiReport.action_plan.avoid.map((item: string) => <span key={item}>{item}</span>)}</div>
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

                {followUps.map((record, index) => (
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
