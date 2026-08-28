import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGuardianShareMessage,
  buildGuardianShareQuery,
  buildGuardianShareUrl,
  buildGuardianTemplateArgs,
  buildPaidReportShareMessage,
  copyGuardianShareLink,
  sendGuardianKakaoShare,
} from './guardianShare.ts';
import { getGuardianAsset } from './guardianAssets.ts';
import { parseShareInbound } from './shareInbound.ts';

const SHARE_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const tiger = getGuardianAsset('甲寅');
const CARD_URL = 'https://jobsaju.kr/api/share-card/550e8400-e29b-41d4-a716-446655440000.png';

function urlInput(medium: 'kakao' | 'copy') {
  return { baseUrl: 'https://jobsaju.kr/', guardianId: '甲寅', shareSessionId: SHARE_SESSION_ID, medium };
}

test('유료 SHARE_TITLE은 추천 선택+점수, SHARE_QUESTION은 이직 적기+운점수+훅질문이다', () => {
  const message = buildPaidReportShareMessage(
    tiger,
    { jobChange: 52, stay: 59, negotiation: 53 },
    { best_job_change: { year_month: '2026-10', score: 71 } },
  );

  // SHARE_TITLE: 1순위(잔류 59) — 리포트 UI의 top choice 그대로
  assert.equal(message.title, '지금은 잔류가 1순위 · 잔류 59');
  // SHARE_QUESTION: 대표 이직 시기 10월·71 + 훅 질문 (한 줄)
  assert.equal(message.question, '10월 이직운 71 🔥 너는 언제 움직이는 게 좋을까?');
});

test('유료 제목은 이직 1순위에 조사 "이"를 붙인다', () => {
  const message = buildPaidReportShareMessage(
    tiger,
    { jobChange: 68, stay: 55, negotiation: 44 },
    { best_job_change: { year_month: '2026-10', score: 71 } },
  );
  assert.equal(message.title, '지금은 이직이 1순위 · 이직 68');
});

test('이직 적기가 없으면 협상 적기(💰)로, 둘 다 없으면 일반 질문으로 폴백한다', () => {
  const nego = buildPaidReportShareMessage(
    tiger,
    { jobChange: 40, stay: 59, negotiation: 51 },
    { best_negotiation: { year_month: '2026-12', score: 68 } },
  );
  assert.equal(nego.question, '12월 협상운 68 💰 너는 언제가 좋을까?');

  const none = buildPaidReportShareMessage(tiger, { jobChange: 40, stay: 59, negotiation: 41 });
  assert.equal(none.question, '너는 앞으로 6개월 중 언제가 가장 좋을까?');
});

test('점수를 못 구하면 제목을 중립 문구로 폴백한다', () => {
  const message = buildPaidReportShareMessage(tiger, null, { best_job_change: { year_month: '2026-10', score: 71 } });
  assert.equal(message.title, '내 커리어 흐름을 확인했어요');
  // 시기 정보는 그대로 살린다.
  assert.equal(message.question, '10월 이직운 71 🔥 너는 언제 움직이는 게 좋을까?');
});

test('유료 메시지를 buildGuardianTemplateArgs에 넘기면 SHARE_TITLE/SHARE_QUESTION이 교체된다', () => {
  const message = buildPaidReportShareMessage(
    tiger,
    { jobChange: 52, stay: 59, negotiation: 53 },
    { best_job_change: { year_month: '2026-10', score: 71 } },
  );
  const args = buildGuardianTemplateArgs(
    { guardian: tiger, imageUrl: CARD_URL, shareUrl: 'https://jobsaju.kr/', shareQuery: '', shareSessionId: SHARE_SESSION_ID },
    message,
  );

  assert.equal(args.SHARE_TITLE, '지금은 잔류가 1순위 · 잔류 59');
  assert.equal(args.SHARE_QUESTION, '10월 이직운 71 🔥 너는 언제 움직이는 게 좋을까?');
  assert.notEqual(args.SHARE_QUESTION, '너의 수호신은 누구일까?');
});

test('유료 공유 URL은 utm_source=report_share를 쓰고 SHARE_QUERY에 ?를 포함하지 않는다', () => {
  const input = { ...urlInput('kakao'), utmSource: 'report_share' as const };
  const url = new URL(buildGuardianShareUrl(input));
  assert.equal(url.searchParams.get('utm_source'), 'report_share');

  const query = buildGuardianShareQuery(input);
  assert.ok(!query.startsWith('?'));
  assert.match(query, /utm_source=report_share/);
  assert.match(query, /utm_medium=kakao/);
  assert.match(query, /fromGuardian=/);
});

