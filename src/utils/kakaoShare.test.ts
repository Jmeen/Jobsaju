import assert from 'node:assert/strict';
import test from 'node:test';
import { buildKakaoFeedTemplate, createSharePage, shareCareerResult, type ShareCareerDependencies } from './kakaoShare.ts';

const input = { blob: new Blob(['png'], { type: 'image/png' }), serviceUrl: 'https://example.com', kakaoKey: 'js-key', shareHook: '나는 잔류형이래. 너는 지금 옮겨도 될까?' };
const deps = (overrides: Partial<ShareCareerDependencies> = {}): ShareCareerDependencies => ({
  upload: async () => 'https://example.com/api/share-card/id.png',
  kakaoShare: async () => undefined,
  linkShare: async () => true,
  fileShare: async () => true,
  downloadAndCopy: async () => undefined,
  isIOS: () => false,
  isIOSSafari: () => false,
  ...overrides,
});

test('카카오 메시지는 결과 유형을 후킹하고 내 사주 확인을 제안한다', () => {
  const template = buildKakaoFeedTemplate({
    imageUrl: 'https://example.com/card.png',
    serviceUrl: 'https://example.com',
    shareHook: '나는 잔류형이래. 너는 지금 옮겨도 될까?',
  });

  assert.equal(template.content.title, '나는 잔류형이래. 너는 지금 옮겨도 될까?');
  assert.equal(template.content.description, '사주로 보는 6개월 이직 타이밍');
  assert.equal(template.buttons[0].title, '내 6개월 이직운 보기');
  assert.equal(template.serverCallbackArgs, undefined, 'unlockToken이 없으면 웹훅 파라미터도 없어야 한다');
});

test('unlockToken을 넘기면 카카오 웹훅으로 그대로 돌아올 serverCallbackArgs를 포함한다', () => {
  const template = buildKakaoFeedTemplate({
    imageUrl: 'https://example.com/card.png',
    serviceUrl: 'https://example.com',
    shareHook: '나는 잔류형이래. 너는 지금 옮겨도 될까?',
    unlockToken: 'unlock-abc-123',
  });

  assert.deepEqual(template.serverCallbackArgs, { unlock_token: 'unlock-abc-123' });
});

test('description을 넘기면 기본 안내 문구 대신 개인화된 문구를 카드 본문으로 쓴다', () => {
  const template = buildKakaoFeedTemplate({
    imageUrl: 'https://example.com/card.png',
    serviceUrl: 'https://example.com',
    shareHook: '나는 잔류형이래. 너는 지금 옮겨도 될까?',
    description: '지금은 협상 카드를 먼저 쓸 시점입니다.',
  });

  assert.equal(template.content.description, '지금은 협상 카드를 먼저 쓸 시점입니다.');
});

