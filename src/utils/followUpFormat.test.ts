import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFollowUpLoadingMessage,
  parseFollowUpAnswer,
  parseInline,
  parseStructuredFollowUpAnswer,
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

test('결론, 근거, 행동을 화면용 세 구역으로 분리한다', () => {
  assert.deepEqual(parseStructuredFollowUpAnswer([
    '결론부터',
    '지금은 A보다 B를 먼저 하는 편을 추천합니다.',
    '',
    '왜 그렇게 보는지',
    '- 현재 역할을 개선할 여지가 남아 있습니다.',
    '- 보상 조건을 문서로 확인할 수 있습니다.',
    '',
    '지금 할 일',
    '오늘 리더와 면담 일정을 잡으세요.',
  ].join('\n')), {
    conclusion: '지금은 A보다 B를 먼저 하는 편을 추천합니다.',
    reasons: [
      '현재 역할을 개선할 여지가 남아 있습니다.',
      '보상 조건을 문서로 확인할 수 있습니다.',
    ],
    action: '오늘 리더와 면담 일정을 잡으세요.',
  });
});

test('이전 ①/②/③ 답변의 긴 근거도 최대 세 항목으로 나눈다', () => {
  const parsed = parseStructuredFollowUpAnswer([
    '① 결론',
    '현재 회사를 먼저 확인하는 편을 추천합니다.',
    '',
    '② 왜 그런가',
    '역할을 넓힐 여지가 있습니다. 보상 개선 가능성도 확인할 수 있습니다. 다만 약속에는 기한이 필요합니다. 기한이 없으면 기다림이 길어질 수 있습니다.',
    '',
    '③ 지금 할 일 하나',
    '오늘 면담을 요청하세요.',
  ].join('\n'));

  assert.equal(parsed?.reasons.length, 3);
  assert.match(parsed?.reasons[2] ?? '', /기한이 없으면/);
});

test('일반 문단 답변은 구조화 답변으로 오인하지 않는다', () => {
  assert.equal(parseStructuredFollowUpAnswer('일반적인 한 문단 답변입니다.'), null);
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
