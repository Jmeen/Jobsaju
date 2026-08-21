type KakaoFeedTemplate = {
  objectType: 'feed';
  content: { title: string; description: string; imageUrl: string; imageWidth: number; imageHeight: number; link: { mobileWebUrl: string; webUrl: string } };
  buttons: Array<{ title: string; link: { mobileWebUrl: string; webUrl: string } }>;
  /** 카카오톡 공유 웹훅(App 설정에 등록한 URL)으로 그대로 전달되는 사용자 정의 파라미터. 실제 전송 확인용 */
  serverCallbackArgs?: Record<string, string>;
};

/**
 * 카카오 Developers 메시지 도구에 등록한 사용자 정의 템플릿으로 보낼 때 쓴다.
 * 레이아웃은 템플릿이 갖고 있고, 결과마다 달라지는 값만 templateArgs로 주입한다.
 */
type KakaoCustomTemplate = {
  templateId: number;
  templateArgs?: Record<string, string>;
  serverCallbackArgs?: Record<string, string>;
};

type KakaoNamespace = {
  init(key: string): void;
  isInitialized(): boolean;
  Share: {
    sendDefault(template: KakaoFeedTemplate): void;
    sendCustom(template: KakaoCustomTemplate): void;
  };
};

interface Window {
  Kakao?: KakaoNamespace;
}
