/**
 * 랜딩 카피 A/B 두 벌.
 *
 * A안 "확인" — 이미 마음이 기운 사람에게 근거를 주는 톤. 신뢰가 높고 결제 저항이 낮다.
 * B안 "직격" — 현실을 정면으로 찌르는 톤. 클릭률이 높고 공유가 잘 된다.
 *
 * 광고 크리에이티브에도 같은 문구를 그대로 쓸 수 있도록 adHeadlines를 함께 둔다.
 */

export type CopyVariant = 'a' | 'b';

export interface LandingCopy {
  variant: CopyVariant;
  /** 브라우저 탭·검색 결과용 */
  documentTitle: string;
  eyebrow: string;
  /** 줄바꿈 지점을 배열로 분리 */
  headline: string[];
  subcopy: string[];
  proof: Array<{ value: string; label: string }>;
  cta: string;
  ctaNote: string;
  /** 결과 대기 화면 */
  loadingTitle: string[];
  /** 결제 유도 문구 */
  unlockTitle: string;
  unlockBody: string;
  unlockCta: (price: string) => string;
  /** 광고·SNS 크리에이티브용 헤드라인 후보 */
  adHeadlines: string[];
}

const VARIANT_A: LandingCopy = {
  variant: 'a',
  documentTitle: '이직사주 — 퇴사 충동은 우연이 아닙니다',
  eyebrow: '2026년, 당신의 이직운',
  headline: ['퇴사 충동은', '우연이 아닙니다'],
  subcopy: [
    '요즘 계속 그만두고 싶다면, 이유가 있습니다.',
    '올해 당신의 흐름이 어디로 향하는지 1분이면 확인됩니다.',
  ],
  proof: [
    { value: '100점', label: '커리어 선택 지표' },
    { value: '6개월', label: '움직일 타이밍' },
    { value: '1분', label: '생년월일만' },
  ],
  cta: '지금 내 이직운 확인하기',
  ctaNote: '가입 없이 바로 확인할 수 있습니다.',
  loadingTitle: ['당신이 지금 흔들리는 이유를', '사주에서 찾고 있습니다.'],
  unlockTitle: '왜 지금인지, 언제 움직여야 하는지',
  unlockBody: '내 오행 능력치와 6개월 이직 로드맵, 그리고 적어주신 고민에 대한 맞춤 해석을 한 번에 열어봅니다.',
  unlockCta: (price) => `전체 리포트 열어보기 (${price})`,
  adHeadlines: [
    '퇴사 충동은 우연이 아닙니다',
    '요즘 계속 그만두고 싶다면, 이유가 있습니다',
    '올해 내 이직운은 몇 점일까?',
    '버티는 게 전략인지 미련인지 알려드립니다',
  ],
};

const VARIANT_B: LandingCopy = {
  variant: 'b',
  documentTitle: '이직사주 — 지금 회사, 언제까지 다녀야 할까?',
  eyebrow: '직장인 이직운 진단',
  // "그 회사"는 앱이 말을 거는 3인칭 톤이라 첫 화면에서 지시 대상이 흐릿하다.
  // "지금 회사"는 지시사 모호함 없이 읽는 사람의 속마음으로 들린다.
  headline: ['지금 회사,', '언제까지 다녀야 할까?'],
  subcopy: [
    '버티는 게 전략인지 미련인지,',
    '사주가 먼저 답합니다.',
  ],
  proof: [
    { value: '3가지', label: '선택지 비교' },
    { value: '월별', label: '나갈 타이밍' },
    { value: '1분', label: '가입 없이' },
  ],
  cta: '그만둬도 되는지 확인하기',
  ctaNote: '결과는 저장되고, 언제든 다시 볼 수 있습니다.',
  loadingTitle: ['지금 나가도 되는 흐름인지', '따져보고 있습니다.'],
  unlockTitle: '언제 나가야 가장 이득인지',
  unlockBody: '어느 달에 지원하고 어느 달에 연봉을 말해야 하는지, 6개월치 타이밍과 맞춤 해석을 열어봅니다.',
  unlockCta: (price) => `내 이직 타이밍 보기 (${price})`,
  adHeadlines: [
    '지금 회사, 언제까지 다녀야 할까?',
    '버티는 게 전략인지 미련인지',
    '나가도 되는 해인지 1분이면 압니다',
    '연봉 얘기 꺼내도 되는 달이 따로 있습니다',
  ],
};

export const COPY_VARIANTS: Record<CopyVariant, LandingCopy> = {
  a: VARIANT_A,
  b: VARIANT_B,
};

const VARIANT_STORAGE_KEY = 'saju_copy_variant';

/**
 * 변형 선택 규칙:
 * 1. URL의 ?c=a 또는 ?c=b 가 있으면 그것을 따른다 (광고 링크별 고정용)
 * 2. 없으면 이전에 배정된 변형을 유지한다 (같은 사람에게 다른 카피를 보이지 않기 위해)
 * 3. 처음 방문이면 50:50으로 배정한다
 */
export function resolveCopyVariant(search: string, storage: Storage | null): CopyVariant {
  const forced = new URLSearchParams(search).get('c');
  if (forced === 'a' || forced === 'b') {
    try { storage?.setItem(VARIANT_STORAGE_KEY, forced); } catch { /* noop */ }
    return forced;
  }

  try {
    const saved = storage?.getItem(VARIANT_STORAGE_KEY);
    if (saved === 'a' || saved === 'b') return saved;
  } catch { /* noop */ }

  const assigned: CopyVariant = Math.random() < 0.5 ? 'a' : 'b';
  try { storage?.setItem(VARIANT_STORAGE_KEY, assigned); } catch { /* noop */ }
  return assigned;
}

export function getCopy(variant: CopyVariant): LandingCopy {
  return COPY_VARIANTS[variant];
}
