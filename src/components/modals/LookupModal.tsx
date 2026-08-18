
import { useState } from 'react';
import { useAppReport, useAppActions } from '../../contexts/AppContext';
import { CHECKOUT_COPY, runCheckoutAction } from '../../utils/checkoutPresentation';


export function LookupModal() {
  const {
    isLookupLoading,
    lookupError,
    lookupSentMessage,
  } = useAppReport();
  const {
    lookupEmailDraftRef,
    setShowLookupModal,
    setLookupError,
    setLookupSentMessage,
    handleEmailLookup,
  } = useAppActions();

  // 모달이 닫혔다 다시 열려도 입력값이 남도록 초안 ref에서 시작한다.
  const [lookupEmailInput, setLookupEmailInputLocal] = useState(lookupEmailDraftRef.current);
  const setLookupEmailInput = (next: string) => {
    lookupEmailDraftRef.current = next;
    setLookupEmailInputLocal(next);
  };

  return (
    <div style={{
          position: 'fixed', inset: 0, background: 'rgba(47,55,50,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: 420, background: 'var(--jg-page, #faf8f2)', border: '1px solid var(--jg-line, #ddd8cd)',
            boxShadow: '0 18px 50px rgba(31,48,38,.18)', padding: 24, borderRadius: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, color: 'var(--jg-ink, #2f3732)' }}>구매한 리포트 찾기</h3>
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer' }}
                onClick={() => { setShowLookupModal(false); setLookupSentMessage(null); setLookupError(null); }}
              >✕</button>
            </div>

            {lookupSentMessage ? (
              <div role="status" style={{ fontSize: 13, color: '#4ade80', lineHeight: 1.6, padding: '8px 0' }}>
                {lookupSentMessage}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                  {CHECKOUT_COPY.lookupDescription} 입력하신 이메일로 리포트 열람 링크를 보내드려요 — 그 메일함을 열 수 있는 분만 다시 볼 수 있어요.
                </p>

                <div className="form-group">
                  <label className="form-label">결제 이메일 주소</label>
                  <input
                    type="email" className="input-text" placeholder="yourname@gmail.com"
                    value={lookupEmailInput} onChange={e => setLookupEmailInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void handleEmailLookup(lookupEmailInput); }}
                  />
                </div>

                {lookupError && (
                  <div role="alert" className="unlock-error" style={{ marginBottom: 16 }}>
                    <span>{lookupError}</span>
                  </div>
                )}

                <button
                  className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 14 }}
                  onClick={() => void handleEmailLookup(lookupEmailInput)} disabled={isLookupLoading}
                >
                  {isLookupLoading ? '링크를 보내는 중...' : CHECKOUT_COPY.lookupButton}
                </button>
              </>
            )}
          </div>
        </div>
  );
}
