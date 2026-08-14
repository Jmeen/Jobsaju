export type Element = '목' | '화' | '토' | '금' | '수';

export interface CharacterAsset {
  dayGan: string;
  title: string;
  element: Element;
  elementLabel: string;
  imageUrl: string;
  /** 컬렉션 번호 (갑=1 ~ 계=10). 수집 카드 표기용 */
  collectionNo: number;
  collectionTotal: number;
}

// 천간 순서(갑을병정무기경신임계)가 곧 컬렉션 번호가 된다.
// slug는 public/creatures/{slug}.webp 파일명과 1:1로 대응한다 (성별 구분 없는 단일 크리처).
const CHARACTERS: Record<string, { slug: string; title: string; no: number; element: Element; elementLabel: string }> = {
  갑: { slug: 'gap-wood', title: '큰 나무의 개척자', no: 1, element: '목', elementLabel: '목(木)' },
  을: { slug: 'eul-wood', title: '유연한 조율가', no: 2, element: '목', elementLabel: '목(木)' },
  병: { slug: 'byeong-fire', title: '빛나는 스포트라이터', no: 3, element: '화', elementLabel: '화(火)' },
  정: { slug: 'jeong-fire', title: '섬세한 불빛 설계자', no: 4, element: '화', elementLabel: '화(火)' },
  무: { slug: 'mu-earth', title: '흔들리지 않는 중심축', no: 5, element: '토', elementLabel: '토(土)' },
  기: { slug: 'gi-earth', title: '판을 다듬는 운영가', no: 6, element: '토', elementLabel: '토(土)' },
  경: { slug: 'gyeong-metal', title: '결단력 있는 실행가', no: 7, element: '금', elementLabel: '금(金)' },
  신: { slug: 'sin-metal', title: '날카로운 정밀 분석가', no: 8, element: '금', elementLabel: '금(金)' },
  임: { slug: 'im-water', title: '큰 흐름의 전략가', no: 9, element: '수', elementLabel: '수(水)' },
  계: { slug: 'gye-water', title: '기회를 읽는 조언자', no: 10, element: '수', elementLabel: '수(水)' },
};

export const CHARACTER_COLLECTION_TOTAL = Object.keys(CHARACTERS).length;

export function getCharacterAsset(dayGan: string): CharacterAsset {
  const resolvedDayGan = CHARACTERS[dayGan] ? dayGan : '갑';
  const character = CHARACTERS[resolvedDayGan];
  return {
    dayGan: resolvedDayGan,
    title: character.title,
    element: character.element,
    elementLabel: character.elementLabel,
    imageUrl: `/creatures/${character.slug}.webp`,
    collectionNo: character.no,
    collectionTotal: CHARACTER_COLLECTION_TOTAL,
  };
}

export function listCharacterAssets(): CharacterAsset[] {
  return Object.keys(CHARACTERS).map(dayGan => getCharacterAsset(dayGan));
}
