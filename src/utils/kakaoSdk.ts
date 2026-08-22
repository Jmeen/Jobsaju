// 카카오 JS SDK 지연 로더.
//
// 예전에는 index.html <head>에서 동기 <script>로 받았는데, 그러면 공유 버튼을
// 한 번도 누르지 않는 사용자까지 첫 렌더 전에 SDK를 기다려야 했다.
// 지금은 결과 화면에 도달하는 시점에 미리 받아두고(preload), 공유 클릭 시점에는
// 이미 로드된 SDK를 쓴다 — iOS에서 클릭 제스처 컨텍스트가 끊기지 않게 하기 위함이다.
// 일부 브라우저·광고 차단기는 kakaocdn.net을 조용히 멈춰 세운다. 같은 도메인의
// 공식 SDK 사본을 먼저 쓰고, 이 자산도 실패한 경우에만 공식 CDN을 한 번 더 시도한다.
type KakaoSdkSource = { src: string; integrity?: string };

const KAKAO_SDK_SOURCES: readonly KakaoSdkSource[] = [
  { src: '/vendor/share-sdk-2.8.2.min.js' },
  {
    src: 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js',
    integrity: 'sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E',
  },
] as const;
const SCRIPT_ID = 'kakao-sdk';
const SDK_LOAD_TIMEOUT_MS = 8_000;

let pending: Promise<void> | null = null;

function loadScript({ src, integrity }: KakaoSdkSource): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // preload에서 멈춘 태그가 남아 있으면 재사용하지 않는다. load/error 이벤트가 다시
    // 오지 않아 카카오 버튼이 영구 대기하는 문제가 생기기 때문이다.
    document.getElementById(SCRIPT_ID)?.remove();

    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      script.remove();
      reject(new Error('카카오 SDK 로드 시간이 초과되었습니다.'));
    }, SDK_LOAD_TIMEOUT_MS);
    const settle = (callback: () => void) => {
      window.clearTimeout(timeout);
      callback();
    };

    script.id = SCRIPT_ID;
    script.src = src;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }
    script.async = true;
    script.addEventListener('load', () => settle(() => {
      if (window.Kakao) resolve();
      else reject(new Error('카카오 SDK가 초기화되지 않았습니다.'));
    }), { once: true });
    script.addEventListener('error', () => settle(() => {
      script.remove();
      reject(new Error('카카오 SDK를 불러오지 못했습니다.'));
    }), { once: true });
    document.head.appendChild(script);
  });
}

export function loadKakaoSdk(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.Kakao) return Promise.resolve();
  if (pending) return pending;

  pending = (async () => {
    let lastError: Error | null = null;
    for (const source of KAKAO_SDK_SOURCES) {
      if (window.Kakao) return;
      try {
        await loadScript(source);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('카카오 SDK를 불러오지 못했습니다.');
      }
    }
    throw lastError ?? new Error('카카오 SDK를 불러오지 못했습니다.');
  })();
  // 실패한 약속을 캐시해두면 재시도가 영영 막힌다 — 다음 호출에서 다시 시도할 수 있게 비운다.
  pending.catch(() => { pending = null; });
  return pending;
}

/** 결과 화면 진입처럼 "곧 필요해질" 시점에 호출한다. 실패해도 조용히 넘어간다(공유는 링크로 폴백). */
export function preloadKakaoSdk(): void {
  void loadKakaoSdk().catch(() => { /* 공유 시점에 다시 시도한다 */ });
}
