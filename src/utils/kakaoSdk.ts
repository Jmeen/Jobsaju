// 카카오 JS SDK 지연 로더.
//
// 예전에는 index.html <head>에서 동기 <script>로 받았는데, 그러면 공유 버튼을
// 한 번도 누르지 않는 사용자까지 첫 렌더 전에 SDK를 기다려야 했다.
// 지금은 결과 화면에 도달하는 시점에 미리 받아두고(preload), 공유 클릭 시점에는
// 이미 로드된 SDK를 쓴다 — iOS에서 클릭 제스처 컨텍스트가 끊기지 않게 하기 위함이다.
const KAKAO_SDK_SRC = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js';
// index.html에 있던 것과 동일한 SRI 해시. 지연 로드로 바꿔도 무결성 검증은 유지한다.
const KAKAO_SDK_INTEGRITY = 'sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E';
const SCRIPT_ID = 'kakao-sdk';

let pending: Promise<void> | null = null;

export function loadKakaoSdk(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.Kakao) return Promise.resolve();
  if (pending) return pending;

  pending = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('카카오 SDK를 불러오지 못했습니다.')), { once: true });
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = KAKAO_SDK_SRC;
      script.integrity = KAKAO_SDK_INTEGRITY;
      script.crossOrigin = 'anonymous';
      script.async = true;
      document.head.appendChild(script);
    }
  });
  // 실패한 약속을 캐시해두면 재시도가 영영 막힌다 — 다음 호출에서 다시 시도할 수 있게 비운다.
  pending.catch(() => { pending = null; });
  return pending;
}

/** 결과 화면 진입처럼 "곧 필요해질" 시점에 호출한다. 실패해도 조용히 넘어간다(공유는 링크로 폴백). */
export function preloadKakaoSdk(): void {
  void loadKakaoSdk().catch(() => { /* 공유 시점에 다시 시도한다 */ });
}
