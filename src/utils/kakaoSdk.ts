// 카카오 JS SDK 지연 로더.
//
// 예전에는 index.html <head>에서 동기 <script>로 받았는데, 그러면 공유 버튼을
// 한 번도 누르지 않는 사용자까지 첫 렌더 전에 SDK를 기다려야 했다.
// 지금은 결과 화면에 도달하는 시점에 미리 받아두고(preload), 공유 클릭 시점에는
// 이미 로드된 SDK를 쓴다 — iOS에서 클릭 제스처 컨텍스트가 끊기지 않게 하기 위함이다.
// 일부 브라우저·콘텐츠 차단기가 kakaocdn.net을 차단하면 SDK 자체가 실행되지 않아
// 공유 버튼이 링크 복사 폴백으로만 떨어진다. 공식 배포본을 같은 도메인 자산으로 제공한다.
const KAKAO_SDK_SRC = '/vendor/share-sdk-2.8.2.min.js';
const SCRIPT_ID = 'kakao-sdk';

let pending: Promise<void> | null = null;

export function loadKakaoSdk(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.Kakao) return Promise.resolve();
  if (pending) return pending;

  pending = new Promise<void>((resolve, reject) => {
    // preload가 네트워크/차단기로 한 번 실패하면 이전 script 태그가 남는다.
    // 그 태그를 그대로 재사용하면 load/error 이벤트가 다시 오지 않아 공유가 영구 대기한다.
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
    }, { once: true });
    script.id = SCRIPT_ID;
    script.src = KAKAO_SDK_SRC;
    script.async = true;
    document.head.appendChild(script);
  });
  // 실패한 약속을 캐시해두면 재시도가 영영 막힌다 — 다음 호출에서 다시 시도할 수 있게 비운다.
  pending.catch(() => { pending = null; });
  return pending;
}

/** 결과 화면 진입처럼 "곧 필요해질" 시점에 호출한다. 실패해도 조용히 넘어간다(공유는 링크로 폴백). */
export function preloadKakaoSdk(): void {
  void loadKakaoSdk().catch(() => { /* 공유 시점에 다시 시도한다 */ });
}
