# Coupon Payment Pending Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로모션 코드 입력 영역을 넓히고, 쿠폰 적용 시 0원 전체 풀이를 제공하며, 일반 결제는 PG 연동 대기 알림으로 차단하고 사용자용 `해금` 문구를 `전체 풀이`로 통일한다.

**Architecture:** 결제 화면의 카피, 가격 표시, PG 대기 알림을 `checkoutPresentation.ts`의 순수 프레젠테이션 모델로 분리해 단위 테스트한다. 기존 쿠폰 상태와 리포트 생성 로직은 `App.tsx`에 유지하고, 쿠폰 입력 행의 크기만 전용 CSS 클래스로 조정한다.

**Tech Stack:** React 19, TypeScript, Node test runner, CSS, Vite

## Global Constraints

- 제목을 `전체 풀이 보기`로 표시한다.
- 사용자 화면의 `해금` 표현은 승인된 `전체 풀이` 문구로 바꾸되 내부 토큰·함수·API 용어는 유지한다.
- 3회 클릭으로 쿠폰 입력란을 여는 기존 기믹을 유지한다.
- 쿠폰 입력칸은 행의 남는 폭을 사용하고 적용 버튼은 내용에 필요한 최소 폭만 사용한다.
- 쿠폰이 적용되면 기존 가격에 취소선을 표시하고 최종 가격을 `0원`으로 표시한다.
- 쿠폰 없는 일반 결제는 어떤 이메일 상태에서도 `현재 PG사 연동 중입니다. 결제 기능은 곧 제공될 예정입니다.` 알림만 표시한다.
- 쿠폰 적용 후 0원 버튼만 기존 리포트 생성 로직을 실행한다.
- 대규모 `App.tsx` 모듈 분리는 후속 작업으로 남긴다.

---

### Task 1: 결제 프레젠테이션 모델과 모달 연결

**Files:**
- Create: `src/utils/checkoutPresentation.ts`
- Create: `src/utils/checkoutPresentation.test.ts`
- Modify: `src/App.tsx`의 저장 결과 문구, 결제 모달, 리포트 조회 모달
- Modify: `src/index.css`의 결제 모달 스타일 영역

**Interfaces:**
- Produces: `CHECKOUT_COPY`, `buildCheckoutPresentation(priceLabel: string, hasCoupon: boolean)`, `runCheckoutAction(action, onUnlock, alertFn)`
- Consumes: `App.tsx`의 `price.label`, `appliedCoupon`, `handleUnlock`, `handleApplyCoupon`

- [ ] **Step 1: 실패하는 프레젠테이션 테스트 작성**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHECKOUT_COPY,
  buildCheckoutPresentation,
  runCheckoutAction,
} from './checkoutPresentation';

