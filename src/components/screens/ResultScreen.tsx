// 유료 리포트 화면. 결제 완료(isUnlocked && aiReport) 상태에서만 보인다 —
// 그 전 단계(무료 수호신·유료 전환)는 GuardianResultScreen / PaywallScreen이 담당한다.
// 디자인은 수호신 흐름과 같은 라이트 테마(.jg-*, report.css)로 통일한다.
// 커리어 의사결정 리포트의 척추: 결론 → 이유 → 흐름 → 행동 → 맞는 환경.
import { useState } from 'react';
import { useAppReport, useAppActions } from '../../contexts/AppContext';
import { STORAGE_KEY } from '../../utils/session';
import { getGuardianAsset } from '../../utils/guardianAssets';
import { getGuardianCharacter } from '../../utils/guardianCharacters';
import { buildElementInsight } from '../../utils/reportInsights';
import { FollowUpLoading, FormattedAnswer } from '../FollowUpContent';
import { FOLLOW_UP_MAX_LENGTH } from '../../utils/followUpValidation';
import { ChemistryBlock } from '../guardian/ChemistryBlock';

const FOLLOW_UP_EXAMPLES = ['몇 월에 지원하는 게 좋을까요?', '연봉을 얼마나 불러도 될까요?', '승진을 1년 더 기다려도 될까요?', '지금 받은 오퍼를 수락해도 될까요?'];

function WorkEnvironmentSections({ sajuResult, guardian, guardianDetail }: any) {
  const maxVal = 5;
  const w = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.wood));
  const f = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.fire));
  const e = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.earth));
  const m = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.metal));
  const wa = Math.max(0.5, Math.min(maxVal, sajuResult.elementsCount.water));
  const points = [
    { x: 110, y: 110 - (100 * (w / maxVal)) },
    { x: 110 + (95 * (f / maxVal)), y: 110 - (31 * (f / maxVal)) },
    { x: 110 + (59 * (e / maxVal)), y: 110 + (81 * (e / maxVal)) },
    { x: 110 - (59 * (m / maxVal)), y: 110 + (81 * (m / maxVal)) },
    { x: 110 - (95 * (wa / maxVal)), y: 110 - (31 * (wa / maxVal)) },
  ];
  const polygonPoints = points.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <>
      <section className="jg-card">
        <h3 className="jg-card-title">나에게 맞는 환경 · 일하는 방식</h3>
        <div className="radar-wrapper">
          <svg className="radar-svg" width="220" height="220" viewBox="0 0 220 220">
            <polygon points="110,10 205,79 169,191 51,191 15,79" fill="none" stroke="var(--jg-line)" strokeWidth="1" />
            <polygon points="110,60 157.5,94.5 139.5,150.5 80.5,150.5 62.5,94.5" fill="none" stroke="var(--jg-line)" strokeWidth="1" />
            <line x1="110" y1="110" x2="110" y2="10" stroke="var(--jg-line)" strokeWidth="1" />
            <line x1="110" y1="110" x2="205" y2="79" stroke="var(--jg-line)" strokeWidth="1" />
            <line x1="110" y1="110" x2="169" y2="191" stroke="var(--jg-line)" strokeWidth="1" />
            <line x1="110" y1="110" x2="51" y2="191" stroke="var(--jg-line)" strokeWidth="1" />
            <line x1="110" y1="110" x2="15" y2="79" stroke="var(--jg-line)" strokeWidth="1" />
            <text x="110" y="5" fill="var(--jg-muted)" fontSize="10" textAnchor="middle">추진력 (목)</text>
            <text x="210" y="82" fill="var(--jg-muted)" fontSize="10" textAnchor="start">열정/소통 (화)</text>
            <text x="175" y="202" fill="var(--jg-muted)" fontSize="10" textAnchor="start">끈기/안정 (토)</text>
            <text x="45" y="202" fill="var(--jg-muted)" fontSize="10" textAnchor="end">결단/실행 (금)</text>
            <text x="10" y="82" fill="var(--jg-muted)" fontSize="10" textAnchor="end">기획/전략 (수)</text>
            <polygon points={polygonPoints} fill="color-mix(in srgb, var(--jg-guardian-accent) 28%, transparent)" stroke="var(--jg-guardian-accent)" strokeWidth="2" />
            {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="var(--jg-green)" />)}
          </svg>
        </div>
        <div className="jg-radar-note">
          <strong>오행 밸런스</strong>
          <p>{buildElementInsight(sajuResult.elementsCount)}</p>
        </div>
      </section>

      <section className="jg-card">
        <h3 className="jg-card-title">{guardian.nickname}의 일하는 방식</h3>
        <p className="jg-report-history-note" style={{ marginBottom: 14 }}>{guardian.copy}</p>
        <div className="jg-strengths">
          <div className="jg-strength"><span>💪 강점</span><p>{guardianDetail.strength.split('. ')[0]}.</p></div>
          <div className="jg-strength"><span>⚠️ 조심할 점</span><p>{guardianDetail.blind_spot.split('. ')[0]}.</p></div>
          <div className="jg-strength"><span>🏢 잘 맞는 환경</span><p>{guardianDetail.best_environment.split('. ')[0]}.</p></div>
        </div>
      </section>
    </>
  );
}

