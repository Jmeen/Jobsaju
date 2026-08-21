// 60갑자 수호신 캐릭터(free_engine_characters.js)와 굽어놓은 아트워크(public/guardians)를 잇는다.
// 이미지 번호는 배열 순서가 아니라 60갑자 자체에서 계산한다 — 데이터 파일이 재정렬돼도
// 엉뚱한 캐릭터 그림이 붙지 않는다.
// 긴 해설문은 guardianCharacters.ts로 분리했다 — 여기는 랜딩부터 필요한 가벼운 정보만 든다.
import { getGuardianProfile } from './guardianProfiles.ts';

export type { GuardianCharacter } from './guardianCharacters.ts';

export type GuardianElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export type GuardianAsset = {
  id: string;
  /** 60갑자 순번 (甲子=1 ~ 癸亥=60). 아트워크 파일명과 같다. */
  sequence: number;
  imageUrl: string;
  /** 랜딩 캐러셀처럼 작게 그리는 자리에서 쓰는 224px 판. 60마리를 한 화면에 태울 때 필요하다. */
  thumbUrl: string;
  /** 화면에 쓰는 별명 (예: 새싹호랑이). */
  nickname: string;
  /** 캐릭터 대사처럼 쓰는 한 줄 카피. */
  copy: string;
  /** 한글 간지 (예: 갑인). */
  ganzhiKo: string;
  /** 그림을 못 받았을 때 대신 쓰는 띠 이모지. */
  animalEmoji: string;
  /** 일간 오행 — 화면 액센트 색을 가른다. */
  element: GuardianElement;
  elementLabel: string;
};

const GAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const GUARDIAN_TOTAL = 60;
/** 데이터가 비어 있거나 알 수 없는 일주가 들어와도 화면이 비지 않도록 쓰는 기본값. */
export const FALLBACK_GUARDIAN_ID = '甲子';

/** 순번 n(1~60)에 해당하는 60갑자 id. 천간은 10주기, 지지는 12주기로 돈다. */
export function guardianIdBySequence(sequence: number): string {
  const index = sequence - 1;
  return GAN_HANJA[index % GAN_HANJA.length] + ZHI_HANJA[index % ZHI_HANJA.length];
}

const SEQUENCE_BY_ID: ReadonlyMap<string, number> = new Map(
  Array.from({ length: GUARDIAN_TOTAL }, (_, index) => [guardianIdBySequence(index + 1), index + 1]),
);

/** 일주(일간+일지)가 곧 수호신 id다. */
export function guardianIdFromPillar(ganHanja: string, zhiHanja: string): string {
  return `${ganHanja}${zhiHanja}`;
}

export function isGuardianId(id: string): boolean {
  return SEQUENCE_BY_ID.has(id);
}

export function getGuardianSequence(id: string): number | null {
  return SEQUENCE_BY_ID.get(id) ?? null;
}

export function guardianImageUrl(sequence: number): string {
  return `/guardians/${String(sequence).padStart(2, '0')}.webp`;
}

/** 작게 그리는 자리용. 원본(640px)은 장당 47KB라 60마리를 한 번에 태울 수 없다(총 2.8MB). */
export function guardianThumbUrl(sequence: number): string {
  return `/guardians/thumb/${String(sequence).padStart(2, '0')}.webp`;
}

/**
 * 아트워크를 못 받았을 때 대신 그릴 이모지 그림.
 * 수호신 자리가 통째로 비면 결과 화면이 무너지므로, 캐릭터 이모지를 SVG로 감싸 채운다.
 */
export function guardianEmojiFallbackUrl(emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">`
    + `<text x="80" y="80" font-size="104" text-anchor="middle" dominant-baseline="central">${emoji}</text>`
    + `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// 천간 두 개가 오행 하나를 이룬다 (갑을=목, 병정=화, 무기=토, 경신=금, 임계=수).
const ELEMENT_BY_GAN_INDEX: readonly GuardianElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
const ELEMENT_LABEL: Record<GuardianElement, string> = {
  wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)',
};

export function guardianElement(id: string): GuardianElement {
  const ganIndex = GAN_HANJA.indexOf(id.charAt(0));
  if (ganIndex < 0) return 'wood';
  return ELEMENT_BY_GAN_INDEX[Math.floor(ganIndex / 2)];
}

export function getGuardianAsset(id: string): GuardianAsset {
  const resolvedId = isGuardianId(id) ? id : FALLBACK_GUARDIAN_ID;
  const sequence = SEQUENCE_BY_ID.get(resolvedId) as number;
  const element = guardianElement(resolvedId);
  const profile = getGuardianProfile(sequence);
  return {
    id: resolvedId,
    sequence,
    imageUrl: guardianImageUrl(sequence),
    thumbUrl: guardianThumbUrl(sequence),
    nickname: profile?.nickname ?? resolvedId,
    copy: profile?.copy ?? '',
    ganzhiKo: profile?.ganzhiKo ?? '',
    animalEmoji: profile?.animalEmoji ?? '✨',
    element,
    elementLabel: ELEMENT_LABEL[element],
  };
}
