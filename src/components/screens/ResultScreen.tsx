
import { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { STORAGE_KEY } from '../../utils/session';

import { getCharacterAsset } from '../../utils/characterAssets';
import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';
// @ts-ignore
import FREE_CHARACTERS from '../../../free_engine_characters.js';
import { buildElementInsight, buildCharacterName, ELEMENT_INFO } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';
import { FOLLOW_UP_MAX_LENGTH } from '../../utils/followUpValidation';
import { ReportProse } from '../ReportProse';

type DominantMode = 'jobChange' | 'negotiation' | 'stay';

/**
 * Paywall 카피는 무료 3축 점수 중 가장 높은 축(dominantMode)에 맞춰 전환된다.
 * 여기서 쓰는 데이터는 free scores/character뿐이며, paid month/highlight는 절대 참조하지 않는다.
 */
const PAYWALL_COPY: Record<DominantMode, {
  eyebrow: string;
  headlineLines: string[];
  subcopyLines: string[];
  lockedItems: { icon: string; title: string; hint: string; lockLabel: string }[];
  ctaPrimary: string;
  benefit1: string;
  bridgeLines: string[];
}> = {
  jobChange: {
    eyebrow: "다음은 '언제'입니다",
    headlineLines: ['떠날지 말지보다', '언제 움직일지가 더 중요합니다.'],
    subcopyLines: ['같은 이직 흐름이라도', '지원하기 좋은 달과 조건을 확인해야 할 달은 다릅니다.'],
    lockedItems: [
      { icon: '🔥', title: '가장 강한 이직 시기', hint: '외부 이동에 힘이 실리는 구간이 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '💰', title: '연봉·조건 협상 시기', hint: '오퍼와 조건을 조율하기 좋은 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '⚠️', title: '가장 조심해야 하는 구간', hint: '빠르게 움직일수록 조건 검증이 중요한 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '📅', title: '앞으로 12개월 커리어 흐름', hint: '이직 / 협상 / 잔류의 변화가 월별로 달라집니다.', lockLabel: '🔒 전체 타임라인 잠김' },
    ],
    ctaPrimary: '내 이직 타이밍 확인하기',
    benefit1: '외부 이동에 가장 힘이 실리는 시기',
    bridgeLines: ['지금은 외부 선택지를 열어둘 가치가 있습니다.', "다음 질문은 '언제 움직일 것인가'입니다."],
  },
  negotiation: {
    eyebrow: '지금은 조건을 바꿀 때',
    headlineLines: ['나갈지 말지보다', '어떤 조건을 얻고 움직일지가 더 중요합니다.'],
    subcopyLines: ['연봉, 역할, 직급, 근무 조건은', '요구하는 시기에 따라 결과가 달라질 수 있습니다.'],
    lockedItems: [
      { icon: '💰', title: '연봉·조건 협상 승부처', hint: '성과를 실제 조건으로 바꾸기 좋은 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '🔥', title: '외부 기회를 확인하기 좋은 시기', hint: '현재 조건과 시장 가치를 비교해볼 구간이 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '⚠️', title: '협상을 서두르지 말아야 하는 구간', hint: '감정이나 조급함보다 근거가 중요한 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '📅', title: '앞으로 12개월 커리어 흐름', hint: '협상 / 이직 / 잔류의 흐름을 월별로 확인합니다.', lockLabel: '🔒 전체 타임라인 잠김' },
    ],
    ctaPrimary: '내 연봉·조건 승부처 확인하기',
    benefit1: '연봉·역할·조건 협상의 승부처',
    bridgeLines: ['지금은 바로 떠나기보다', '내 가치를 어떤 조건으로 바꿀지가 중요합니다.'],
  },
  stay: {
    eyebrow: '남는다면, 무엇을 얻을 것인가',
    headlineLines: ['지금은 떠나는 것보다', '남아서 무엇을 얻을지가 더 중요합니다.'],
    subcopyLines: ['잔류가 유리한 흐름이어도', '성과를 인정받는 시기와 관계를 조심해야 하는 시기는 다릅니다.'],
    lockedItems: [
      { icon: '🏆', title: '성과·보상 승부처', hint: '현 직장에서 성과를 조건과 기회로 연결하기 좋은 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '💰', title: '연봉·역할 협상 시기', hint: '남더라도 조건을 다시 정리해볼 만한 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '⚠️', title: '관계·갈등을 조심해야 하는 구간', hint: '버티는 것보다 대응 방식이 중요한 시기가 있습니다.', lockLabel: '🔒 정확한 월은 결제 후 공개' },
      { icon: '📅', title: '앞으로 12개월 커리어 흐름', hint: '잔류가 언제나 같은 의미는 아닙니다. 월별 흐름을 확인합니다.', lockLabel: '🔒 전체 타임라인 잠김' },
    ],
    ctaPrimary: '내 커리어 승부처 확인하기',
    benefit1: '현 직장에서 성과와 보상을 만들기 좋은 시기',
    bridgeLines: ['지금은 남는 선택에 힘이 실립니다.', "하지만 '그냥 버티는 것'과 '보상을 만들며 남는 것'은 다릅니다."],
  },
};

export function ResultScreen() {
  // 입력 중인 질문은 로컬 state로 둔다 — 컨텍스트에 두면 한 글자마다 이 화면 전체가 다시 그려진다.
  const [followUpInput, setFollowUpInput] = useState('');
  const {
    sajuResult,
    isUnlocked,
    aiReport,
    isLookupLoading,
    lookupError,
    reportHistory,
    followUps,
    shareBonusGranted,
    followUpError,
    isFollowUpLoading,
    isShareLoading,
    isShareConfirming,
    unlockToken,
    setStep,
    setCareerContext,
    setIsUnlocked,
    setAiReport,
    setShowManualPayModal,
    setSavedSession,
    setReportHistory,
    setFollowUps,
    setShareBonusGranted,
    setFollowUpError,
    handleSelectPastReport,
    handleFollowUpSubmit,
    handleDownloadCard,
    handleShareResult,
    viralCardCanvasRef,
  } = useAppContext();
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const handleReset = () => {
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
  };

  return (
    <div className="result-screen">
          


          <div className="result-primary" style={{ padding: '0 20px', paddingBottom: 40 }}>
          {(() => {
            const dayPillar = sajuResult.pillars.day.ganHanja + sajuResult.pillars.day.zhiHanja;
            const myChar = FREE_CHARACTERS.find((c: any) => c.id === dayPillar) || FREE_CHARACTERS[0];
            const top = buildTopScore(sajuResult.scores);
            
            let verdictHeadline = "";
            if (top.axis === 'jobChange') {
              verdictHeadline = "그냥 버티기보다, 조건을 바꿀 가능성을 확인할 때입니다.";
            } else if (top.axis === 'negotiation') {
              verdictHeadline = "무작정 떠나기보다, 현재 위치에서 가치를 협상할 때입니다.";
            } else {
              verdictHeadline = "지금은 무리하게 움직이기보다 현재 자리에서 내실을 다질 때입니다.";
            }

            return (
              <>
                {/* [SECTION 1] Character Hero */}
                <section className="creature-hero" style={{ marginTop: 24, marginBottom: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 128, marginBottom: 8, lineHeight: 1 }}>{myChar.emoji}</div>
                  <strong style={{ fontSize: 30, color: '#fff', display: 'block', marginBottom: 10, lineHeight: 1.3 }}>{myChar.core_type}</strong>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 14 }}>{sajuResult.dayGan.char}{sajuResult.dayGan.element} · {myChar.name}</span>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'keep-all', margin: '0 auto', maxWidth: 280 }}>
                    {myChar.identity.split('. ')[0]}.
                  </p>
                  <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {myChar.keywords.map((kw: string) => (
                      <span key={kw} style={{ background: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: 20, fontSize: 13, color: '#e5e7eb' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </section>

                {/* [SECTION 2] Current Career Verdict */}
                <section style={{ marginBottom: 40, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.12))', padding: '28px 22px', borderRadius: 20, textAlign: 'center', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 8px 30px rgba(168,85,247,0.18)' }}>
                  <span style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>지금의 결론</span>
                  <p style={{ fontSize: 20, color: '#fff', margin: 0, lineHeight: 1.45, wordBreak: 'keep-all', fontWeight: 700 }}>
                    {verdictHeadline}
                  </p>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginTop: 16 }}>
                    {(['negotiation', 'jobChange', 'stay'] as const)
                      .map(key => ({ key, label: key === 'negotiation' ? '협상' : key === 'jobChange' ? '이직' : '잔류', score: sajuResult.scores[key] }))
                      .sort((a, b) => b.score - a.score)
                      .map(a => `${a.label} ${a.score}`)
                      .join(' · ')}
                  </span>
                </section>

                {/* [SECTION 3] Three-Axis Decision Score */}
                <section style={{ marginBottom: 40 }}>
                  <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 20, textAlign: 'center' }}>지금 당신에게 더 맞는 선택은?</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { key: 'jobChange', label: '이직', desc: '외부 기회를 확인하면서 현재 조건과 비교해볼 시기입니다.' },
                      { key: 'negotiation', label: '협상', desc: '연봉·역할·근무 조건을 먼저 요구해볼 가치가 있습니다.' },
                      { key: 'stay', label: '잔류', desc: '현재 조건을 유지하며 때를 기다리는 것이 좋습니다.' }
                    ].map(axis => {
                      const scoreVal = sajuResult.scores[axis.key as keyof typeof sajuResult.scores];
                      const isTop = top.axis === axis.key;
                      return (
                        <div key={axis.key} style={{ background: isTop ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)', border: isTop ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: 16, color: isTop ? 'var(--accent-purple)' : '#e5e7eb' }}>{axis.label}</strong>
                              {isTop && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-pink))', padding: '3px 8px', borderRadius: 20 }}>
                                  현재 1순위
                                </span>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <strong style={{ fontSize: 24, color: '#fff', marginRight: 8 }}>{scoreVal}</strong>
                              {!isTop && (
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{scoreVal > 50 ? '탐색해볼 만함' : '우선순위 낮음'}</span>
                              )}
                            </div>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{axis.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* [SECTION 4] Career DNA */}
                <section style={{ marginBottom: 40 }}>
                  <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 20, textAlign: 'center' }}>당신이 일할 때 강한 방식</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, wordBreak: 'keep-all', margin: '0 0 20px' }}>
                    {myChar.identity}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600, display: 'block', marginBottom: 6 }}>💪 강점</span>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{myChar.strength.split('. ')[0]}.</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--accent-pink)', fontWeight: 600, display: 'block', marginBottom: 6 }}>⚠️ Blind Spot</span>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{myChar.blind_spot.split('. ')[0]}.</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
                      <span style={{ fontSize: 13, color: 'var(--border-neon)', fontWeight: 600, display: 'block', marginBottom: 6 }}>🏢 잘 맞는 환경</span>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{myChar.best_environment.split('. ')[0]}.</p>
                    </div>
                  </div>
                </section>

                {/* [SECTION 5] Share Card CTA (경량화 — 시각적 공유 카드는 하단에서만 보여줌) */}
                <section style={{ marginBottom: 40, textAlign: 'center' }}>
                  <button className="btn-text-only" onClick={handleShareResult} disabled={isShareLoading} style={{ fontSize: 14, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    {isShareLoading ? '공유 준비 중...' : '내 캐릭터 공유하기 ↗'}
                  </button>
                </section>
              </>
            );
          })()}
        </div>

        {/* === LOCKED / UNLOCKED AREA === */}
          <div className="locked-area">
            
            {/* 1. Locked Overlay (Only shown when not unlocked) */}
            {!isUnlocked && (() => {
              // dominantMode: 무료 3축 점수 중 최고점 축. buildTopScore의 기존 tie-break(AXIS_ORDER 순회 · 동점 시 선행값 유지)를 그대로 재사용한다.
              const dominantMode = buildTopScore(sajuResult.scores).axis as DominantMode;
              const pw = PAYWALL_COPY[dominantMode];
              return (
              <div className="unlock-overlay" style={{ position: 'relative', background: 'transparent' }}>
                <div className="unlock-card paywall-teaser" style={{ padding: '0 20px', background: 'transparent', border: 'none' }}>

                  {/* 무료 결과 → Paywall bridge 문장 */}
                  <div style={{ textAlign: 'center', marginBottom: 28, padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 14 }}>
                    <p style={{ fontSize: 14, color: '#e5e7eb', lineHeight: 1.6, wordBreak: 'keep-all', margin: 0 }}>
                      {pw.bridgeLines.map((line, i) => (
                        <span key={line}>{line}{i < pw.bridgeLines.length - 1 && <br />}</span>
                      ))}
                    </p>
                  </div>

                  {/* [SECTION 6] Timing Paywall Transition */}
                  <div className="teaser-header" style={{ textAlign: 'center', marginBottom: 32 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>여기까지는 무료</span>
                    <span style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 700, display: 'block', marginBottom: 12 }}>{pw.eyebrow}</span>
                    <h3 style={{ fontSize: 24, color: '#fff', marginBottom: 16, lineHeight: 1.4 }}>
                      "{pw.headlineLines.map((line, i) => (
                        <span key={line}>{line}{i < pw.headlineLines.length - 1 && <br />}</span>
                      ))}"
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'keep-all' }}>
                      {pw.subcopyLines.map((line, i) => (
                        <span key={line}>{line}{i < pw.subcopyLines.length - 1 && <br />}</span>
                      ))}
                    </p>
                  </div>

                  {/* [SECTION 7] Locked Timing Preview */}
                  <div className="locked-preview-list" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                    {pw.lockedItems.map(item => (
                      <div key={item.title} className="locked-preview-item" style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 15, color: '#e5e7eb' }}>{item.icon} {item.title}</span>
                          <span style={{ fontSize: 11, color: 'var(--accent-purple)', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.lockLabel}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, wordBreak: 'keep-all' }}>{item.hint}</p>
                      </div>
                    ))}
                  </div>

                  {/* [SECTION 8] Paid Benefits */}
                  <div style={{ marginBottom: 32, padding: 20, background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.05))', borderRadius: 16, border: '1px solid rgba(168,85,247,0.2)' }}>
                    <h4 style={{ fontSize: 16, color: '#fff', marginBottom: 16, textAlign: 'center' }}>8,900원으로 확인하는 것</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <li style={{ fontSize: 14, color: '#e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--accent-purple)' }}>✓</span> {pw.benefit1}</li>
                      <li style={{ fontSize: 14, color: '#e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--accent-purple)' }}>✓</span> 연봉·직급·역할 협상 타이밍</li>
                      <li style={{ fontSize: 14, color: '#e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--accent-purple)' }}>✓</span> 앞으로 12개월 이직 / 협상 / 잔류 흐름</li>
                      <li style={{ fontSize: 14, color: '#e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--accent-purple)' }}>✓</span> 현재 고민에 맞춘 행동 전략</li>
                      <li style={{ fontSize: 14, color: '#e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 8 }}><span style={{ color: 'var(--accent-purple)' }}>✓</span> 조심해야 할 시기와 확인할 조건</li>
                    </ul>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center', lineHeight: 1.5, wordBreak: 'keep-all' }}>
                      "생년월일만으로 만든 일반 운세가 아니라<br/>현재 직무와 고민까지 함께 반영해 해석합니다."
                    </p>
                  </div>

                  {/* [SECTION 9] Main Purchase CTA */}
                  <div style={{ marginBottom: 24 }}>
                    <span style={{ display: 'block', textAlign: 'center', fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600, marginBottom: 10 }}>
                      12개월 전체 타이밍 열기
                    </span>
                    <button className="btn-primary" onClick={() => setShowManualPayModal(true)} style={{ width: '100%', padding: '20px', fontSize: 18, fontWeight: 700, marginBottom: 8, boxShadow: '0 8px 28px rgba(168,85,247,0.55)' }}>
                      {pw.ctaPrimary} · 8,900원
                    </button>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                      결제 후 바로 확인 · 12개월 전체 리포트
                    </p>
                  </div>

                  {/* [SECTION 10] Trust / Friction Reduction */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>🔓</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>로그인 없이<br/>확인</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>⚡</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>결제 후<br/>즉시 생성</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>🔄</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>언제든 다시<br/>열람 가능</span>
                    </div>
                  </div>

                  {/* [SECTION 11] Secondary Share */}
                  <div style={{ marginBottom: 40, textAlign: 'center', padding: '24px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 16 }}>
                    <p style={{ fontSize: 14, color: '#e5e7eb', marginBottom: 8 }}>아직 결제할지는 모르겠다면?</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>내 캐릭터만 친구에게 보내보세요.</p>
                    <button className="btn-secondary share-btn" onClick={handleShareResult} disabled={isShareLoading} style={{ width: '100%', fontSize: 14, padding: '12px' }}>
                      {isShareLoading ? '준비 중...' : '결과 공유하고 할인받기'}
                    </button>
                  </div>

                  {/* [SECTION 12] Restart */}
                  <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <button className="btn-text-only" onClick={handleReset} style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      다른 생년월일로 다시 보기
                    </button>
                  </div>

                </div>
              </div>
              );
            })()}

            {/* 2. Content Area (구매 완료 후에만 렌더링 — 잠금 상태에서는 블러 미리보기 대신 위 paywall로 설명을 끝냄) */}
            {isUnlocked && (() => {
              const report = aiReport?.report;
              const th = report?.timing_highlights;
              const formatYm = (ym?: string) => {
                if (!ym || !ym.includes('-')) return ym || '';
                const [y, m] = ym.split('-');
                return `${y}년 ${parseInt(m, 10)}월`;
              };
              const nowYm = new Date().toISOString().slice(0, 7);
              const roadmapSteps = th
                ? ([
                    { ym: th.best_job_change?.year_month, phase: '이직 집중', detail: th.best_job_change?.action, color: 'var(--accent-pink)' },
                    { ym: th.best_negotiation?.year_month, phase: '협상', detail: th.best_negotiation?.action, color: 'var(--accent-purple)' },
                    { ym: th.caution_month?.year_month, phase: '신중 관망', detail: th.caution_month?.action, color: '#ef4444' },
                  ].filter(s => s.ym) as { ym: string; phase: string; detail: string; color: string }[])
                    .sort((a, b) => a.ym.localeCompare(b.ym))
                : [];
              const dayPillar = sajuResult.pillars.day.ganHanja + sajuResult.pillars.day.zhiHanja;
              const myChar = FREE_CHARACTERS.find((c: any) => c.id === dayPillar) || FREE_CHARACTERS[0];

              return (
            <div className="report-details">

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
              {report && (
                <>
                  {/* [SECTION 1] Paid Report Hero / 12개월 핵심 결론 */}
                  {report.report_summary && (
                    <section className="glass-card" style={{ textAlign: 'center', marginBottom: 20, padding: '28px 20px', background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(236,72,153,0.14))', border: '1px solid rgba(168,85,247,0.4)' }}>
                      <span style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 10 }}>당신의 다음 12개월</span>
                      <h3 style={{ fontSize: 21, lineHeight: 1.5, color: '#fff', margin: '0 0 18px', wordBreak: 'keep-all' }}>{report.report_summary.headline}</h3>
                      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px', textAlign: 'left' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>지금 가장 먼저 할 일</span>
                        <strong style={{ fontSize: 15, color: '#fde68a', lineHeight: 1.5 }}>💡 {report.report_summary.one_line_action}</strong>
                      </div>
                    </section>
                  )}

                  {/* [SECTION 2] 3대 핵심 타이밍 */}
                  {th && (
                    <section className="glass-card premium-section" style={{ marginBottom: 20 }}>
                      <span className="eyebrow">가장 중요한 3개의 시기</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        {th.best_job_change && (
                          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <strong style={{ fontSize: 14, color: 'var(--accent-pink)' }}>🔥 가장 좋은 이직 시기</strong>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatYm(th.best_job_change.year_month)}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>이직운 {th.best_job_change.score}</div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px', wordBreak: 'keep-all' }}>{th.best_job_change.reason}</p>
                            <span style={{ fontSize: 12, color: '#fde68a', fontWeight: 600 }}>👉 {th.best_job_change.action}</span>
                          </div>
                        )}
                        {th.best_negotiation && (
                          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <strong style={{ fontSize: 14, color: 'var(--accent-purple)' }}>💰 가장 좋은 협상 시기</strong>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatYm(th.best_negotiation.year_month)}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>협상운 {th.best_negotiation.score}</div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px', wordBreak: 'keep-all' }}>{th.best_negotiation.reason}</p>
                            <span style={{ fontSize: 12, color: '#fde68a', fontWeight: 600 }}>👉 {th.best_negotiation.action}</span>
                          </div>
                        )}
                        {th.caution_month && (
                          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <strong style={{ fontSize: 14, color: '#ef4444' }}>⚠️ 가장 조심해야 하는 시기</strong>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatYm(th.caution_month.year_month)}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 8px', wordBreak: 'keep-all' }}>{th.caution_month.reason}</p>
                            <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 600 }}>👉 {th.caution_month.action}</span>
                            {(th.caution_month.year_month === th.best_job_change?.year_month || th.caution_month.year_month === th.best_negotiation?.year_month) && (
                              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>* 기회와 리스크가 함께 큰 달입니다. 서두르되 조건은 반드시 확인하세요.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* [SECTION 3] 행동 로드맵 */}
                  {roadmapSteps.length > 0 && (
                    <section className="glass-card" style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 14 }}>지금부터 이렇게 움직이세요</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {roadmapSteps.map((stepItem, i) => (
                          <div key={stepItem.ym + stepItem.phase} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ minWidth: 56, textAlign: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block' }}>{stepItem.ym}</span>
                              <span style={{ width: 8, height: 8, borderRadius: 99, background: stepItem.color, display: 'inline-block', marginTop: 4 }} />
                            </div>
                            <div style={{ flex: 1, paddingBottom: i < roadmapSteps.length - 1 ? 10 : 0, borderBottom: i < roadmapSteps.length - 1 ? '1px dashed rgba(255,255,255,0.08)' : 'none' }}>
                              <strong style={{ fontSize: 13, color: stepItem.color, display: 'block', marginBottom: 2 }}>{stepItem.phase}</strong>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{stepItem.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* [SECTION 4] 당신의 고민에 대한 답 */}
                  {report.personalized_advice && (
                    <section className="glass-card premium-section" style={{ marginBottom: 20 }}>
                      <span className="eyebrow">당신의 고민에 대한 답</span>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '10px 0 12px' }}><strong>Q.</strong> {report.personalized_advice.question_summary}</p>
                      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <p style={{ fontSize: 15, lineHeight: 1.6, color: '#f3f4f6', margin: 0, wordBreak: 'keep-all' }}>{report.personalized_advice.diagnosis}</p>
                      </div>
                      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}>
                        <span style={{ fontSize: 11, color: 'var(--accent-purple)', fontWeight: 700, display: 'block', marginBottom: 4 }}>추천 방향</span>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#e5e7eb', margin: 0, wordBreak: 'keep-all' }}>{report.personalized_advice.recommendation}</p>
                      </div>
                    </section>
                  )}

                  {/* [SECTION 5] 12개월 커리어 타임라인 (compact + expand) */}
                  {report.timeline && (
                    <section className="glass-card" style={{ marginBottom: 20, textAlign: 'left' }}>
                      <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 14 }}>앞으로 12개월 커리어 흐름</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {report.timeline.map((item: any) => {
                          const isBestJob = th?.best_job_change?.year_month === item.year_month;
                          const isBestNego = th?.best_negotiation?.year_month === item.year_month;
                          const isCaution = th?.caution_month?.year_month === item.year_month;
                          const isCurrent = item.year_month === nowYm;
                          const isOpen = expandedMonths.includes(item.year_month);
                          const badge = isBestJob ? 'BEST MOVE' : isBestNego ? 'BEST DEAL' : isCaution ? 'CAUTION' : null;
                          const badgeColor = isBestJob ? 'var(--accent-pink)' : isBestNego ? 'var(--accent-purple)' : '#ef4444';
                          return (
                            <div key={item.year_month} style={{
                              padding: 14, borderRadius: 12,
                              background: isCurrent ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                              border: badge ? `1px solid ${badgeColor}` : isCurrent ? '1px solid var(--accent-purple)' : '1px solid rgba(255,255,255,0.05)',
                              boxShadow: badge ? `0 0 16px ${badgeColor}33` : 'none',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <strong style={{ fontSize: 14, color: '#f3f4f6' }}>{formatYm(item.year_month)}</strong>
                                  {isCurrent && <span style={{ fontSize: 10, color: 'var(--accent-purple)' }}>· 이번 달</span>}
                                </div>
                                {badge && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: badgeColor, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>{badge}</span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0' }}>
                                {item.keyword} · 이직 {item.scores?.job_change ?? 0} · 협상 {item.scores?.negotiation ?? 0} · 잔류 {item.scores?.stay ?? 0}
                              </div>
                              <p style={{
                                fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, wordBreak: 'keep-all',
                                ...(isOpen ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }),
                              }}>
                                {item.summary}
                              </p>
                              {isOpen && (
                                <p style={{ fontSize: 13, color: '#d1d5db', marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>✅ {item.action}</p>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedMonths(prev => prev.includes(item.year_month) ? prev.filter(m => m !== item.year_month) : [...prev, item.year_month])}
                                style={{ marginTop: 6, fontSize: 11, color: 'var(--accent-purple)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                              >
                                {isOpen ? '접기 ▲' : '자세히 보기 ▼'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* [SECTION 6] Character Connection (축소된 보조 카드) */}
                  {report.personalized_advice?.character_connection && (
                    <div className="glass-card" style={{ marginBottom: 20, padding: 14, display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left' }}>
                      <div style={{ fontSize: 26, flexShrink: 0 }}>{myChar.emoji}</div>
                      <div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>왜 이런 선택이 당신에게 잘 맞나</span>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, wordBreak: 'keep-all' }}>{report.personalized_advice.character_connection}</p>
                      </div>
                    </div>
                  )}

                  {/* [SECTION 7] Action Steps / Watch Out */}
                  {report.personalized_advice && (
                    <section className="glass-card" style={{ marginBottom: 20, textAlign: 'left' }}>
                      <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 12 }}>지금 해야 할 {report.personalized_advice.action_steps.length}가지</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                        {report.personalized_advice.action_steps.map((item: string) => (
                          <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, color: '#e5e7eb' }}>
                            <span>☐</span><span style={{ lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <strong style={{ fontSize: 13, color: '#f87171', display: 'block', marginBottom: 8 }}>이건 꼭 조심하세요</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {report.personalized_advice.watch_out.map((item: string) => (
                            <span key={item} style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>⚠️ {item}</span>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {aiReport.closing_advice && (
                    <section className="closing-card">
                      <span className="eyebrow">{REPORT_HEADINGS.closing}</span>
                      <p>{aiReport.closing_advice}</p>
                    </section>
                  )}
                </>
              )}

              {/* [SECTION 8] 3축 전체 흐름 시각화 (보조 정보 — 핵심 결론보다 항상 아래) */}
              <div className="glass-card" style={{ marginTop: report ? 4 : 0 }}>
                  <h3 style={{ fontSize: 15, color: '#fff', marginBottom: 12, textAlign: 'left' }}>{REPORT_HEADINGS.elementProfile}</h3>

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
              );
            })()}

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
                    <button
                      className="btn-primary"
                      style={{ marginTop: 10 }}
                      onClick={() => {
                        void (async () => {
                          const sent = await handleFollowUpSubmit(followUpInput);
                          if (sent) setFollowUpInput('');
                        })();
                      }}
                    >
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

          {/* 다시 보기 링크 */}
          <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
            <button className="btn-text-only" onClick={handleReset} style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'underline', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              다른 생년월일로 다시 보기
            </button>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, margin: '4px 0 8px' }}>
            본 결과는 명리학을 바탕으로 한 참고 자료이며, 오락과 자기 성찰 목적으로 제공됩니다.<br />
            이직·퇴사 등 중요한 결정은 반드시 현실 조건을 함께 검토해 주세요.
          </p>
        </div>
  );
}
