// 목업 6번 화면 — 유료 전환.
// "더 자세히 보기(정보량을 더 사는 느낌)"가 아니라 "왜·언제·어떻게"를 판다.
// 무료에서 방향(◎○△)을 이미 보여줬으니, 여기서는 그 방향이 왜 유리한지·언제 움직일지·어떻게
// 행동할지에 답한다. 점수 자체는 흐릿하게만 둔다.
import { useAppActions, useAppCheckout, useAppReport } from '../../contexts/AppContext';
import { buildCareerSignal } from '../../utils/careerSignal';
import type { CareerAxis } from '../../utils/careerSignal';
import { buildMonthlyFlow } from '../../utils/monthlyFlow';
import { getPaywallDecisionCopy } from '../../utils/paywallDecisionCopy';

/** "9월 [평가·승진 어필]" 형태의 배지 문구에서 대괄호 안만 뽑는다. */
function phraseOf(label: string): string {
  const match = label.match(/\[(.+)\]/);
  return match ? match[1] : label;
}

const OPEN_MONTH_COUNT = 2;

// 무료 신호에서 ◎였던 축을 그대로 이어받아 "왜 그 선택이 유리한가"로 연결한다.
const AXIS_SUBJECT: Record<CareerAxis, string> = {
  jobChange: '이직이',
  negotiation: '협상이',
  stay: '잔류가',
};

export function PaywallScreen() {
  const { guardian, sajuResult } = useAppReport();
  const { price } = useAppCheckout();
  const { setStep, setShowManualPayModal } = useAppActions();

  if (!guardian || !sajuResult) return null;

  const signal = buildCareerSignal(sajuResult.scores);
  const topSubject = AXIS_SUBJECT[signal.topAxis];
  const decisionCopy = getPaywallDecisionCopy(signal.topAxis);

  const natalZhis = [
    sajuResult.pillars.year.zhi,
    sajuResult.pillars.month.zhi,
    sajuResult.pillars.day.zhi,
    sajuResult.pillars.hour.zhi,
  ].filter(Boolean);
  const months = buildMonthlyFlow(sajuResult.dayGan.char, natalZhis, 6);

  return (
    <section className="jg-screen">
      <div className="jg-kicker">{guardian.nickname}가 지금 흐름을 뜯어봤어요</div>
      <h1 className="jg-title">왜 지금 {topSubject}<br />더 유리할까요?</h1>
      <p className="jg-sub">
        방향은 무료에서 봤으니, 이제 이유·타이밍·행동을 봐요.
      </p>

      <div className="jg-personalization-note">
        <strong>생년월일만으로 끝나는 일반 운세가 아니에요.</strong>
        <p>결제 후 현재 직무 · 원하는 방향 · 지금 상황을 입력하면 리포트에 함께 반영해요.</p>
      </div>

      <div className="jg-preview">
        <div className="jg-preview-title">
          <strong>세 가지 선택 비교</strong>
          <span className="jg-lock">상세 리포트에서 공개돼요</span>
        </div>
        <div className="jg-scores">
          <div className="jg-score"><span>🚪 이직</span><b aria-hidden="true">••점</b><span className="jg-sr-only">상세 리포트에서 공개</span></div>
          <div className="jg-score"><span>💰 협상</span><b aria-hidden="true">••점</b><span className="jg-sr-only">상세 리포트에서 공개</span></div>
          <div className="jg-score"><span>🪑 잔류</span><b aria-hidden="true">••점</b><span className="jg-sr-only">상세 리포트에서 공개</span></div>
        </div>
      </div>

      {/* 유료의 핵심 가치를 왜·언제·어떻게 세 묶음으로 명확히 나눈다. */}
      <div className="jg-value">
        <div className="jg-value-row">
          <span className="jg-value-tag">왜</span>
          <div>
            <strong>{topSubject} 유리한 이유</strong>
            <p>지금 커리어 흐름, 강한 요소·약한 요소, 현재 환경과의 궁합까지 근거로 짚어요.</p>
          </div>
        </div>
        <div className="jg-value-row">
          <span className="jg-value-tag">언제</span>
          <div>
            <strong>움직이면 흐름이 바뀌는 시기</strong>
            <p>앞으로 6개월, 어느 달에 힘이 실리고 어느 달을 조심해야 하는지 알려줘요.</p>
          </div>
        </div>
        <div className="jg-value-row">
          <span className="jg-value-tag">어떻게</span>
          <div>
            <strong>{decisionCopy.howTitle}</strong>
            <p>{decisionCopy.howBody}</p>
          </div>
        </div>
      </div>

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
        <p>{decisionCopy.roadmap}</p>
      </div>

      <div className="jg-preview jg-decision-preview">
        <div className="jg-preview-title"><strong>내 커리어 결정 기준</strong><span className="jg-lock">상세 리포트에서 공개돼요</span></div>
        {decisionCopy.criteria.map((criterion, index) => (
          <p key={criterion}>✓ {criterion} <span aria-hidden="true">{index === 0 ? '███████' : '█████████'}</span></p>
        ))}
        <div className="jg-preview-title"><strong>상황별 결정 가이드</strong></div>
        {decisionCopy.scenarios.map(scenario => <p key={scenario}>{scenario}</p>)}
      </div>

      <div className="jg-followup">
        <h2>정해진 리포트만 보는 게 아니에요</h2>
        <strong className="jg-followup-lead">개인 질문 1회가 포함돼요</strong>
        {decisionCopy.questionExamples.map(example => <p key={example}>{example}</p>)}
      </div>

      <p className="jg-product-summary">6개월 흐름 · 결정 기준 · 상황별 If–Then · 개인 질문 1회</p>
      <button className="jg-btn" type="button" onClick={() => setShowManualPayModal(true)}>
        내 커리어 선택 리포트 보기 · {price.label}
      </button>
      <button className="jg-text-link" type="button" onClick={() => setStep('result')}>
        내 수호신 다시 보기
      </button>
    </section>
  );
}
