// 수호신 아트워크. 그림을 못 받으면 캐릭터 이모지로 대신해 자리가 비지 않게 한다.
import { useEffect, useState } from 'react';
import { guardianEmojiFallbackUrl } from '../../utils/guardianAssets';
import type { GuardianAsset } from '../../utils/guardianAssets';

type Props = {
  guardian: GuardianAsset;
  className?: string;
  alt?: string;
  eager?: boolean;
};

export function GuardianImage({ guardian, className, alt, eager }: Props) {
  const [failed, setFailed] = useState(false);

  // 수호신이 바뀌면 앞선 실패 상태를 끌고 가지 않는다.
  useEffect(() => { setFailed(false); }, [guardian.imageUrl]);

  return (
    <img
      className={className}
      src={failed ? guardianEmojiFallbackUrl(guardian.animalEmoji) : guardian.imageUrl}
      alt={alt ?? `${guardian.nickname} 수호신`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