export function ResultScreen() {
  const [followUpInput, setFollowUpInput] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const {
    sajuResult,
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
  } = useAppReport();
  const {
    setStep,
    setCareerContext,
    setIsUnlocked,
    setAiReport,
    setSavedSession,
    setReportHistory,
    setFollowUps,
    setShareBonusGranted,
    setFollowUpError,
    handleSelectPastReport,
    handleFollowUpSubmit,
    handlePaidReportShare,
    handleGuardianLinkCopy,
    trackMatchSectionView,
  } = useAppActions();

  const handleReset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    setSavedSession(null);
    setStep('landing');
    setIsUnlocked(false);
    setAiReport(null);
    setFollowUps([]);
    setShareBonusGranted(false);
    setFollowUpInput('');
    setFollowUpError(null);
    setReportHistory([]);
    setCareerContext({ current_status: '', main_concern: [], current_job: '', career_goal: '', desired_answer: '', email: '' });
  };

  if (!sajuResult) return null;

  const report = aiReport?.report;
  const th = report?.timing_highlights;
  const dayPillar = sajuResult.pillars.day.ganHanja + sajuResult.pillars.day.zhiHanja;
  const guardian = getGuardianAsset(dayPillar);
  const guardianDetail = getGuardianCharacter(dayPillar);
  const questionLimit = shareBonusGranted ? 2 : 1;

  const formatYm = (ym?: string) => {
    if (!ym || !ym.includes('-')) return ym || '';
    const [y, m] = ym.split('-');
    return `${y}년 ${parseInt(m, 10)}월`;
  };

  const decision = report?.decision;
  const decisionGuide = decision?.decision_guide;
  const snapshotDate = report?.snapshot?.generated_at ? new Date(report.snapshot.generated_at) : null;

  return (
    <section className="jg-report">

      {/* 이메일로 찾은 과거 리포트 선택 */}
      {reportHistory.length > 1 && (
        <div className="jg-card">
          <p className="jg-report-history-note">이 이메일로 구매한 리포트가 {reportHistory.length}건 있어요. 보고 싶은 리포트를 선택하세요.</p>
          <div className="jg-report-history">
            {reportHistory.map((entry: any, idx: any) => {
              const isActive = entry.unlock_token === unlockToken;
              return (
                <button
                  key={entry.unlock_token}
                  type="button"
                  className={isActive ? 'is-active' : ''}
                  onClick={() => handleSelectPastReport(entry.unlock_token)}
                  disabled={isLookupLoading}
                >
                  <strong>{entry.created_at ? `${new Date(entry.created_at).toLocaleDateString('ko-KR')} · ` : ''}{entry.label}</strong>
                  {idx === 0 && <span className="is-latest">· 최신</span>}
                </button>
              );
            })}
          </div>
          {lookupError && <p className="jg-error">{lookupError}</p>}
        </div>
      )}

      {report && (
        <>
          {report.snapshot && <p className="jg-report-snapshot"><strong>{snapshotDate && !Number.isNaN(snapshotDate.getTime()) ? `${snapshotDate.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준` : '생성 기준일'}</strong><span>분석기간 {report.snapshot.analysis_period}</span></p>}
          {/* ① 지금의 결론 */}
          {report.report_summary && (
            <section className="jg-report-hero">
              <span className="jg-eyebrow">지금의 결론</span>
              <h2>{report.report_summary.headline}</h2>
              {report.report_summary.one_line_action && (
                <div className="jg-report-hero-action">
                  <span>지금 가장 먼저 할 일</span>
                  <strong>💡 {report.report_summary.one_line_action}</strong>
                </div>
              )}
            </section>
          )}

          {/* 유료 리포트의 첫 번째 답은 "왜"다. 질문별 답변에 묻히지 않게 결론 바로 아래에 둔다. */}
          {report.personalized_advice && (
            <section className="jg-card jg-decision-basis">
              <span className="jg-eyebrow">이 판단의 핵심 근거</span>
              <p className="jg-advice-q"><strong>Q.</strong> {report.personalized_advice.question_summary}</p>
              <p className="jg-advice-diagnosis">{report.personalized_advice.diagnosis}</p>
              <div className="jg-advice-rec">
                <span>추천 방향</span>
                <p>{report.personalized_advice.recommendation}</p>
              </div>
            </section>
          )}

          {/* ② 이 판단이 나온 이유 · 핵심 시기 */}
          {th && (
            <section className="jg-card">
              <span className="jg-eyebrow">이 판단이 나온 이유 · 핵심 시기</span>
              <div className="jg-timings">
                {th.best_job_change && (
                  <div className="jg-timing is-best">
                    <div className="jg-timing-head">
                      <strong>🔥 {th.best_job_change.title || '가장 좋은 이직 시기'}</strong>
                      {th.best_job_change.year_month && <span className="jg-timing-ym">{formatYm(th.best_job_change.year_month)}</span>}
                    </div>
                    {th.best_job_change.score != null && <div className="jg-timing-score">이직운 {th.best_job_change.score}</div>}
                    <p>{th.best_job_change.reason}</p>
                  </div>
                )}
                {th.best_negotiation && (
                  <div className="jg-timing is-best">
                    <div className="jg-timing-head">
                      <strong>💰 {th.best_negotiation.title || '가장 좋은 협상 시기'}</strong>
                      <span className="jg-timing-ym">{formatYm(th.best_negotiation.year_month)}</span>
                    </div>
                    <div className="jg-timing-score">협상운 {th.best_negotiation.score}</div>
                    <p>{th.best_negotiation.reason}</p>
                  </div>
                )}
                {th.caution_month && (
                  <div className="jg-timing is-caution">
                    <div className="jg-timing-head">
                      <strong>⚠️ {th.caution_month.title || '가장 조심해야 하는 시기'}</strong>
                      <span className="jg-timing-ym">{formatYm(th.caution_month.year_month)}</span>
                    </div>
                    <p>{th.caution_month.reason}</p>
                    {(th.caution_month.year_month === th.best_job_change?.year_month || th.caution_month.year_month === th.best_negotiation?.year_month) && (
                      <p className="jg-timing-note">* 기회와 리스크가 함께 큰 달입니다. 서두르되 조건은 반드시 확인하세요.</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ⑤ 현재 월부터 앞으로 6개월 흐름 */}
          {report.timeline && (
            <section className="jg-card">
              <h3 className="jg-card-title">현재부터 앞으로 6개월 흐름</h3>
              <div className="jg-months">
                {report.timeline.slice(0, 6).map((item: any) => {
                  const isBestJob = th?.best_job_change?.year_month === item.year_month;
                  const isBestNego = th?.best_negotiation?.year_month === item.year_month;
                  const isCaution = th?.caution_month?.year_month === item.year_month;
                  const isOpen = expandedMonths.includes(item.year_month);
                  const badge = isBestJob ? '이직 적기' : isBestNego ? '협상 적기' : isCaution ? '주의' : null;
                  return (
                    <div className={`jg-month ${badge ? 'is-flag' : ''}`} key={item.year_month}>
                      <div className="jg-month-head">
                        <strong>{formatYm(item.year_month)}</strong>
                        {badge && <span className={`jg-month-badge ${isCaution ? 'is-caution' : ''}`}>{badge}</span>}
                      </div>
                      <div className="jg-month-meta">
                        {item.keyword} · 이직 {item.scores?.job_change ?? 0} · 협상 {item.scores?.negotiation ?? 0} · 내부 안정성 {item.scores?.stay ?? 0}
                      </div>
                      <p className={`jg-month-summary ${isOpen ? '' : 'is-clamped'}`}>{item.summary}</p>
                      {isOpen && <p className="jg-month-action">✅ {item.action}</p>}
                      <button
                        type="button"
                        className="jg-month-toggle"
                        onClick={() => setExpandedMonths(prev => prev.includes(item.year_month) ? prev.filter(m => m !== item.year_month) : [...prev, item.year_month])}
                      >
                        {isOpen ? '접기 ▲' : '자세히 보기 ▼'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <WorkEnvironmentSections sajuResult={sajuResult} guardian={guardian} guardianDetail={guardianDetail} />

          {/* 왜 이 선택이 잘 맞나 (캐릭터 연결) */}
          {report.personalized_advice?.character_connection && (
            <div className="jg-card jg-report-character">
              <img className="jg-report-guardian-image" src={guardian.imageUrl} alt={`${guardian.nickname} 수호신`} />
              <div>
                <span>{guardian.nickname} · 왜 이런 선택이 당신에게 잘 맞나</span>
                <p>{report.personalized_advice.character_connection}</p>
              </div>
            </div>
          )}

          {decisionGuide && (
            <section className="jg-card jg-decision-guide">
              <h3 className="jg-card-title">이번 6개월의 결정 가이드</h3>
              <div className="jg-decision-columns">
                <div><strong>Must Have</strong>{decisionGuide.must_haves?.map((item: string) => <p key={item}>✓ {item}</p>)}</div>
                <div><strong>Check</strong>{decisionGuide.checks?.map((item: any) => <p key={item.text}>• {item.text}{item.reason && <small>특히 중요한 이유: {item.reason}</small>}</p>)}</div>
                <div><strong>Red Flag</strong>{decisionGuide.red_flags?.map((item: any) => {
                  const text = typeof item === 'string' ? item : item.text;
                  const reason = typeof item === 'string' ? null : item.reason;
                  return <p key={text}>⚠️ {text}{reason && <small>특히 중요한 이유: {reason}</small>}</p>;
                })}</div>
              </div>
              <div className="jg-if-then"><strong>If–Then</strong>{decisionGuide.if_then?.map((item: any) => <p key={item.if}><b>IF {item.if}</b><span>THEN {item.then}</span></p>)}</div>
              <div className="jg-todos"><strong>지금 해야 할 3가지</strong>{decisionGuide.now_actions?.map((item: string) => <div className="jg-todo" key={item}><span>☐</span><span>{item}</span></div>)}</div>
              <div className="jg-watch"><strong>가장 중요한 주의점</strong><span>⚠️ {decisionGuide.caution}</span></div>
            </section>
          )}

          {aiReport.closing_advice && (
            <section className="jg-card jg-report-closing">
              <span className="jg-eyebrow">마무리 한마디</span>
              <p>{aiReport.closing_advice}</p>
            </section>
          )}
        </>
      )}

      {/* 추가 질문 */}
      <section className="followup-card">
        <div className="section-heading">
          <div>
            <span className="jg-eyebrow">내 상황으로 한 번 더 확인하기</span>
            <h3>{isFollowUpLoading ? '질문을 살펴보고 있어요' : '실제 상황 하나에 집중해 답합니다'}</h3>
          </div>
          <span>{isFollowUpLoading ? '답변 생성 중' : '질문 1회 · 공유하면 1회 추가'}</span>
        </div>

        {followUps.map((record: any, index: any) => (
          <div className="followup-thread" key={record.answeredAt}>
            <p className="followup-q">Q{index + 1}. {record.question}</p>
            <div className="followup-a"><FormattedAnswer answer={record.answer} /></div>
          </div>
        ))}

        {isFollowUpLoading ? (
          <FollowUpLoading />
        ) : followUps.length < questionLimit ? (
          <>
            <p className="followup-hint">내 사주 원국과 6개월 흐름, 리포트의 판단 근거, 질문하는 오늘의 시점을 함께 대조해 답합니다.</p>
            <div className="followup-examples">
              {FOLLOW_UP_EXAMPLES.map(example => (
                <button key={example} type="button" onClick={() => { setFollowUpInput(example); setFollowUpError(null); }}>
                  {example}
                </button>
              ))}
            </div>
            <textarea
              className="followup-input"
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
              className="jg-btn"
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
            <p className="followup-hint">
              {isShareConfirming
                ? '카카오톡에서 실제로 보내기를 누르면 자동으로 확인돼요. 잠시만 기다려 주세요.'
                : '결과를 친구에게 공유하면 추가 질문 1회가 열립니다.'}
            </p>
            <button className="jg-btn" onClick={() => void handlePaidReportShare()} disabled={isShareLoading || isShareConfirming}>
              {isShareConfirming ? '카카오톡 전송 확인 중...' : isShareLoading ? '공유 카드 준비 중...' : '친구에게 공유하고 한 번 더 물어보기'}
            </button>
          </>
        ) : (
          <p className="followup-hint">추가 질문 2회를 모두 사용했습니다.</p>
        )}
      </section>

      {/* 공유 — 무료와 같은 수호신 카드 공유(카카오톡/링크 복사)를 쓰되, 유료에서는 이미 궁합·캐릭터를
          충분히 봤으므로 "같이 일하면 잘 맞는 유형" 대신 "내 수호신 카드는 ○○"만 보여준다. */}
      <ChemistryBlock
        guardian={guardian}
        variant="guardianCard"
        isSharing={isShareLoading}
        onKakaoShare={handlePaidReportShare}
        onCopyLink={handleGuardianLinkCopy}
        onView={trackMatchSectionView}
      />

      <div className="jg-report-reset">
        <button className="jg-text-link" onClick={handleReset}>다른 생년월일로 다시 보기</button>
      </div>

      <p className="jg-report-disclaimer">
        본 결과는 명리학을 바탕으로 한 참고 자료이며, 오락과 자기 성찰 목적으로 제공됩니다.<br />
        이직·퇴사 등 중요한 결정은 반드시 현실 조건을 함께 검토해 주세요.
      </p>
    </section>
  );
}
