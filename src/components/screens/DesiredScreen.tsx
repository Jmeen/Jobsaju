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


export function DesiredScreen() {
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>나의 커리어 프로필과 상세 고민</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
              구체적으로 적어주실수록 입력한 상황과 운의 흐름을 함께 반영해 더 세밀하게 분석합니다. (선택사항)
            </p>
          </div>

          <div className="glass-card" style={{ padding: '22px 18px', marginBottom: 20 }}>
            {/* 현재 하고 계신 일 */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>현재 하시는 일 (직무 및 연차)</label>
              <input
                type="text"
                className="input-text"
                placeholder="예: 6년차 풀스택 소프트웨어 엔지니어"
                value={careerContext.current_job}
                onChange={e => setCareerContext({ ...careerContext, current_job: e.target.value })}
              />
            </div>

            {/* 최종 커리어의 골 */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>최종 커리어 목표 (도달하고 싶은 지향점)</label>
              <input
                type="text"
                className="input-text"
                placeholder="예: 나만의 B2B SaaS 스타트업 창업 및 운영"
                value={careerContext.career_goal}
                onChange={e => setCareerContext({ ...careerContext, career_goal: e.target.value })}
              />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                지금의 목표를 구체적으로 적을수록 그 목표에 맞춰 더 자세하고 맞춤화된 분석을 받을 수 있어요.
              </p>
            </div>

            {/* 상세 고민 */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>현재 상황이나 구체적인 고민 정황</label>
              <textarea
                className="input-text"
                rows={4}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  minHeight: 96,
                  fontFamily: 'inherit',
                  padding: '12px 14px',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: '#fff'
                }}
                placeholder="예: 이번에 이직 제안을 한 곳이 있는데 연봉 조율을 세게 해도 괜찮은 운세인지 궁금해요. 혹은 지금 상사와의 갈등 때문에 충동적으로 퇴사하고 싶은데 버티는 게 답일까요?"
                value={careerContext.desired_answer}
                onChange={e => setCareerContext({ ...careerContext, desired_answer: e.target.value })}
              />
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.45 }}>
                지금 처한 상황을 구체적으로 적을수록 그 상황에 맞춰 더 자세하고 맞춤화된 분석을 받을 수 있어요.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setStep('q_concern')}>이전</button>
            <button 
              className="btn-primary" style={{ flex: 2 }} 
              onClick={() => setStep('loading')}
            >결과 확인하기</button>
          </div>
        </div>
  );
}
