// 목업 6번 화면 — 유료 전환.
// 점수 자체가 아니라 비교·근거·타이밍·행동을 판다. 숫자는 흐릿하게만 보여준다.
import { useAppActions, useAppCheckout, useAppReport } from '../../contexts/AppContext';
import { buildMonthlyFlow } from '../../utils/monthlyFlow';

/** "9월 [평가·승진 어필]" 형태의 배지 문구에서 대괄호 안만 뽑는다. */
function phraseOf(label: string): string {
  const match = label.match(/\[(.+)\]/);
  return match ? match[1] : label;
}

const OPEN_MONTH_COUNT = 2;

export function PaywallScreen() {
  const { guardian, sajuResult } = useAppReport();
  const { price } = useAppCheckout();
  const { setStep, setShowManualPayModal } = useAppActions();

  if (!guardian || !sajuResult) return null;

  const natalZhis = [
    sajuResult.pillars.year.zhi,
    sajuResult.pillars.month.zhi,
    sajuResult.pillars.day.zhi,
    sajuResult.pillars.hour.zhi,
  ].filter(Boolean);
  const months = buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 6);

  return (
    <section className="jg-screen">
      <div className="jg-kicker">{guardian.nickname}가 세 가지 길을 비교해봤어요</div>
      <h1 className="jg-title">지금 나에게 가장 유리한 선택은?</h1>

      <div className="jg-preview">
        <div className="jg-preview-title">
          <strong>세 가지 선택 비교</strong>
          <span className="jg-lock">상세 리포트에서 공개돼요</span>
        </div>
        <div className="jg-scores">
          <div className="jg-score"><span>🚪 이직</span><b>{sajuResult.scores.jobChange}점</b></div>
          <div className="jg-score"><span>💰 협상</span><b>{sajuResult.scores.negotiation}점</b></div>
          <div className="jg-score"><span>🪑 잔류</span><b>{sajuResult.scores.stay}점</b></div>
        </div>
      </div>

      <ul className="jg-paid-list">
        <li>왜 이런 점수가 나왔는지</li>
        <li>나에게 맞는 회사 · 역할 · 조건</li>
        <li>앞으로 6개월, 언제 움직이면 좋은지</li>
        <li>실수하지 않기 위한 행동 가이드</li>
        <li>내 직무 · 목표 · 지금 상황까지 반영</li>
      </ul>

      <div className="jg-roadmap">
        <h2>앞으로 6개월 커리어 흐름</h2>
        {months.map((month, index) => {
          const locked = index >= OPEN_MONTH_COUNT;
          return (
            <div className={`jg-roadmap-row ${locked ? 'is-locked' : ''}`} key={`${month.year}-${month.month}`}>
              <strong>{month.month}월</strong>
              <span>{phraseOf(month.label)}</span>
              <span>{locked ? '🔒' : '공개'}</span>
            </div>
          );
        })}
        <p>월별로 이직 · 협상 · 잔류 중 어디에 힘을 줄지 알려드려요.</p>
      </div>

      <div className="jg-followup">
        <h2>정해진 리포트만 보는 게 아니에요</h2>
        <strong className="jg-followup-lead">내 상황을 딱 하나 더 물어보세요</strong>
        <p>“9월에 오퍼가 오면 옮기는 게 좋을까요?”</p>
        <p>“지금 연봉보다 직급을 먼저 요구해야 할까요?”</p>
        <p>“올해 안에 이직하지 않으면 기다리는 게 나을까요?”</p>
      </div>

      <p className="jg-product-summary">3가지 선택 비교 · 6개월 타이밍 · 내 상황 맞춤 답변</p>
      <button className="jg-btn" type="button" onClick={() => setShowManualPayModal(true)}>
        내 커리어 선택 리포트 열기 · {price.label}
      </button>
      <button className="jg-text-link" type="button" onClick={() => setStep('concern')}>
        다른 고민 먼저 보기
      </button>
    </section>
  );
}
