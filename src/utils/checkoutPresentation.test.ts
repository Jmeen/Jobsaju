import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_COPY,
  buildCheckoutPresentation,
  runCheckoutAction,
} from './checkoutPresentation.ts';

test('사용자용 결제 문구는 커리어 선택 리포트 표현을 사용한다', () => {
  assert.equal(CHECKOUT_COPY.title, '커리어 선택 리포트 보기');
  assert.equal(CHECKOUT_COPY.savedResultSuffix, ' (커리어 선택 리포트 포함)');
  assert.equal(CHECKOUT_COPY.lookupDescription, '결제 시 입력하셨던 이메일 주소를 입력하시면, 보관된 커리어 선택 리포트를 바로 불러옵니다.');
  assert.equal(CHECKOUT_COPY.lookupButton, '커리어 선택 리포트 불러오기');
  assert.doesNotMatch(Object.values(CHECKOUT_COPY).filter(value => typeof value === 'string').join(' '), /풀이/);
  assert.doesNotMatch(
    Object.values(CHECKOUT_COPY).filter(value => typeof value === 'string').join(' '),
    /해금/,
  );
});

test('쿠폰이 없으면 유료 가격과 포트원 결제 액션을 제공한다', () => {
  assert.deepEqual(buildCheckoutPresentation(8900, null), {
    originalLabel: null,
    finalLabel: '8,900원',
    buttonLabel: '⚡ 리포트 결제하기 (8,900원)',
    action: 'unlock',
  });
});

test('100% 쿠폰이 적용되면 현재 가격을 0원과 커리어 선택 리포트 액션으로 바꾼다', () => {
  assert.deepEqual(buildCheckoutPresentation(8900, 100), {
    originalLabel: '8,900원',
    finalLabel: '0원',
    buttonLabel: '🎉 0원으로 커리어 선택 리포트 보기',
    action: 'unlock',
  });
});

test('부분 할인 쿠폰은 할인율과 할인된 결제 금액을 보여준다', () => {
  assert.deepEqual(buildCheckoutPresentation(8900, 30), {
    originalLabel: '8,900원',
    finalLabel: '6,230원',
    buttonLabel: '⚡ 리포트 결제하기 (6,230원)',
    action: 'unlock',
  });
});

test('일반 결제도 포트원 결제 흐름을 시작한다', () => {
  let unlockCount = 0;

  runCheckoutAction(
    'unlock',
    () => { unlockCount += 1; },
  );

  assert.equal(unlockCount, 1);
});

test('쿠폰 결제도 같은 커리어 선택 리포트 흐름을 실행한다', () => {
  let unlockCount = 0;

  runCheckoutAction(
    'unlock',
    () => { unlockCount += 1; },
  );

  assert.equal(unlockCount, 1);
});