test('createSharePage는 개인화 랜딩 페이지 URL을 요청하고 응답의 shareUrl을 돌려준다', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown;
  globalThis.fetch = (async (_input: unknown, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ shareUrl: 'https://example.com/api/share-page/abc-123' }), { status: 201 });
  }) as typeof fetch;
  try {
    const shareUrl = await createSharePage({
      imageUrl: 'https://example.com/api/share-card/id.png',
      title: '나는 잔류형이래. 너는 지금 옮겨도 될까?',
      description: '지금은 협상 카드를 먼저 쓸 시점입니다.',
    });
    assert.equal(shareUrl, 'https://example.com/api/share-page/abc-123');
    assert.deepEqual(requestBody, {
      imageUrl: 'https://example.com/api/share-card/id.png',
      title: '나는 잔류형이래. 너는 지금 옮겨도 될까?',
      description: '지금은 협상 카드를 먼저 쓸 시점입니다.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('createSharePage는 실패하면 예외 대신 null을 돌려준다(호출부가 기본 URL로 대체)', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('network down'); }) as typeof fetch;
  try {
    const shareUrl = await createSharePage({ imageUrl: 'https://example.com/x.png', title: 't', description: 'd' });
    assert.equal(shareUrl, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('카카오 공유 시도 시 unlockToken이 kakaoShare 호출까지 그대로 전달된다', async () => {
  let receivedUnlockToken;
  await shareCareerResult(
    { ...input, unlockToken: 'unlock-abc-123' },
    deps({ kakaoShare: async value => { receivedUnlockToken = value.unlockToken; } }),
  );
  assert.equal(receivedUnlockToken, 'unlock-abc-123');
});

test('안드로이드/데스크톱에서는 업로드 후 Kakao 피드를 먼저 시도한다', async () => {
  let description = '';
  const result = await shareCareerResult(input, deps({ kakaoShare: async value => { description = value.shareHook; } }));
  assert.equal(result, 'kakao');
  assert.equal(description, '나는 잔류형이래. 너는 지금 옮겨도 될까?');
});

test('Kakao 기술 오류는 링크 공유로 대체한다', async () => {
  const result = await shareCareerResult(input, deps({ kakaoShare: async () => { throw new Error('sdk'); } }));
  assert.equal(result, 'link');
});

test('Kakao 키가 없어도 이미지 단독 대신 링크를 공유한다', async () => {
  let sharedUrl = '';
  let sharedText = '';
  const result = await shareCareerResult(
    { ...input, kakaoKey: '' },
    deps({ linkShare: async (serviceUrl, text) => { sharedUrl = serviceUrl; sharedText = text; return true; } }),
  );
  assert.equal(result, 'link');
  assert.equal(sharedUrl, input.serviceUrl);
  assert.equal(sharedText, '나는 잔류형이래. 너는 지금 옮겨도 될까?\n사주로 보는 6개월 이직 타이밍');
});

test('모든 온라인 공유 실패 시 다운로드로 대체한다', async () => {
  let downloaded = false;
  const result = await shareCareerResult(input, deps({ upload: async () => { throw new Error('r2'); }, linkShare: async () => false, fileShare: async () => false, downloadAndCopy: async () => { downloaded = true; } }));
  assert.equal(result, 'download');
  assert.equal(downloaded, true);
});

test('사용자 공유 취소는 조용히 종료한다', async () => {
  const abort = new Error('cancel'); abort.name = 'AbortError';
  const result = await shareCareerResult({ ...input, kakaoKey: '' }, deps({ linkShare: async () => { throw abort; } }));
  assert.equal(result, 'cancelled');
});

test('iOS에서도 카카오 스킴을 쓸 수 있으면(프리업로드 없이도) 카카오를 파일 공유보다 먼저 시도한다', async () => {
  let uploadCalled = false;
  let fileShareCalled = false;
  const result = await shareCareerResult(
    input,
    deps({
      isIOS: () => true,
      isIOSSafari: () => true,
      upload: async () => { uploadCalled = true; return 'https://example.com/x.png'; },
      fileShare: async () => { fileShareCalled = true; return true; },
    }),
  );
  assert.equal(result, 'kakao');
  assert.equal(uploadCalled, true);
  assert.equal(fileShareCalled, false, '카카오 공유가 성공하면 파일 공유 시트는 시도하지 않아야 한다');
});

test('iOS 사파리에서 카카오가 완전히 실패하면 파일 공유가 아니라 링크 공유로 폴백한다', async () => {
  // 파일+텍스트를 함께 navigator.share로 보내면 카카오톡 등 일부 앱이 이미지만 받고 텍스트(링크)는
  // 버리는 경우가 많다. 그래서 카카오 SDK가 안 되면 파일보다 링크(og 태그가 박힌 개인화 페이지)를 먼저 시도한다.
  let fileShareCalled = false;
  const result = await shareCareerResult(
    input,
    deps({ isIOS: () => true, isIOSSafari: () => true, kakaoShare: async () => { throw new Error('kakao down'); }, fileShare: async () => { fileShareCalled = true; return true; } }),
  );
  assert.equal(result, 'link');
  assert.equal(fileShareCalled, false, '링크 공유가 성공하면 파일 공유는 시도하지 않아야 한다');
});

test('링크 공유도 안 되면(구형 브라우저 등) 그제서야 파일 공유로 폴백한다', async () => {
  let fileShareCalled = false;
  const result = await shareCareerResult(
    { ...input, kakaoKey: '' },
    deps({ linkShare: async () => false, fileShare: async () => { fileShareCalled = true; return true; } }),
  );
  assert.equal(result, 'file');
  assert.equal(fileShareCalled, true);
});

test('엣지·크롬 등 iOS 위 비사파리 브라우저는 카카오를 시도하지 않고 곧바로 링크(개인화 페이지)를 공유한다', async () => {
  // 실사례 회귀 테스트: 카카오톡이 최신 버전으로 설치돼 있어도, 비사파리 iOS 브라우저는 커스텀 URL
  // 스킴을 안정적으로 못 열어 카카오의 "앱 실행 안내" 폴백 페이지로 떨어진다. 이런 환경에서는 처음부터
  // 카카오 SDK를 건드리지 않고, 파일 단독 공유(텍스트·링크가 함께 전달 안 될 수 있음)보다도 먼저
  // og 태그가 박힌 개인화 링크를 공유해야 어디서 열어도 결과카드 미리보기가 뜬다.
  let kakaoCalled = false;
  let fileShareCalled = false;
  let sharedUrl = '';
  const result = await shareCareerResult(
    { ...input, preUploadedImageUrl: 'https://example.com/pre-uploaded.png' },
    deps({
      isIOS: () => true,
      isIOSSafari: () => false,
      kakaoShare: async () => { kakaoCalled = true; },
      fileShare: async () => { fileShareCalled = true; return true; },
      linkShare: async (serviceUrl) => { sharedUrl = serviceUrl; return true; },
    }),
  );
  assert.equal(result, 'link');
  assert.equal(sharedUrl, input.serviceUrl, '개인화 랜딩 페이지(serviceUrl)가 그대로 공유돼야 한다');
  assert.equal(kakaoCalled, false, '비사파리 iOS 브라우저에서는 카카오 SDK를 시도하면 안 된다');
  assert.equal(fileShareCalled, false, '링크 공유가 성공하면 파일 공유는 시도하지 않아야 한다');
});

test('iOS에서 사용자가 링크 공유 시트를 취소하면 파일 공유로 넘어가지 않고 즉시 종료한다', async () => {
  const abort = new Error('cancel'); abort.name = 'AbortError';
  let fileShareCalled = false;
  const result = await shareCareerResult(
    { ...input, kakaoKey: '' },
    deps({ isIOS: () => true, linkShare: async () => { throw abort; }, fileShare: async () => { fileShareCalled = true; return true; } }),
  );
  assert.equal(result, 'cancelled');
  assert.equal(fileShareCalled, false);
});

test('프리업로드된 이미지가 있으면 iOS 사파리에서도 업로드 없이 카카오 공유를 가장 먼저 시도한다', async () => {
  let uploadCalled = false;
  let linkShareCalled = false;
  let usedImageUrl = '';
  const result = await shareCareerResult(
    { ...input, preUploadedImageUrl: 'https://example.com/pre-uploaded.png' },
    deps({
      isIOS: () => true,
      isIOSSafari: () => true,
      upload: async () => { uploadCalled = true; return 'https://example.com/should-not-use.png'; },
      linkShare: async () => { linkShareCalled = true; return true; },
      kakaoShare: async value => { usedImageUrl = value.imageUrl; },
    }),
  );
  assert.equal(result, 'kakao');
  assert.equal(usedImageUrl, 'https://example.com/pre-uploaded.png');
  assert.equal(uploadCalled, false, '프리업로드된 URL이 있으면 업로드(fetch)를 다시 호출하지 않아야 한다');
  assert.equal(linkShareCalled, false, '카카오 공유가 성공하면 링크 공유는 시도하지 않아야 한다');
});

test('프리업로드된 이미지로도 카카오 공유가 실패하면(재업로드까지) 결국 링크 공유로 폴백한다', async () => {
  let linkShareCalled = false;
  const result = await shareCareerResult(
    { ...input, preUploadedImageUrl: 'https://example.com/pre-uploaded.png' },
    deps({
      isIOS: () => true,
      isIOSSafari: () => true,
      kakaoShare: async () => { throw new Error('kakao down'); },
      linkShare: async () => { linkShareCalled = true; return true; },
    }),
  );
  assert.equal(result, 'link');
  assert.equal(linkShareCalled, true);
});
