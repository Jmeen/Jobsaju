import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFollowUpLoadingMessage,
  parseFollowUpAnswer,
  parseInline,
} from './followUpFormat.ts';

test('닫힌 이중 별표만 굵은 강조 토큰으로 변환한다', () => {
  assert.deepEqual(parseInline('지금은 **지원 준비**가 먼저입니다.'), [
    { type: 'text', content: '지금은 ' },
    { type: 'strong', content: '지원 준비' },
    { type: 'text', content: '가 먼저입니다.' },
  ]);

  assert.deepEqual(parseInline('**첫째**와 **둘째**를 확인하세요.'), [
    { type: 'strong', content: '첫째' },
    { type: 'text', content: '와 ' },
    { type: 'strong', content: '둘째' },
    { type: 'text', content: '를 확인하세요.' },
  ]);

  assert.deepEqual(parseInline('닫히지 않은 **강조는 그대로'), [
    { type: 'text', content: '닫히지 않은 **강조는 그대로' },
  ]);
});

test('답변을 문단과 순서 없는 목록 블록으로 나눈다', () => {
  assert.deepEqual(parseFollowUpAnswer('결론입니다.\n두 번째 줄입니다.\n\n- 이력서 정리\n* 공고 확인'), [
    {
      type: 'paragraph',
      lines: [
        [{ type: 'text', content: '결론입니다.' }],
        [{ type: 'text', content: '두 번째 줄입니다.' }],
      ],
    },
    {
      type: 'list',
      items: [
        [{ type: 'text', content: '이력서 정리' }],
        [{ type: 'text', content: '공고 확인' }],
      ],
    },
  ]);
});

test('HTML처럼 보이는 입력도 실행 가능한 마크업으로 바꾸지 않는다', () => {
  assert.deepEqual(parseInline('<img src=x onerror=alert(1)>'), [
    { type: 'text', content: '<img src=x onerror=alert(1)>' },
  ]);
});

test('로딩 안내 문구는 세 단계를 반복한다', () => {
  assert.equal(getFollowUpLoadingMessage(0), '질문의 핵심을 정리하고 있어요');
  assert.equal(getFollowUpLoadingMessage(1), '사주 흐름과 현재 상황을 대조하고 있어요');
  assert.equal(getFollowUpLoadingMessage(2), '실행 가능한 답변으로 다듬고 있어요');
  assert.equal(getFollowUpLoadingMessage(3), '질문의 핵심을 정리하고 있어요');
});
