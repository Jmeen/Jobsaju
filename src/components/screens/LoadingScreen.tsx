
import { useAppContext } from '../../contexts/AppContext';
import { WheelColumn } from '../../contexts/AppContext'; // Wait, WheelColumn is not exported, we'll fix this


import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';

import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';




export function LoadingScreen() {
  const {
    step,
    birthData,
    careerContext,
    sajuResult,
    isUnlocked,
    isAILoading,
    unlockLoadingText,
    unlockError,
    aiReport,
    showManualPayModal,
    savedSession,
    showLookupModal,
    isLookupLoading,
    lookupError,
    lookupSentMessage,
    reportHistory,
    deepLinkError,
    appliedCoupon,
    couponMessage,
    couponError,
    isCouponChecking,
    showSecretCoupon,
    secretClickCount,
    followUps,
    shareBonusGranted,
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
    setIsAILoading,
    setUnlockLoadingText,
    setUnlockError,
    setAiReport,
    setShowManualPayModal,
    setSavedSession,
    setShowLookupModal,
    setIsLookupLoading,
    setLookupError,
    setLookupSentMessage,
    setReportHistory,
    setDeepLinkError,
    setAppliedCoupon,
    setCouponMessage,
    setCouponError,
    setIsCouponChecking,
    setShowSecretCoupon,
    setSecretClickCount,
    setFollowUps,
    setShareBonusGranted,
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
    <div className="analysis-loading">
          <div className="analysis-pulse"><span /></div>
          <span className="eyebrow">커리어 흐름 분석 중</span>
          <h2>{copy.loadingTitle.map((line: any, i: any) => (
            <span key={line}>{i > 0 && <br />}{line}</span>
          ))}</h2>
          <p>{loadingText}</p>
          <div className="loading-track"><span /></div>
        </div>
  );
}
