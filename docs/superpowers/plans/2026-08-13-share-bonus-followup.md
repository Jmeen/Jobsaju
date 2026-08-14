# Share Bonus Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개인화된 공유 후킹 문구와 공유 보상형 두 번째 질문을 구현하고 결과 화면 구조를 정리한다.

**Architecture:** 공유 유형 문구와 보상 판정을 순수 유틸리티로 분리한다. 프런트는 질문 기록을 배열로 저장하고 공유 성공 후 서버에 보너스를 등록하며, Worker는 KV 키로 두 번째 질문 권한과 소진을 검증한다.

**Tech Stack:** React, TypeScript, Cloudflare Pages Functions/Workers, Node test runner

## Global Constraints

- 기본 질문 1회, 공유 성공 후 추가 1회만 허용한다.
- 카카오 CTA는 `내 사주도 확인하기`다.
- 다운로드와 공유 취소에는 보너스를 지급하지 않는다.
- 기존 저장 세션을 깨뜨리지 않는다.

---

### Task 1: 공유 문구와 보상 판정

**Files:**
- Create: `src/utils/shareIncentive.ts`
- Modify: `src/utils/kakaoShare.ts`
- Test: `src/utils/shareIncentive.test.ts`, `src/utils/kakaoShare.test.ts`

**Interfaces:**
- Produces: `buildShareHook(scores): string`, `earnsBonusQuestion(result): boolean`
- Consumes: `shareCareerResult({ blob, serviceUrl, kakaoKey, shareHook })`

- [x] **Step 1: Write failing tests for the three result labels and share payload.**
- [x] **Step 2: Run targeted tests and confirm missing implementation failures.**
- [x] **Step 3: Implement the smallest mapping and pass the hook through every share path.**
- [x] **Step 4: Run targeted tests.**

### Task 2: 서버 보너스 권한

**Files:**
- Modify: `workers/index.js`
- Test: `workers/followUpRoute.test.js`

**Interfaces:**
- Consumes: `POST /api/share-bonus` with `unlock_token`
- Produces: second follow-up authorization through `question_index: 2`

- [x] **Step 1: Write a failing test that allows question two only with a bonus key and rejects question three.**
- [x] **Step 2: Run the route test and confirm the second question is rejected.**
- [x] **Step 3: Add bonus registration and per-index KV usage keys.**
- [x] **Step 4: Run Worker tests.**

### Task 3: 결과 화면과 질문 상태

**Files:**
- Modify: `src/App.tsx`, `src/App.css`

**Interfaces:**
- Consumes: share hook and bonus endpoint
- Produces: two-entry follow-up thread with the approved CTA

- [x] **Step 1: Migrate persisted single follow-up records into an array.**
- [x] **Step 2: Append answers and submit `question_index`.**
- [x] **Step 3: Register the bonus after successful sharing and expose the approved CTA.**
- [x] **Step 4: Move the question section immediately above the character share card.**
- [x] **Step 5: Remove the `결` marks and free result card preview.**

### Task 4: Verification

**Files:**
- Verify all modified files

- [x] **Step 1: Run the complete test suite.**
- [x] **Step 2: Run lint.**
- [x] **Step 3: Run the production build.**
- [x] **Step 4: Review the diff against every approved requirement.**
