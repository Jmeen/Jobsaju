import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_COPY,
  buildCheckoutPresentation,
  runCheckoutAction,
} from './checkoutPresentation.ts';

test('사용자용 결제 문구는 전체 풀이 표현을 사용한다', () => {
  assert.equal(CHECKOUT_COPY.title, '전체 풀이 보기');
  assert.equal(CHECKOUT_COPY.savedResultSuffix, ' (전체 풀이 포함)');
  assert.equal(CHECKOUT_COPY.lookupDescription, '결제 시 입력하셨던 이메일 주소를 입력하시면, 보관된 전체 풀이를 바로 불러옵니다.');
  assert.equal(CHECKOUT_COPY.lookupButton, '전체 풀이 불러오기');
  assert.doesNotMatch(
    Object.values(CHECKOUT_COPY).filter(value => typeof value === 'string').join(' '),
    /해금/,
  );
});

test('쿠폰이 없으면 유료 가격과 PG 대기 액션을 제공한다', () => {
  assert.deepEqual(buildCheckoutPresentation('8,900원', false), {
    originalLabel: null,
    finalLabel: '8,900원',
    buttonLabel: '⚡ 전체 풀이 결제하기 (8,900원)',
    action: 'pending',
  });
});

test('쿠폰이 적용되면 현재 가격을 0원과 전체 풀이 액션으로 바꾼다', () => {
  assert.deepEqual(buildCheckoutPresentation('8,900원', true), {
    originalLabel: '8,900원',
    finalLabel: '0원',
    buttonLabel: '🎉 0원으로 전체 풀이 보기',
    action: 'unlock',
  });
});

test('일반 결제는 전체 풀이를 실행하지 않고 PG 연동 대기 알림만 표시한다', () => {
  const messages: string[] = [];
  let unlockCount = 0;

  runCheckoutAction(
    'pending',
    () => { unlockCount += 1; },
    message => messages.push(message),
  );

  assert.deepEqual(messages, ['현재 PG사 연동 중입니다. 결제 기능은 곧 제공될 예정입니다.']);
  assert.equal(unlockCount, 0);
});

test('쿠폰 결제는 PG 알림 없이 전체 풀이를 실행한다', () => {
  const messages: string[] = [];
  let unlockCount = 0;

  runCheckoutAction(
    'unlock',
    () => { unlockCount += 1; },
    message => messages.push(message),
  );

  assert.deepEqual(messages, []);
  assert.equal(unlockCount, 1);
});