test('공유 URL에 수호신·유입원·medium·shareSessionId가 모두 들어간다', () => {
  const url = new URL(buildGuardianShareUrl(urlInput('kakao')));

  assert.equal(url.searchParams.get('fromGuardian'), '甲寅');
  assert.equal(url.searchParams.get('utm_source'), 'guardian_share');
  assert.equal(url.searchParams.get('utm_medium'), 'kakao');
  assert.equal(url.searchParams.get('shareSessionId'), SHARE_SESSION_ID);
});

test('한자 수호신 id는 퍼센트 인코딩된다', () => {
  // 인코딩이 빠지면 카카오톡이 링크를 잘라 귀속이 통째로 날아간다.
  const url = buildGuardianShareUrl(urlInput('kakao'));

  assert.ok(url.includes('fromGuardian=%E7%94%B2%E5%AF%85'), url);
  assert.ok(!url.includes('甲寅'), '원문 한자가 그대로 남으면 안 된다');
});

test('카카오와 링크 복사의 medium이 구분된다', () => {
  const kakao = new URL(buildGuardianShareUrl(urlInput('kakao')));
  const copy = new URL(buildGuardianShareUrl(urlInput('copy')));

  assert.equal(kakao.searchParams.get('utm_medium'), 'kakao');
  assert.equal(copy.searchParams.get('utm_medium'), 'copy');
});

test('공유 URL을 다시 파싱하면 같은 귀속 문맥이 나온다', () => {
  const url = buildGuardianShareUrl(urlInput('copy'));

  assert.deepEqual(parseShareInbound(new URL(url).search), {
    fromGuardianId: '甲寅',
    shareId: SHARE_SESSION_ID,
    medium: 'copy',
  });
});

test('쿼리 전용 형태는 같은 값을 물음표 없이 돌려준다', () => {
  const query = buildGuardianShareQuery(urlInput('kakao'));

  assert.ok(!query.startsWith('?'));
  assert.deepEqual(parseShareInbound(`?${query}`), {
    fromGuardianId: '甲寅',
    shareId: SHARE_SESSION_ID,
    medium: 'kakao',
  });
});

test('기본 주소가 깨져 있어도 공유는 막지 않는다', () => {
  const url = buildGuardianShareUrl({ ...urlInput('kakao'), baseUrl: 'not a url' });

  assert.equal(url, 'not a url');
});

test('공유 문구는 자랑 한 줄과 질문 한 줄이다', () => {
  const message = buildGuardianShareMessage(tiger);

  assert.ok(message.title.includes(tiger.nickname));
  assert.equal(message.question, '너의 수호신은 누구일까?');
  assert.equal(message.buttonLabel, '내 수호신 확인하기');
});

test('수호신 이름의 받침에 맞춰 래/이래를 고른다', () => {
  assert.match(buildGuardianShareMessage(tiger).title, /새싹호랑이래/);
  assert.equal(buildGuardianShareMessage({ ...tiger, nickname: '퇴근멍' }).title, '내 수호신은 퇴근멍이래 🐯');
});

test('템플릿 인자에 수호신별 값이 모두 실린다', () => {
  const args = buildGuardianTemplateArgs({
    guardian: tiger,
    imageUrl: CARD_URL,
    shareUrl: buildGuardianShareUrl(urlInput('kakao')),
    shareQuery: buildGuardianShareQuery(urlInput('kakao')),
    shareSessionId: SHARE_SESSION_ID,
  });

  assert.equal(args.GUARDIAN_ID, '甲寅');
  assert.equal(args.GUARDIAN_NAME, tiger.nickname);
  assert.equal(args.GUARDIAN_IMAGE, CARD_URL);
  assert.equal(args.GUARDIAN_DESCRIPTION, tiger.copy);
  assert.equal(args.SHARE_SESSION_ID, SHARE_SESSION_ID);
  assert.ok(args.SHARE_URL.includes('shareSessionId='));
  // 개인정보는 어떤 인자에도 실리지 않는다.
  assert.ok(!Object.keys(args).some(key => /birth|email|phone|name_kr/i.test(key)));
});

test('다른 수호신이면 인자가 통째로 바뀐다 — 템플릿은 하나로 60마리를 그린다', () => {
  const rabbit = getGuardianAsset('乙卯');
  const base = { imageUrl: CARD_URL, shareUrl: 'https://jobsaju.kr/', shareQuery: '', shareSessionId: SHARE_SESSION_ID };

  const a = buildGuardianTemplateArgs({ guardian: tiger, ...base });
  const b = buildGuardianTemplateArgs({ guardian: rabbit, ...base });

  assert.notEqual(a.GUARDIAN_NAME, b.GUARDIAN_NAME);
  assert.notEqual(a.SHARE_TITLE, b.SHARE_TITLE);
});

