# Follow-up Loading and Markdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 추가 질문 요청 중 명확한 대기 화면을 제공하고 AI 답변의 굵은 강조·문단·목록을 안전하게 렌더링한다.

**Architecture:** 응답 문자열을 React와 무관한 블록/인라인 토큰으로 변환하는 순수 함수를 `followUpFormat.ts`에 둔다. 전용 React 컴포넌트가 토큰을 안전한 요소로 출력하고 로딩 상태를 표현하며, `App.tsx`는 상태에 따라 입력·로딩·답변 컴포넌트를 선택한다.

**Tech Stack:** React 19, TypeScript 6, Node test runner, CSS

## Global Constraints

- 외부 마크다운 패키지를 추가하지 않는다.
- `dangerouslySetInnerHTML`을 사용하지 않는다.
- 지원 문법은 문단, `**굵게**`, `-`/`*` 목록, 줄바꿈으로 제한한다.
- API 계약과 로컬 대체 답변 정책은 변경하지 않는다.
- 대기 패널에는 `role="status"`와 `aria-live="polite"`를 적용한다.

---

### Task 1: 안전한 응답 포맷 파서

**Files:**
- Create: `src/utils/followUpFormat.ts`
- Create: `src/utils/followUpFormat.test.ts`

**Interfaces:**
- Produces: `parseInline(text: string): InlineToken[]`
- Produces: `parseFollowUpAnswer(text: string): AnswerBlock[]`
- Produces: `getFollowUpLoadingMessage(index: number): string`

- [ ] **Step 1: Write failing tests**

굵은 강조, 닫히지 않은 강조, 문단/목록 구조, 세 단계 순환 문구를 리터럴 기대값으로 검증한다.

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test src/utils/followUpFormat.test.ts`
Expected: FAIL because `followUpFormat.ts` does not exist.

- [ ] **Step 3: Implement minimal parser**

정규식으로 닫힌 `**...**`만 강조 토큰으로 나누고, 줄 단위로 목록 묶음과 문단을 생성한다. HTML은 문자열 토큰으로 유지한다. 로딩 문구 배열을 모듈로 연산해 순환시킨다.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test src/utils/followUpFormat.test.ts`
Expected: PASS.

### Task 2: 응답 및 로딩 컴포넌트

**Files:**
- Create: `src/components/FollowUpContent.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `parseFollowUpAnswer`, `getFollowUpLoadingMessage`
- Produces: `FormattedAnswer({ answer }: { answer: string })`
- Produces: `FollowUpLoading()`

- [ ] **Step 1: Implement token rendering**

`FormattedAnswer`가 문단은 `<p>`, 목록은 `<ul><li>`, 강조 토큰은 `<strong>`으로 출력하도록 만든다. 모든 원문은 React 텍스트 노드로 전달한다.

- [ ] **Step 2: Implement loading panel**

`FollowUpLoading`이 3.2초 간격으로 메시지 인덱스를 갱신하고 언마운트 시 interval을 해제한다. 제목, 스피너, 진행 트랙, 시간 안내를 출력한다.

- [ ] **Step 3: Connect App states**

`followUp`이 있으면 `FormattedAnswer`, `isFollowUpLoading`이면 `FollowUpLoading`, 그 외에는 기존 입력 폼을 렌더링하도록 분기한다.

- [ ] **Step 4: Add focused styles**

기존 카드 색상과 로딩 트랙을 재사용하며 `.followup-loading`, `.followup-spinner`, `.formatted-answer` 문단·목록·강조 스타일을 추가한다.

### Task 3: Verification

**Files:**
- Modify only if verification exposes a defect.

- [ ] **Step 1: Run focused and full tests**

Run: `node --test src/utils/*.test.ts workers/*.test.js`
Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run: `npm.cmd run lint`
Expected: exit code 0.

- [ ] **Step 3: Run production build**

Run: `npm.cmd run build`
Expected: exit code 0 and `dist` generated.

- [ ] **Step 4: Browser verification**

추가 질문 제출 후 입력 폼이 대기 패널로 교체되는지, 완료 답변의 `**텍스트**`가 별표 없이 굵게 표시되는지 확인한다.
