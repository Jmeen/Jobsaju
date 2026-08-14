import assert from 'node:assert/strict';
import test from 'node:test';
import { splitReportParagraphs } from './reportProse.ts';

test('줄바꿈으로 구분된 리포트 문장을 정리된 문단으로 나눈다', () => {
  assert.deepEqual(
    splitReportParagraphs('첫 번째 내용입니다.\n\n 두 번째 내용입니다. \n세 번째 내용입니다.'),
    ['첫 번째 내용입니다.', '두 번째 내용입니다.', '세 번째 내용입니다.'],
  );
});

test('줄바꿈이 없는 문장은 하나의 문단으로 유지한다', () => {
  assert.deepEqual(splitReportParagraphs('하나로 이어진 리포트 문장입니다.'), [
    '하나로 이어진 리포트 문장입니다.',
  ]);
});

test('공백뿐인 내용은 문단을 만들지 않는다', () => {
  assert.deepEqual(splitReportParagraphs(' \n\t\n '), []);
});
