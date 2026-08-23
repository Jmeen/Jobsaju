// 수호신 공유 서비스.
//
// 유료 리포트 공유(kakaoShare.ts)와 의도적으로 분리해 둔다.
// 수호신 공유는 두 가지만 제공한다 — (1) 카카오톡 사용자 정의 템플릿, (2) 링크 복사.
// Web Share API(navigator.share)는 쓰지 않는다: 시스템 공유 시트는 어떤 앱으로 갔는지
// 알 수 없어 medium 구분이 무너지고, 카카오톡으로 갔을 때 리치카드가 아니라 링크만 꽂힌다.
// 유료 리포트 공유는 기존 폴백 체인(navigator.share → 파일 → 다운로드)을 그대로 써야 하므로
// kakaoShare.ts는 건드리지 않는다.
import { loadKakaoSdk } from './kakaoSdk.ts';
import type { GuardianAsset } from './guardianAssets.ts';

/** 공유 경로. 카카오톡 리치카드와 링크 복사를 분리해서 집계한다. */
export type GuardianShareMedium = 'kakao' | 'copy';

export const GUARDIAN_SHARE_UTM_SOURCE = 'guardian_share';

/** 공유 버튼의 결과. 화면은 이 값만 보고 토스트를 띄운다(예외를 화면까지 올리지 않는다). */
export type GuardianShareFeedback = { ok: boolean; message: string | null };

/** 카카오 사용자 정의 템플릿이 실제로 무엇으로 발송됐는지. 'default'는 템플릿 미등록 시의 임시 다리다. */
export type GuardianKakaoTemplateMode = 'custom' | 'default';

export type GuardianShareUrlInput = {
  /** 서비스 기본 주소. 개인화 미리보기 페이지가 아니라 앱 진입점이어야 귀속이 결과까지 살아남는다. */
  baseUrl: string;
  guardianId: string;
  shareSessionId: string;
  medium: GuardianShareMedium;
};

/**
 * 공유 링크를 만든다. 받는 사람이 보낸 사람의 수호신 문맥과 공유 흐름 id를 이어받는다.
 *
 *   https://jobsaju.kr/?fromGuardian=甲寅&utm_source=guardian_share&utm_medium=kakao&shareSessionId=<UUID>
 *
 * 한자 수호신 id와 UUID는 URLSearchParams가 알아서 퍼센트 인코딩한다.
 */
export function buildGuardianShareUrl({ baseUrl, guardianId, shareSessionId, medium }: GuardianShareUrlInput): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('fromGuardian', guardianId);
    url.searchParams.set('utm_source', GUARDIAN_SHARE_UTM_SOURCE);
    url.searchParams.set('utm_medium', medium);
    url.searchParams.set('shareSessionId', shareSessionId);
    return url.toString();
  } catch {
    // 기본 주소가 잘못 설정돼 있어도 공유 자체는 막지 않는다 — 귀속만 포기한다.
    return baseUrl;
  }
}

/** 위 URL의 쿼리 부분만. 카카오 템플릿 편집기에서 링크를 등록 도메인 + 쿼리로 조립할 때 쓴다. */
export function buildGuardianShareQuery(input: GuardianShareUrlInput): string {
  const url = buildGuardianShareUrl(input);
  const index = url.indexOf('?');
  return index < 0 ? '' : url.slice(index + 1);
}

export type GuardianShareMessage = {
  /** 리치카드 제목 — 자랑 문장. */
  title: string;
  /** 리치카드 본문 — 받는 사람에게 던지는 질문. */
  question: string;
  /** 수호신 성향 한 줄. 템플릿에서 선택적으로 병기한다. */
  trait: string;
  /** 버튼 문구. */
  buttonLabel: string;
};

export const GUARDIAN_SHARE_BUTTON_LABEL = '내 수호신 확인하기';

/**
 * 공유 메시지 문구.
 *
 * 결과 리포트를 요약하지 않는다 — 공유 메시지는 티저다. 사주 해석을 미리 다 보여주면
 * 받는 사람이 굳이 들어올 이유가 사라진다.
 */
export function buildGuardianShareMessage(guardian: GuardianAsset): GuardianShareMessage {
  return {
    title: `내 수호신은 ${guardian.nickname}래 ${guardian.animalEmoji}`,
    question: '너의 수호신은 누구일까?',
    trait: guardian.copy,
    buttonLabel: GUARDIAN_SHARE_BUTTON_LABEL,
  };
}

export type GuardianTemplateArgsInput = {
  guardian: GuardianAsset;
  /** R2에 올라간 800×800 공유 카드 절대 URL. */
  imageUrl: string;
  shareUrl: string;
  shareQuery: string;
  shareSessionId: string;
};

/**
 * 카카오 사용자 정의 템플릿에 넘길 사용자 인자.
 *
 * 템플릿은 60개를 만들지 않는다 — 하나의 템플릿이 이 인자들로 60마리를 모두 그린다.
 * 링크는 두 가지 형태를 다 넘긴다: 템플릿 편집기에서 전체 URL(SHARE_URL)을 쓸 수 없는
 * 경우(등록 도메인 고정)에는 등록 도메인 + SHARE_QUERY로 조립하면 된다.
 */
export function buildGuardianTemplateArgs(
  { guardian, imageUrl, shareUrl, shareQuery, shareSessionId }: GuardianTemplateArgsInput,
): Record<string, string> {
  const message = buildGuardianShareMessage(guardian);
  return {
    GUARDIAN_ID: guardian.id,
    GUARDIAN_NAME: guardian.nickname,
    GUARDIAN_IMAGE: imageUrl,
    GUARDIAN_DESCRIPTION: message.trait,
    SHARE_TITLE: message.title,
    SHARE_QUESTION: message.question,
    SHARE_BUTTON: message.buttonLabel,
    SHARE_URL: shareUrl,
    SHARE_QUERY: shareQuery,
    SHARE_SESSION_ID: shareSessionId,
  };
}

