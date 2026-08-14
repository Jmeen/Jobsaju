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


export function IntroScreen() {
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
    <div className="intro-screen">
          <div className="intro-brand"><span>커리어 사주</span></div>
          <div className="intro-content">
            <span className="eyebrow">{copy.eyebrow}</span>
            <h1>{copy.headline.map((line, i) => (
              <span key={line}>{i > 0 && <br />}{line}</span>
            ))}</h1>
            <p>{copy.subcopy.map((line, i) => (
              <span key={line}>{i > 0 && <br />}{line}</span>
            ))}</p>
            <div className="intro-proof">
              {copy.proof.map(item => (
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
