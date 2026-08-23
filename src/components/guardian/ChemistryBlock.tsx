// 결과 화면의 궁합 블록 겸 공유 허브.
// 스펙상 결과 화면의 공유 진입점은 여기 하나뿐이다. 내 수호신이 주인공이므로
// 관계 캐릭터는 더 작게, 낮은 채도로 둔다.
//
// 공유 수단은 둘만 둔다 — 카카오톡(Primary)과 링크 복사(Secondary).
// SNS 버튼을 늘어놓지 않는다: 선택지가 늘수록 누르는 사람이 줄고, 정작 이 콘텐츠가
// 실제로 퍼지는 곳은 카카오톡 단톡방이다.
import { useEffect, useRef, useState } from 'react';
import { getGuardianAsset } from '../../utils/guardianAssets';
import type { GuardianAsset } from '../../utils/guardianAssets';
import { chemistryCopy, findChemistryExtremes } from '../../utils/guardianChemistry';
import type { GuardianShareFeedback } from '../../utils/guardianShare';
import { GuardianImage } from './GuardianImage';

type Props = {
  guardian: GuardianAsset;
  isSharing: boolean;
  onKakaoShare: () => Promise<GuardianShareFeedback>;
  onCopyLink: () => Promise<GuardianShareFeedback>;
  onView: () => void;
  /**
   * 헤더 표시 방식.
   * - 'chemistry'(기본): 무료 결과 화면. "같이 일하면 잘 맞는 유형"으로 친구를 떠올리게 한다.
   * - 'guardianCard': 유료 리포트. 이미 궁합·캐릭터를 충분히 봤으므로 궁합 대신
   *   "내 수호신 카드는 ○○" 한 장만 보여주고 공유로 잇는다.
   */
  variant?: 'chemistry' | 'guardianCard';
};

const TOAST_MS = 2600;

export function ChemistryBlock({ guardian, isSharing, onKakaoShare, onCopyLink, onView, variant = 'chemistry' }: Props) {
  const isGuardianCard = variant === 'guardianCard';

  // 블록이 실제로 붙었을 때 한 번만 집계한다.
  useEffect(() => { onView(); }, [onView, guardian.id]);

  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (feedback: GuardianShareFeedback) => {
    if (!feedback.message) return;
    setToast({ ok: feedback.ok, message: feedback.message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_MS);
  };

  const [isCopying, setIsCopying] = useState(false);
  const runCopy = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      showToast(await onCopyLink());
    } finally {
      setIsCopying(false);
    }
  };

  if (isGuardianCard) {
    // 유료 리포트 하단. 공유용 정사각 카드를 크게 박지 않고, 캐릭터 일러스트 + 이름 +
    // 한 줄 정체성의 작은 '나의 수호신 카드'만 보여준다. 실제 공유 카드는 클릭 시 별도로 그려 올린다.
    return (
      <section className="jg-chemistry jg-mycard-block">
        <h2 className="jg-chemistry-title">나의 수호신</h2>

        <div className="jg-mycard">
          <GuardianImage className="jg-mycard-face" guardian={guardian} eager />
          <strong className="jg-mycard-name">{guardian.nickname}</strong>
          <span className="jg-mycard-id">{guardian.ganzhiKo} {guardian.id} · {guardian.elementLabel} 기운</span>
          <p className="jg-mycard-copy">“{guardian.copy}”</p>
        </div>

        <button
          className="jg-btn jg-btn-kakao"
          type="button"
          disabled={isSharing}
          onClick={async () => showToast(await onKakaoShare())}
        >
          {isSharing ? '공유 카드를 만드는 중…' : '내 수호신 공유하기'}
        </button>

        <button className="jg-text-link" type="button" disabled={isCopying} onClick={() => void runCopy()}>
          {isCopying ? '복사하는 중…' : '링크 복사'}
        </button>

        {toast && (
          <p className={`jg-toast ${toast.ok ? '' : 'is-error'}`} role="status" aria-live="polite">
            {toast.message}
          </p>
        )}
      </section>
    );
  }

  // 정교한 궁합 분석이 아니라 캐릭터 세계관을 넓히고 친구를 떠올리게 하는 장치다.
  // 그래서 "케미 N점" 같은 궁합 점수는 노출하지 않는다 — 유형(찰떡/부딪힘)만 보여준다.
  const { best, worst } = findChemistryExtremes(guardian.id);
  const rows = [
    { label: '회사에서 찰떡인 유형', asset: getGuardianAsset(best.id), result: best.result },
    { label: '부딪히기 쉬운 유형', asset: getGuardianAsset(worst.id), result: worst.result },
  ];

  return (
    <section className="jg-chemistry">
      <h2 className="jg-chemistry-title">같이 일하면 잘 맞는 유형</h2>

      {rows.map(row => (
        <div className="jg-chemistry-row" key={row.label}>
          <GuardianImage className="jg-chemistry-face" guardian={row.asset} />
          <div className="jg-chemistry-text">
            <span className="jg-chemistry-label">{row.label}</span>
            <strong>{row.asset.nickname}</strong>
            <small>{chemistryCopy(row.result.dominantRelation)}</small>
          </div>
        </div>
      ))}

      <p className="jg-chemistry-ask">
        내 수호신은 {guardian.nickname}.<br />친구 수호신도 확인해보기
      </p>

      <button
        className="jg-btn jg-btn-kakao"
        type="button"
        disabled={isSharing}
        onClick={async () => showToast(await onKakaoShare())}
      >
        {isSharing ? '공유 카드를 만드는 중…' : '카카오톡으로 공유하기'}
      </button>

      <button className="jg-text-link" type="button" disabled={isCopying} onClick={() => void runCopy()}>
        {isCopying ? '복사하는 중…' : '링크 복사'}
      </button>

      {/* 성공·실패 모두 같은 자리에서 알린다. alert()은 카카오톡 인앱 브라우저에서 흐름을 끊는다. */}
      {toast && (
        <p className={`jg-toast ${toast.ok ? '' : 'is-error'}`} role="status" aria-live="polite">
          {toast.message}
        </p>
      )}
    </section>
  );
}
