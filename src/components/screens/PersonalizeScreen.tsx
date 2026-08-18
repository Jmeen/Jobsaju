// 목업 7번 화면 — 결제 후 입력.
// 예전에는 이 세 가지를 결제 '전'에 3단계로 나눠 물었다. 결제 전 이탈을 만들던 구간이라
// 목업에서 결제 뒤로 옮겼고, 건너뛰면 기본 분석으로 바로 넘어간다.
import { useRef, useState } from 'react';
import { useAppActions, useAppCheckout, useAppReport } from '../../contexts/AppContext';
import { GuardianImage } from '../guardian/GuardianImage';

export function PersonalizeScreen() {
  const { guardian } = useAppReport();
  const { isAILoading, unlockLoadingText, unlockError } = useAppCheckout();
  const { submitPersonalization } = useAppActions();

  // 입력 중 컨텍스트가 리렌더되지 않도록 값은 로컬에만 둔다.
  const [job, setJob] = useState('');
  const [goal, setGoal] = useState('');
  const [situation, setSituation] = useState('');
  const submittedRef = useRef(false);

  // 중복 제출은 막되, 실패하면 다시 누를 수 있어야 한다.
  // 잠금을 걸어두고 풀지 않으면 오류 문구만 보이고 버튼이 먹지 않는 상태에 갇힌다.
  const submit = async (personalize: boolean) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const ok = await submitPersonalization(
        personalize ? { current_job: job, career_goal: goal, desired_answer: situation } : {},
      );
      if (!ok) submittedRef.current = false;
    } catch {
      submittedRef.current = false;
    }
  };

  if (isAILoading) {
    return (
      <section className="jg-screen jg-summon is-revealing">
        {guardian && <GuardianImage className="jg-summon-guardian" guardian={guardian} eager />}
        <div className="jg-pouch" aria-hidden="true">📄</div>
        <p className="jg-summon-copy" aria-live="polite">{unlockLoadingText}</p>
        <p className="jg-summon-sub">최대 30초까지 걸릴 수 있어요</p>
      </section>
    );
  }

  return (
    <section className="jg-screen">
      {guardian && <GuardianImage className="jg-onboarding-guardian" guardian={guardian} eager />}
      <div className="jg-kicker" style={{ textAlign: 'center' }}>결제가 완료됐어요</div>
      <h1 className="jg-title" style={{ textAlign: 'center' }}>리포트를 조금 더<br />나답게 만들까요?</h1>
      <p className="jg-sub" style={{ textAlign: 'center' }}>
        딱 3가지만 알려주세요.<br />
        구체적으로 적을수록 지금 상황에 맞춰 더 자세히 분석해드려요.
      </p>

      <div className="jg-form">
        <div className="jg-field">
          <label htmlFor="jg-job">1. 지금 어떤 일을 하고 있나요?</label>
          <input id="jg-job" type="text" value={job} onChange={e => setJob(e.target.value)}
            placeholder="예: 6년차 B2B SaaS 영업" />
        </div>
        <div className="jg-field">
          <label htmlFor="jg-goal">2. 앞으로 어디까지 가고 싶나요?</label>
          <input id="jg-goal" type="text" value={goal} onChange={e => setGoal(e.target.value)}
            placeholder="예: 글로벌 SaaS 기업 세일즈 리드" />
        </div>
        <div className="jg-field">
          <label htmlFor="jg-situation">3. 지금 가장 고민되는 상황은 무엇인가요?</label>
          <textarea id="jg-situation" value={situation} onChange={e => setSituation(e.target.value)}
            placeholder="예: 이직 제안을 받았는데 연봉 협상을 세게 해도 괜찮을지 궁금해요." />
          <small>이 질문에는 리포트 마지막에 직접 답해드려요.</small>
        </div>
      </div>

      {unlockError && <p className="jg-error">{unlockError}</p>}

      <button className="jg-btn" type="button" onClick={() => void submit(true)}>
        내 상황까지 반영해 리포트 만들기
      </button>
      <p className="jg-skip-note">잘 모르겠으면 건너뛰어도 괜찮아요.</p>
      <button className="jg-text-link jg-skip-link" type="button" onClick={() => void submit(false)}>
        기본 분석으로 보기 →
      </button>
    </section>
  );
}