test('사용자용 결제 문구는 전체 풀이 표현을 사용한다', () => {
  assert.equal(CHECKOUT_COPY.title, '전체 풀이 보기');
  assert.equal(CHECKOUT_COPY.savedResultSuffix, ' (전체 풀이 포함)');
  assert.equal(CHECKOUT_COPY.freeButton, '🎉 0원으로 전체 풀이 보기');
  assert.equal(CHECKOUT_COPY.paymentButton('8,900원'), '⚡ 전체 풀이 결제하기 (8,900원)');
  assert.equal(CHECKOUT_COPY.lookupDescription, '결제 시 입력하셨던 이메일 주소를 입력하시면, 보관된 전체 풀이를 바로 불러옵니다.');
  assert.equal(CHECKOUT_COPY.lookupButton, '전체 풀이 불러오기');
  assert.doesNotMatch(Object.values(CHECKOUT_COPY).filter(value => typeof value === 'string').join(' '), /해금/);
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

test('일반 결제는 해금하지 않고 PG 연동 대기 알림만 표시한다', () => {
  const messages: string[] = [];
  let unlockCount = 0;
  runCheckoutAction('pending', () => { unlockCount += 1; }, message => messages.push(message));
  assert.deepEqual(messages, ['현재 PG사 연동 중입니다. 결제 기능은 곧 제공될 예정입니다.']);
  assert.equal(unlockCount, 0);
});

test('쿠폰 결제는 PG 알림 없이 전체 풀이를 실행한다', () => {
  const messages: string[] = [];
  let unlockCount = 0;
  runCheckoutAction('unlock', () => { unlockCount += 1; }, message => messages.push(message));
  assert.deepEqual(messages, []);
  assert.equal(unlockCount, 1);
});
```

- [ ] **Step 2: 테스트가 모듈 누락으로 실패하는지 확인**

Run: `node --test src/utils/checkoutPresentation.test.ts`

Expected: `checkoutPresentation` 모듈을 찾지 못해 FAIL

- [ ] **Step 3: 최소 프레젠테이션 모델 구현**

```ts
export const PAYMENT_PENDING_MESSAGE = '현재 PG사 연동 중입니다. 결제 기능은 곧 제공될 예정입니다.';

export const CHECKOUT_COPY = {
  title: '전체 풀이 보기',
  savedResultSuffix: ' (전체 풀이 포함)',
  freeButton: '🎉 0원으로 전체 풀이 보기',
  paymentButton: (priceLabel: string) => `⚡ 전체 풀이 결제하기 (${priceLabel})`,
  lookupDescription: '결제 시 입력하셨던 이메일 주소를 입력하시면, 보관된 전체 풀이를 바로 불러옵니다.',
  lookupButton: '전체 풀이 불러오기',
} as const;

export type CheckoutAction = 'pending' | 'unlock';

export function buildCheckoutPresentation(priceLabel: string, hasCoupon: boolean) {
  return hasCoupon
    ? { originalLabel: priceLabel, finalLabel: '0원', buttonLabel: CHECKOUT_COPY.freeButton, action: 'unlock' as const }
    : { originalLabel: null, finalLabel: priceLabel, buttonLabel: CHECKOUT_COPY.paymentButton(priceLabel), action: 'pending' as const };
}

export function runCheckoutAction(
  action: CheckoutAction,
  onUnlock: () => void,
  alertFn: (message: string) => void = window.alert,
) {
  if (action === 'unlock') {
    onUnlock();
    return;
  }
  alertFn(PAYMENT_PENDING_MESSAGE);
}
```

- [ ] **Step 4: 프레젠테이션 테스트 통과 확인**

Run: `node --test src/utils/checkoutPresentation.test.ts`

Expected: 3 tests PASS

- [ ] **Step 5: `App.tsx`에 프레젠테이션 모델 연결**

다음 import를 추가한다.

```ts
import { CHECKOUT_COPY, buildCheckoutPresentation, runCheckoutAction } from './utils/checkoutPresentation';
```

컴포넌트 상태 선언 이후 렌더링 전에 다음 값을 계산한다.

```ts
const checkout = buildCheckoutPresentation(price.label, Boolean(appliedCoupon));
```

다음 화면 문구를 `CHECKOUT_COPY` 값으로 교체한다.

```tsx
지난 결과 다시 보기{savedSession.isUnlocked ? CHECKOUT_COPY.savedResultSuffix : ''}
{CHECKOUT_COPY.title} {appliedCoupon ? <span>(0원 무료 적용)</span> : `(${price.label})`}
{CHECKOUT_COPY.freeButton}
{CHECKOUT_COPY.paymentButton(price.label)}
{CHECKOUT_COPY.lookupDescription}
{isLookupLoading ? '리포트를 찾는 중...' : CHECKOUT_COPY.lookupButton}
```

가격은 `checkout.originalLabel`이 있으면 취소선 가격을 렌더링하고 `checkout.finalLabel`을 최종 금액으로 표시한다. 주 버튼은 `checkout.buttonLabel`을 사용하고 `onClick`에서 `runCheckoutAction(checkout.action, () => void handleUnlock(emailInput))`을 호출한다. 따라서 쿠폰이 없으면 PG 대기 알림만 표시하고, 쿠폰이 적용된 경우에만 기존 리포트 생성 로직을 실행한다.

- [ ] **Step 6: 쿠폰 입력 행의 폭 스타일 적용**

`App.tsx`의 쿠폰 행, 입력, 적용 버튼에 각각 클래스를 추가한다.

```tsx
<div className="coupon-code-row">
  <input className="input-text coupon-code-input" />
  <button className="btn-secondary coupon-apply-button">적용</button>
</div>
```

`src/index.css`에 다음을 추가한다.

```css
.coupon-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.coupon-code-input { min-width: 0; }

.coupon-apply-button {
  width: auto;
  min-width: 58px;
  padding: 8px 10px;
  font-size: 12px;
  white-space: nowrap;
}
```

- [ ] **Step 7: 사용자 화면용 `해금` 문구 잔존 확인**

Run: `rg -n "해금" src/App.tsx`

Expected: 주석, 로그, 내부 처리 용어만 남고 JSX 사용자 문구에는 `해금`이 없음

- [ ] **Step 8: 전체 자동 검증**

Run: `npm run test`

Expected: 모든 테스트 PASS

Run: `npm run lint`

Expected: 오류 없이 종료

Run: `npm run build`

Expected: TypeScript 및 Vite 프로덕션 빌드 성공

- [ ] **Step 9: 모바일 시각·동작 검증**

로컬 앱을 320px 폭으로 열고 제목을 세 번 눌러 쿠폰 입력란을 노출한다. 입력칸이 적용 버튼보다 넓고 가로 스크롤이 없어야 한다. 일반 결제 버튼은 승인된 PG 연동 대기 알림만 띄우고 모달 상태를 유지해야 한다.

- [ ] **Step 10: 커밋**

Git 작성자 정보가 설정된 경우에만 변경 파일을 커밋한다.

```bash
git add src/utils/checkoutPresentation.ts src/utils/checkoutPresentation.test.ts src/App.tsx src/index.css
git commit -m "feat: refine coupon and pending payment flow"
```

작성자 정보가 없으면 커밋을 생략하고 변경 파일과 검증 결과를 전달한다.
