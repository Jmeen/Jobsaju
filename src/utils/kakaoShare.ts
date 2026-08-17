import { loadKakaoSdk } from './kakaoSdk.ts';
export type ShareCareerInput = {
  blob: Blob;
  serviceUrl: string;
  kakaoKey: string;
  shareHook: string;
  /**
   * 클릭 이전에 백그라운드로 미리 업로드해 둔 카드 이미지 URL.
   * 있으면 클릭 시점에 업로드 fetch 없이 곧바로 Kakao.Share를 호출할 수 있어,
   * iOS에서도 사용자 제스처 컨텍스트가 끊기지 않는다.
   */
  preUploadedImageUrl?: string;
  /** 카카오톡 공유 웹훅으로 실제 전송 여부를 확인하기 위한 해금 토큰 */
  unlockToken?: string;
  /** 한 결과 흐름에서 재공유까지 묶는 익명 공유 식별자 */
  shareId?: string;
  /** 결과를 볼 때마다 새로 만드는 익명 결과 식별자 */
  resultSessionId?: string;
  /** 현재 브라우저 방문을 식별하는 익명 세션 식별자 */
  visitorSessionId?: string;
  /** 수호신 60갑자 ID */
  guardianId?: string;
  /** 카카오 리치카드 본문에 쓸 개인화된 한 줄(예: 결과 리포트의 한 줄 결론). 없으면 기본 안내 문구를 쓴다 */
  description?: string;
};
export type ShareCareerDependencies = {
  upload(blob: Blob): Promise<string>;
  kakaoShare(input: ShareCareerInput & { imageUrl: string }): Promise<void>;
  linkShare(serviceUrl: string, shareHook: string): Promise<boolean>;
  fileShare(blob: Blob, serviceUrl: string, shareHook: string): Promise<boolean>;
  downloadAndCopy(blob: Blob, serviceUrl: string): Promise<void>;
  /** iOS(WebKit)는 업로드 fetch가 끼면 카카오 딥링크가 조용히 앱스토어로 새므로 분기가 필요하다 */
  isIOS(): boolean;
  /**
   * iOS이면서 사파리 엔진을 그대로 쓰는 브라우저인지. 엣지·크롬·파이어폭스 등 iOS 위의 다른 브라우저는
   * 자체 WKWebView 래퍼가 카카오 커스텀 URL 스킴(kakaolink://) 오픈을 훨씬 엄격히 제한해,
   * 카카오톡이 실제로 설치돼 있어도 앱을 못 열고 카카오의 "앱 설치/실행 안내" 폴백 페이지로 떨어진다.
   */
  isIOSSafari(): boolean;
};
export type ShareResult = 'kakao' | 'link' | 'file' | 'download' | 'cancelled';
export const SHARE_BENEFIT_COPY = '사주로 보는 6개월 이직 타이밍';

export async function upload(blob: Blob): Promise<string> {
  const response = await fetch('/api/share-card', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: blob });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.imageUrl !== 'string') throw new Error(data.error || '공유 카드 업로드에 실패했습니다.');
  return data.imageUrl;
}

/**
 * 카카오 SDK를 못 쓰는 환경(엣지 등)에서도 링크만 공유되면 어디서든(카톡·문자·다른 메신저)
 * 결과카드 이미지와 개인화된 문구가 미리보기로 뜨도록, R2에 올린 이미지 URL을 og 태그로 박은
 * 전용 랜딩 페이지를 만들어 그 URL을 돌려준다. 실패하면 null — 호출부에서 기본 서비스 URL로 대체한다.
 */
export async function createSharePage({ imageUrl, title, description }: { imageUrl: string; title: string; description: string }): Promise<string | null> {
  try {
    const response = await fetch('/api/share-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl, title, description }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.shareUrl !== 'string') return null;
    return data.shareUrl;
  } catch {
    return null;
  }
}

export function buildKakaoFeedTemplate({ imageUrl, serviceUrl, shareHook, unlockToken, shareId, resultSessionId, visitorSessionId, guardianId, description }: Omit<ShareCareerInput, 'blob' | 'kakaoKey'> & { imageUrl: string }): KakaoFeedTemplate {
  return {
    objectType: 'feed' as const,
    content: {
      title: shareHook,
      description: description || SHARE_BENEFIT_COPY,
      imageUrl,
      imageWidth: 800,
      imageHeight: 800,
      link: { mobileWebUrl: serviceUrl, webUrl: serviceUrl },
    },
    buttons: [{ title: '내 6개월 이직운 보기', link: { mobileWebUrl: serviceUrl, webUrl: serviceUrl } }],
    // 카카오 서버가 실제 전송 성공 시 이 값을 그대로 웹훅으로 돌려준다 — 어떤 해금 토큰의 공유인지 식별하는 용도.
    ...(unlockToken ? {
      serverCallbackArgs: {
        unlock_token: unlockToken,
        ...(shareId ? { share_id: shareId } : {}),
        ...(resultSessionId ? { result_session_id: resultSessionId } : {}),
        ...(visitorSessionId ? { visitor_session_id: visitorSessionId } : {}),
        ...(guardianId ? { guardian_id: guardianId } : {}),
      },
    } : {}),
  };
}

async function kakaoShare({ imageUrl, serviceUrl, kakaoKey, shareHook, unlockToken, shareId, resultSessionId, visitorSessionId, guardianId, description }: ShareCareerInput & { imageUrl: string }): Promise<void> {
  // 결과 화면 진입 시 preload 해두므로 보통은 이미 로드돼 있어 즉시 resolve 된다.
  await loadKakaoSdk();
  if (!window.Kakao) throw new Error('Kakao SDK가 준비되지 않았습니다.');
  if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);
  window.Kakao.Share.sendDefault(buildKakaoFeedTemplate({ imageUrl, serviceUrl, shareHook, unlockToken, shareId, resultSessionId, visitorSessionId, guardianId, description }));
}

