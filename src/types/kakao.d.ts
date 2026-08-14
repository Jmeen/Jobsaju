type KakaoFeedTemplate = {
  objectType: 'feed';
  content: { title: string; description: string; imageUrl: string; imageWidth: number; imageHeight: number; link: { mobileWebUrl: string; webUrl: string } };
  buttons: Array<{ title: string; link: { mobileWebUrl: string; webUrl: string } }>;
  /** 카카오톡 공유 웹훅(App 설정에 등록한 URL)으로 그대로 전달되는 사용자 정의 파라미터. 실제 전송 확인용 */
  serverCallbackArgs?: Record<string, string>;
};

interface Window {
  Kakao?: { init(key: string): void; isInitialized(): boolean; Share: { sendDefault(template: KakaoFeedTemplate): void } };
}