function fakeKakao() {
  const calls: Array<{ method: string; payload: unknown }> = [];
  const kakao = {
    init() {},
    isInitialized: () => true,
    Share: {
      sendDefault: (payload: unknown) => { calls.push({ method: 'sendDefault', payload }); },
      sendCustom: (payload: unknown) => { calls.push({ method: 'sendCustom', payload }); },
    },
  } as unknown as KakaoNamespace;
  return { calls, deps: { loadSdk: async () => {}, getKakao: () => kakao } };
}

const kakaoInput = {
  kakaoKey: 'test-key',
  templateId: '123456',
  guardian: tiger,
  imageUrl: CARD_URL,
  shareUrl: buildGuardianShareUrl(urlInput('kakao')),
  shareQuery: buildGuardianShareQuery(urlInput('kakao')),
  shareSessionId: SHARE_SESSION_ID,
};

test('템플릿 ID가 있으면 사용자 정의 템플릿으로 보낸다', async () => {
  const { calls, deps } = fakeKakao();

  const mode = await sendGuardianKakaoShare(kakaoInput, deps);

  assert.equal(mode, 'custom');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'sendCustom');
  const payload = calls[0].payload as { templateId: number; templateArgs: Record<string, string> };
  assert.equal(payload.templateId, 123456);
  assert.equal(payload.templateArgs.GUARDIAN_NAME, tiger.nickname);
});

test('웹훅 귀속값이 serverCallbackArgs로 실린다', async () => {
  const { calls, deps } = fakeKakao();

  await sendGuardianKakaoShare({
    ...kakaoInput,
    serverCallbackArgs: { share_id: SHARE_SESSION_ID, guardian_id: '甲寅' },
  }, deps);

  const payload = calls[0].payload as { serverCallbackArgs: Record<string, string> };
  assert.deepEqual(payload.serverCallbackArgs, { share_id: SHARE_SESSION_ID, guardian_id: '甲寅' });
});

test('템플릿 ID가 없으면 기본 피드로 임시 발송한다', async () => {
  const { calls, deps } = fakeKakao();

  const mode = await sendGuardianKakaoShare({ ...kakaoInput, templateId: '' }, deps);

  assert.equal(mode, 'default');
  assert.equal(calls[0].method, 'sendDefault');
  const payload = calls[0].payload as KakaoFeedTemplate;
  // 정사각형 카드라는 사실은 폴백에서도 유지한다.
  assert.equal(payload.content.imageWidth, 800);
  assert.equal(payload.content.imageHeight, 800);
});

test('템플릿 ID가 숫자가 아니면 사용자 정의 템플릿을 시도하지 않는다', async () => {
  const { calls, deps } = fakeKakao();

  const mode = await sendGuardianKakaoShare({ ...kakaoInput, templateId: 'TEMPLATE_ID' }, deps);

  assert.equal(mode, 'default');
  assert.equal(calls[0].method, 'sendDefault');
});

test('카카오 키가 없으면 던진다 — 호출부가 링크 복사로 안내해야 한다', async () => {
  const { deps } = fakeKakao();

  await assert.rejects(() => sendGuardianKakaoShare({ ...kakaoInput, kakaoKey: '' }, deps));
});

test('클립보드가 되면 복사 성공을 알린다', async () => {
  const written: string[] = [];

  const ok = await copyGuardianShareLink('https://jobsaju.kr/?fromGuardian=%E7%94%B2%E5%AF%85', {
    writeText: async text => { written.push(text); },
    legacyCopy: () => false,
  });

  assert.equal(ok, true);
  assert.deepEqual(written, ['https://jobsaju.kr/?fromGuardian=%E7%94%B2%E5%AF%85']);
});

test('클립보드 API가 막히면 구형 복사로 넘어간다', async () => {
  // 카카오톡 인앱 브라우저처럼 navigator.clipboard가 없는 환경이 있다.
  let legacyCalled = false;

  const ok = await copyGuardianShareLink('https://jobsaju.kr/', {
    writeText: () => Promise.reject(new Error('blocked')),
    legacyCopy: () => { legacyCalled = true; return true; },
  });

  assert.equal(ok, true);
  assert.equal(legacyCalled, true);
});

test('두 경로 모두 실패해도 예외를 던지지 않는다', async () => {
  const ok = await copyGuardianShareLink('https://jobsaju.kr/', {
    writeText: () => Promise.reject(new Error('blocked')),
    legacyCopy: () => { throw new Error('blocked too'); },
  });

  assert.equal(ok, false);
});