async function linkShare(serviceUrl: string, shareHook: string): Promise<boolean> {
  if (!navigator.share) return false;
  await navigator.share({
    title: '직장인 이직사주',
    text: shareHook,
    url: serviceUrl,
  });
  return true;
}

async function fileShare(blob: Blob, serviceUrl: string, shareHook: string): Promise<boolean> {
  const file = new File([blob], '이직사주_결과카드.png', { type: 'image/png' });
  if (!navigator.share || !navigator.canShare?.({ files: [file] })) return false;
  await navigator.share({ files: [file], title: shareHook, text: serviceUrl });
  return true;
}

async function downloadAndCopy(blob: Blob, serviceUrl: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = '이직사주_결과카드.png'; link.href = url; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  await navigator.clipboard?.writeText(serviceUrl);
}

/**
 * iOS(및 iPadOS 13+가 데스크톱으로 위장하는 경우)를 감지한다.
 * iOS 여부는 카카오 커스텀 URL 스킴을 시도해도 되는지(canUseKakaoScheme) 판단하는 데 쓰인다.
 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/**
 * 엣지(EdgiOS)·크롬(CriOS)·파이어폭스(FxiOS)·오페라(OPiOS)·삼성인터넷·카카오톡/인스타그램 인앱 브라우저 등
 * 사파리가 아닌 iOS 브라우저를 UA로 가려낸다. 이런 브라우저에서는 커스텀 URL 스킴 오픈이 불안정하므로
 * 카카오 SDK를 먼저 시도하지 않는다.
 */
function isIOSSafari(): boolean {
  if (!isIOS()) return false;
  const ua = navigator.userAgent || '';
  const nonSafariMarkers = /CriOS|FxiOS|EdgiOS|OPiOS|OPR\/|DuckDuckGo|YaBrowser|SamsungBrowser|KAKAOTALK|Instagram|FBAN|FBAV|Line\//;
  return !nonSafariMarkers.test(ua);
}

const browserDeps: ShareCareerDependencies = { upload, kakaoShare, linkShare, fileShare, downloadAndCopy, isIOS, isIOSSafari };

export async function shareCareerResult(input: ShareCareerInput, deps: ShareCareerDependencies = browserDeps): Promise<ShareResult> {
  const shareHookWithBenefit = `${input.shareHook}\n${SHARE_BENEFIT_COPY}`;
  const onIOS = deps.isIOS();
  // 엣지·크롬 등 iOS 위의 비사파리 브라우저는 카카오 커스텀 URL 스킴(kakaolink://)을 안정적으로 열지
  // 못해, 카카오톡이 설치돼 있어도 카카오의 "앱 실행 안내" 폴백 페이지로 떨어진다. 이 환경에서는
  // (프리업로드 여부와 무관하게) 아예 카카오 SDK를 시도하지 않는다.
  const canUseKakaoScheme = !onIOS || deps.isIOSSafari();

  // 1) 카드 이미지가 미리 업로드돼 있으면(클릭 이전에 백그라운드로 올려둔 이미지) 클릭 시점에는
  //    업로드 fetch 없이 곧바로 Kakao.Share를 호출할 수 있다.
  if (input.kakaoKey && input.preUploadedImageUrl && canUseKakaoScheme) {
    try {
      await deps.kakaoShare({ ...input, imageUrl: input.preUploadedImageUrl });
      return 'kakao';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // 프리업로드된 이미지로도 카카오 공유가 실패하면 아래의 폴백 체인으로 이어간다.
    }
  }

  // 2) 프리업로드가 없었거나 실패했어도, 카카오 스킴을 쓸 수 있는 환경이면 지금 업로드해서 한 번 더 시도한다.
  if (input.kakaoKey && canUseKakaoScheme) {
    try {
      const imageUrl = await deps.upload(input.blob);
      await deps.kakaoShare({ ...input, imageUrl });
      return 'kakao';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }

  // 3) 링크만 공유한다 — serviceUrl은 R2 결과카드 이미지를 og:image로 박은 개인화 랜딩 페이지이므로,
  //    카카오톡이든 문자든 어디서 열어도 이미지·제목·설명이 미리보기로 자동으로 뜬다.
  //    파일과 텍스트를 함께 보내면(navigator.share files+text) 카카오톡 등 일부 앱이 이미지만 받고
  //    링크·텍스트는 버리는 경우가 많아, 링크 단독 공유가 오히려 더 안정적으로 리치 프리뷰를 보여준다.
  try {
    if (await deps.linkShare(input.serviceUrl, shareHookWithBenefit)) return 'link';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
  }

  // 4) 링크 공유도 안 되는 환경(구형 브라우저 등)에서는 이미지 파일이라도 전달한다.
  try {
    if (await deps.fileShare(input.blob, input.serviceUrl, shareHookWithBenefit)) return 'file';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
  }

  // 5) 마지막 폴백: 이미지를 다운로드하고 링크를 클립보드에 복사한다.
  await deps.downloadAndCopy(input.blob, input.serviceUrl);
  return 'download';
}
