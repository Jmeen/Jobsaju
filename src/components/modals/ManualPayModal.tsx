
import { useState } from 'react';
import { useAppCheckout, useAppActions } from '../../contexts/AppContext';
import { CHECKOUT_COPY, runCheckoutAction } from '../../utils/checkoutPresentation';


export function ManualPayModal() {
  const {
    isAILoading,
    unlockLoadingText,
    unlockError,
    appliedCoupon,
    couponMessage,
    couponError,
    isCouponChecking,
    showSecretCoupon,
    checkout,
    price,
  } = useAppCheckout();
  const {
    emailDraftRef,
    couponDraftRef,
    setShowManualPayModal,
    setCouponError,
    setShowSecretCoupon,
    handleUnlock,
    handleApplyCoupon,
  } = useAppActions();

  // 결제 모달을 닫았다 다시 열어도 입력값이 남도록 초안 ref에서 시작한다.
  // (컨텍스트 state로 두면 한 글자마다 결과 화면 전체가 다시 그려진다)
  const [emailInput, setEmailInputLocal] = useState(emailDraftRef.current);
  const setEmailInput = (next: string) => {
    emailDraftRef.current = next;
    setEmailInputLocal(next);
  };
  const [couponInput, setCouponInputLocal] = useState(couponDraftRef.current);
  const setCouponInput = (next: string) => {
    couponDraftRef.current = next;
    setCouponInputLocal(next);
  };

  return (
    <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(47,55,50,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 100, padding: 20
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: 400, background: 'var(--jg-page, #faf8f2)', border: '1px solid var(--jg-line, #ddd8cd)',
            boxShadow: '0 18px 50px rgba(31,48,38,.18)', padding: 24, borderRadius: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 
                  style={{ 
                    fontSize: 18, 
                    color: 'var(--jg-ink, #2f3732)', 
                    margin: 0,
                  }}
                >
                  {CHECKOUT_COPY.title} {appliedCoupon ? <span style={{ color: '#3f8f5f', fontSize: 15 }}>({appliedCoupon.discountPercent === 100 ? '0원 무료 적용' : `${appliedCoupon.discountPercent}% 할인 적용`})</span> : `(${price.label})`}
                </h3>
              </div>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}
                onClick={() => {
                  setShowManualPayModal(false);
                }}
              >✕</button>
            </div>

            {isAILoading ? (
              // 리포트 생성이 수십 초 걸릴 수 있어, 진행 중임을 계속 보여주고 창을 닫아도 완료 시 알려준다
              <div className="unlock-loading">
                <div className="unlock-loading-spinner" />
                <p>{unlockLoadingText}</p>
                <div className="loading-track"><span /></div>
                <small style={{ lineHeight: 1.5, display: 'block', marginTop: 10 }}>
                  💡 이 창을 닫으셔도 AI 분석은 백그라운드에서 계속 진행되며,<br />
                  완료 시 입력하신 <strong>{emailInput || '이메일'}</strong>로 안전하게 보관 및 열람 링크가 전달됩니다.
                </small>
              </div>
            ) : (
              <>
                {/* Email Input (결제 유실 복구 및 알림용) */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">이메일 주소 <span style={{ color: 'var(--accent-purple)', fontSize: 12 }}>(완성 알림 및 분실 복구용)</span></label>
                  <input
                    type="email" className="input-text" placeholder="yourname@gmail.com"
                    value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  />
                  {!showSecretCoupon && !appliedCoupon && (
                    <button
                      type="button"
                      onClick={() => setShowSecretCoupon(true)}
                      style={{
                        display: 'block', marginTop: 8, padding: 0, border: 0,
                        background: 'transparent', color: 'var(--jg-muted, #858b83)',
                        fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
                      }}
                    >
                      프로모 코드가 있나요?
                    </button>
                  )}
                </div>

                {/* 프로모 코드 링크를 누르거나 이미 적용된 경우에만 입력칸을 연다. */}
                {(showSecretCoupon || appliedCoupon) && (
                  <div style={{ 
                    background: 'rgba(168, 85, 247, 0.08)', 
                    padding: 14, 
                    borderRadius: 12, 
                    border: '1px dashed var(--accent-purple)', 
                    marginBottom: 16,
                    animation: 'fadeIn 0.25s ease-out'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ fontSize: 12, marginBottom: 0, color: 'var(--accent-purple)', fontWeight: 600 }}>
                        🎟️ 시크릿 프로모션 쿠폰
                      </label>
                      <button
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setShowSecretCoupon(false)}
                      >
                        숨기기
                      </button>
                    </div>
                    <div className="coupon-code-row">
                      <input
                        type="text"
                        className="input-text coupon-code-input"
                        placeholder="발급받은 쿠폰 코드를 입력하세요"
                        value={couponInput}
                        disabled={isCouponChecking}
                        onChange={e => {
                          setCouponInput(e.target.value);
                          setCouponError(null);
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') void handleApplyCoupon(couponInput); }}
                        style={{ fontSize: 13, textTransform: 'uppercase' }}
                        autoFocus
                      />
                      <button
                        className="btn-secondary coupon-apply-button"
                        onClick={() => void handleApplyCoupon(couponInput)}
                        disabled={isCouponChecking}
                      >
                        {isCouponChecking ? '확인 중...' : '적용'}
                      </button>
                    </div>

                    {couponMessage && (
                      <p role="status" className="coupon-notice coupon-notice-success">
                        {couponMessage}
                      </p>
                    )}
                    {couponError && (
                      <p role="alert" className="coupon-notice coupon-notice-error">
                        {couponError}
                      </p>
                    )}
                  </div>
                )}

                {/* 결제 / 해금 버튼 */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', marginBottom: 10, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>최종 결제 금액</span>
                    <span style={{ fontSize: 16, fontWeight: 'bold', color: appliedCoupon ? '#3f8f5f' : 'var(--jg-ink, #2f3732)' }}>
                      {checkout.originalLabel && (
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12, marginRight: 6 }}>
                          {checkout.originalLabel}
                        </span>
                      )}
                      {checkout.finalLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={appliedCoupon
                        ? { padding: 13, fontSize: 14, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 0 15px rgba(16,185,129,0.4)' }
                        : { padding: 12, fontSize: 13, boxShadow: 'none' }}
                      onClick={() => runCheckoutAction(checkout.action, () => { void handleUnlock(emailInput); })}
                    >
                      {checkout.buttonLabel}
                    </button>

                    {unlockError && (
                      <div role="alert" className="unlock-error">
                        <span>{unlockError}</span>
                        <small>입력 내용은 그대로 유지됩니다. 서버 설정을 확인한 뒤 다시 눌러주세요.</small>
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4, textAlign: 'center' }}>
                      {appliedCoupon ? (
                        appliedCoupon.discountPercent === 100
                          ? '100% 할인 쿠폰이 적용된 상태입니다.'
                          : `${appliedCoupon.discountPercent}% 할인 적용 · ${checkout.finalLabel} 결제`
                      ) : (
                        <span>
                          안전하고 간편한 결제가 지원됩니다.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
  );
}
