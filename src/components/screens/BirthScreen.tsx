
import { useAppContext } from '../../contexts/AppContext';
import { WheelColumn, CURRENT_YEAR, WHEEL_YEARS, WHEEL_MONTHS, WHEEL_HOURS, WHEEL_MINUTES, daysInMonth } from '../../contexts/AppContext';


import { buildTopScore, buildAllScoreViews, AXIS_ICON } from '../../utils/scorePresentation';
import { buildCharacterTypeLabel, REPORT_HEADINGS } from '../../utils/reportCopy';
import { buildVerdictView, buildScoreBars } from '../../utils/reportViewModel';

import { buildElementInsight, buildCharacterName } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';




export function BirthScreen() {
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 28 }}>
            <h2>출생 정보 입력</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>정통 만세력 계산을 위해 태어난 일시를 입력해 주세요.</p>
          </div>

          <div className="glass-card" style={{ padding: '20px 16px', marginBottom: 20 }}>
            {/* 성별 및 양음력 선택 (가로 2단 나란히 배치로 공간 극대화) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>성별 (대운용)</label>
                <div className="tab-group" style={{ marginBottom: 0, padding: 3 }}>
                  <button 
                    className={`tab-button ${birthData.gender === 1 ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, gender: 1 })}
                  >남성</button>
                  <button 
                    className={`tab-button ${birthData.gender === 0 ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, gender: 0 })}
                  >여성</button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 6 }}>양력 / 음력</label>
                <div className="tab-group" style={{ marginBottom: 0, padding: 3 }}>
                  <button 
                    className={`tab-button ${birthData.isSolar ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, isSolar: true })}
                  >양력</button>
                  <button 
                    className={`tab-button ${!birthData.isSolar ? 'active' : ''}`}
                    style={{ padding: '8px 4px', fontSize: 13 }}
                    onClick={() => setBirthData({ ...birthData, isSolar: false })}
                  >음력</button>
                </div>
              </div>
            </div>

            {/* 생년월일 */}
            <div className="form-group">
              <label className="form-label">생년월일</label>
              <div className="wheel-row">
                <WheelColumn
                  values={WHEEL_YEARS}
                  value={parseInt(birthData.year) || CURRENT_YEAR}
                  onChange={v => setBirthData((prev: any) => ({ ...prev, year: String(v) }))}
                  formatValue={v => `${v}년`}
                  ariaLabel="출생 연도"
                />
                <WheelColumn
                  values={WHEEL_MONTHS}
                  value={parseInt(birthData.month) || 1}
                  onChange={v => setBirthData((prev: any) => ({ ...prev, month: String(v) }))}
                  formatValue={v => `${v}월`}
                  ariaLabel="출생 월"
                />
                <WheelColumn
                  values={wheelDays}
                  value={Math.min(parseInt(birthData.day) || 1, wheelDayCount)}
                  onChange={v => setBirthData((prev: any) => ({ ...prev, day: String(v) }))}
                  formatValue={v => `${v}일`}
                  ariaLabel="출생 일"
                />
              </div>
            </div>

            {/* 출생시간 유무 */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>태어난 시간</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox" checked={!birthData.hasTime}
                    onChange={e => setBirthData({ ...birthData, hasTime: !e.target.checked })}
                  />
                  태어난 시간 모름 (삼주 분석)
                </label>
              </div>

              {birthData.hasTime && (
                <div className="wheel-row wheel-row-2">
                  <WheelColumn
                    values={WHEEL_HOURS}
                    value={parseInt(birthData.hour) || 0}
                    onChange={v => setBirthData((prev: any) => ({ ...prev, hour: String(v) }))}
                    formatValue={v => `${v}시`}
                    ariaLabel="출생 시"
                  />
                  <WheelColumn
                    values={WHEEL_MINUTES}
                    value={parseInt(birthData.minute) || 0}
                    onChange={v => setBirthData((prev: any) => ({ ...prev, minute: String(v) }))}
                    formatValue={v => `${v}분`}
                    ariaLabel="출생 분"
                  />
                </div>
              )}
            </div>
          </div>

          {birthError && (
            <p style={{ color: '#e08a7a', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{birthError}</p>
          )}
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <button className="btn-primary" disabled={!!birthError} onClick={() => setStep('q_status')}>다음 단계</button>
          </div>
        </div>
  );
}
