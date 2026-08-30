import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCharacterTypeLabel,
  FOLLOW_UP_EXAMPLES,
  PAID_REPORT_MAX_POLL_ATTEMPTS,
  PAID_REPORT_POLL_INTERVAL_MS,
  PAID_REPORT_WAIT_COPY,
  REPORT_HEADINGS,
} from './reportCopy.ts';

test('리포트 제목은 승인된 전문 문체를 사용한다', () => {
  assert.equal(REPORT_HEADINGS.verdict, '핵심 결론');
  assert.equal(REPORT_HEADINGS.intent, '커리어 목표와 현재 고민');
  assert.equal(REPORT_HEADINGS.personalAnswer, '핵심 질문 분석');
  assert.equal(REPORT_HEADINGS.closing, '마무리 제언');
  assert.equal(REPORT_HEADINGS.shareCard, '공유용 커리어 카드');

  assert.doesNotMatch(JSON.stringify(REPORT_HEADINGS), /입력 내용을 이렇게 이해했어요|이번 흐름의 결론|다음 환경|내 질문에 대한 답|상담사의 마지막 조언|오피스 능력치|밸런스 풀이|백분위 카드/);
});

test('캐릭터 유형은 크리처 대신 각 캐릭터의 역할어를 사용한다', () => {
  assert.equal(
    buildCharacterTypeLabel('목(木)', '큰 나무의 개척자', '협상운'),
    '목(木) 개척자형 · 협상운 우세',
  );
  assert.equal(
    buildCharacterTypeLabel('수(水)', '큰 흐름의 전략가', '이직운'),
    '수(水) 전략가형 · 이직운 우세',
  );
});

test('추가 질문은 특정 연봉 금액 대신 협상 시점을 묻는다', () => {
  assert.equal(FOLLOW_UP_EXAMPLES[1], '연봉 협상은 언제 꺼내는 게 좋을까요?');
  assert.doesNotMatch(FOLLOW_UP_EXAMPLES.join(' '), /얼마|몇\s*원|금액/);
});

test('유료 리포트는 3~5분을 안내하고 최대 5분간 결과를 확인한다', () => {
  assert.match(PAID_REPORT_WAIT_COPY, /3~5분/);
  assert.doesNotMatch(PAID_REPORT_WAIT_COPY, /30초/);
  assert.equal(PAID_REPORT_POLL_INTERVAL_MS * PAID_REPORT_MAX_POLL_ATTEMPTS, 300_000);
});
