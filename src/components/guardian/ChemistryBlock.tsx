// 결과 화면의 궁합 블록 겸 공유 허브.
// 스펙상 결과 화면의 공유 CTA는 여기 하나뿐이다. 내 수호신이 주인공이므로
// 관계 캐릭터는 더 작게, 낮은 채도로 둔다.
import { useEffect } from 'react';
import { getGuardianAsset } from '../../utils/guardianAssets';
import type { GuardianAsset } from '../../utils/guardianAssets';
import { chemistryCopy, findChemistryExtremes } from '../../utils/guardianChemistry';
import { GuardianImage } from './GuardianImage';

type Props = {
  guardian: GuardianAsset;
  isSharing: boolean;
  onShare: () => void;
  onView: () => void;
};

export function ChemistryBlock({ guardian, isSharing, onShare, onView }: Props) {
  const { best, worst } = findChemistryExtremes(guardian.id);
  const bestGuardian = getGuardianAsset(best.id);
  const worstGuardian = getGuardianAsset(worst.id);

  // 블록이 실제로 붙었을 때 한 번만 집계한다.
  useEffect(() => { onView(); }, [onView, guardian.id]);

  const rows = [
    { label: '찰떡', asset: bestGuardian, result: best.result },
    { label: '티격태격', asset: worstGuardian, result: worst.result },
  ];

  return (
    <section className="jg-chemistry">
      <h2 className="jg-chemistry-title">함께 일하면?</h2>

      {rows.map(row => (
        <div className="jg-chemistry-row" key={row.label}>
          <GuardianImage className="jg-chemistry-face" guardian={row.asset} />
          <div className="jg-chemistry-text">
            <span className="jg-chemistry-label">{row.label}</span>
            <strong>{row.asset.nickname}</strong>
            <small>{chemistryCopy(row.result.dominantRelation)}</small>
          </div>
          <span className="jg-chemistry-score">직장 케미 {row.result.score}점</span>
        </div>
      ))}

      <p className="jg-chemistry-ask">
        내 수호신은 {guardian.nickname}.<br />너는?
      </p>

      <button className="jg-btn" type="button" disabled={isSharing} onClick={onShare}>
        {isSharing ? '공유 카드를 만드는 중…' : '친구에게 물어보기'}
      </button>
    </section>
  );
}