/** 템플릿 미등록 환경에서만 쓰는 기본 피드 템플릿(임시 다리). */
export function buildGuardianFallbackFeedTemplate(
  { guardian, imageUrl, shareUrl }: Omit<GuardianTemplateArgsInput, 'shareQuery' | 'shareSessionId'>,
  serverCallbackArgs: Record<string, string>,
): KakaoFeedTemplate {
  const message = buildGuardianShareMessage(guardian);
  const link = { mobileWebUrl: shareUrl, webUrl: shareUrl };
  return {
    objectType: 'feed',
    content: {
      title: message.title,
      description: message.question,
      imageUrl,
      imageWidth: 800,
      imageHeight: 800,
      link,
    },
    buttons: [{ title: message.buttonLabel, link }],
    ...(Object.keys(serverCallbackArgs).length ? { serverCallbackArgs } : {}),
  };
}

export type GuardianKakaoShareInput = {
  kakaoKey: string;
  /** 카카오 Developers에 등록한 사용자 정의 템플릿 ID. 비어 있으면 기본 피드로 임시 발송한다. */
  templateId: string;
  guardian: GuardianAsset;
  imageUrl: string;
  shareUrl: string;
  shareQuery: string;
  shareSessionId: string;
  /** 카카오가 실제 전송 성공 시 웹훅으로 되돌려줄 값들. 개인정보를 넣지 않는다. */
  serverCallbackArgs?: Record<string, string>;
};

export type GuardianKakaoDependencies = {
  loadSdk(): Promise<void>;
  getKakao(): KakaoNamespace | undefined;
};

const browserKakaoDeps: GuardianKakaoDependencies = {
  loadSdk: loadKakaoSdk,
  getKakao: () => (typeof window === 'undefined' ? undefined : window.Kakao),
};

/**
 * 카카오톡 공유를 연다.
 *
 * 공유 대상 Picker는 기본값을 쓴다 — 친구·채팅방·그룹채팅방을 모두 고를 수 있어야 한다.
 * 수호신은 1:1보다 단톡방에서 더 잘 퍼지는 콘텐츠다.
 *
 * 실패는 던진다. 호출부가 링크 복사로 안내해야 하기 때문이다.
 */
export async function sendGuardianKakaoShare(
  input: GuardianKakaoShareInput,
  deps: GuardianKakaoDependencies = browserKakaoDeps,
): Promise<GuardianKakaoTemplateMode> {
  if (!input.kakaoKey) {
    // 호출부가 이 예외를 조용히 삼키고 링크 복사로 안내하므로, 원인(빌드 환경변수 누락)이
    // 흔적 없이 사라지지 않도록 콘솔에 남긴다. VITE_KAKAO_JS_KEY는 Cloudflare Pages 빌드 환경변수.
    console.warn('[guardian-share] VITE_KAKAO_JS_KEY가 비어 있어 카카오 공유를 열 수 없습니다. Cloudflare Pages 빌드 환경변수를 확인하세요.');
    throw new Error('카카오 JavaScript 키가 설정되지 않았습니다.');
  }

  await deps.loadSdk();
  const kakao = deps.getKakao();
  if (!kakao) throw new Error('Kakao SDK가 준비되지 않았습니다.');
  if (!kakao.isInitialized()) kakao.init(input.kakaoKey);

  const serverCallbackArgs = input.serverCallbackArgs ?? {};
  const templateId = Number(input.templateId);

  // 사용자 정의 템플릿이 최종 형태다. 정사각형 수호신 카드가 카카오 기본 피드 레이아웃에
  // 맞춰 잘리지 않도록, 이미지 비율까지 템플릿에서 확정해 둔다.
  if (input.templateId && Number.isInteger(templateId) && templateId > 0) {
    kakao.Share.sendCustom({
      templateId,
      templateArgs: buildGuardianTemplateArgs(input),
      ...(Object.keys(serverCallbackArgs).length ? { serverCallbackArgs } : {}),
    });
    return 'custom';
  }

  // 템플릿 ID가 아직 발급되지 않은 환경(로컬·미설정 배포)에서 공유 버튼이 그냥 죽지 않도록
  // 기본 피드로 보낸다. 운영에서는 반드시 VITE_KAKAO_GUARDIAN_TEMPLATE_ID를 채워야 한다.
  kakao.Share.sendDefault(buildGuardianFallbackFeedTemplate(input, serverCallbackArgs));
  return 'default';
}

export type ClipboardDependencies = {
  writeText(text: string): Promise<void>;
  /** clipboard API가 없거나 막힌 환경(비 HTTPS, 구형 인앱 브라우저)용 폴백. */
  legacyCopy(text: string): boolean;
};

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  // 화면에 보이거나 스크롤이 튀지 않게 두되, 선택은 가능해야 한다.
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  try {
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

const browserClipboardDeps: ClipboardDependencies = {
  writeText: text => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return Promise.reject(new Error('클립보드를 쓸 수 없습니다.'));
    }
    return navigator.clipboard.writeText(text);
  },
  legacyCopy,
};

/** 공유 링크를 클립보드에 복사한다. 성공 여부만 돌려주고 예외는 던지지 않는다. */
export async function copyGuardianShareLink(
  shareUrl: string,
  deps: ClipboardDependencies = browserClipboardDeps,
): Promise<boolean> {
  try {
    await deps.writeText(shareUrl);
    return true;
  } catch {
    // 카카오톡 인앱 브라우저처럼 clipboard API가 막힌 곳이 있다.
    try {
      return deps.legacyCopy(shareUrl);
    } catch {
      return false;
    }
  }
}
