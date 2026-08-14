# Share Benefit Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공유받는 사람이 6개월 로드맵과 직접 질문 기능의 가치를 이해하도록 공유 문구를 강화한다.

**Architecture:** 결과별 제목은 `shareIncentive`에서 만들고, 공통 효용 설명은 `kakaoShare`의 Kakao/Web Share 경로에서 재사용한다. 기본 URL 공유는 정적 Open Graph와 Twitter 메타데이터를 같은 가치 제안으로 맞춘다.

**Tech Stack:** TypeScript, Kakao JavaScript SDK, HTML Open Graph, Node test runner

## Global Constraints

- 공유 이미지와 보너스 질문권 로직은 변경하지 않는다.
- 제목은 결과 유형을 개인화한다.
- 설명에는 `6개월 이직 타이밍`과 `직접 질문`을 모두 포함한다.

---

### Task 1: 개인화된 효용 중심 공유 문구

**Files:**
- Modify: `src/utils/shareIncentive.test.ts`, `src/utils/shareIncentive.ts`
- Modify: `src/utils/kakaoShare.test.ts`, `src/utils/kakaoShare.ts`

**Interfaces:**
- Consumes: `CareerScores`, 이미지 URL, 서비스 URL
- Produces: 개인화 제목과 Kakao/Web Share 메시지

- [x] **Step 1: 새 제목·설명·CTA를 요구하는 테스트를 작성한다.**
- [x] **Step 2: 대상 테스트가 기존 문구 때문에 실패하는지 확인한다.**
- [x] **Step 3: 승인 문구를 최소 변경으로 구현한다.**
- [x] **Step 4: 대상 테스트를 통과시킨다.**

### Task 2: 기본 URL 미리보기 문구

**Files:**
- Modify: `workers/openGraph.test.js`, `index.html`

**Interfaces:**
- Produces: Kakao 및 SNS 링크 미리보기 제목과 설명

- [x] **Step 1: 승인된 Open Graph 문구 테스트를 작성한다.**
- [x] **Step 2: 기존 메타데이터로 실패하는지 확인한다.**
- [x] **Step 3: Open Graph와 Twitter 메타데이터를 수정한다.**
- [x] **Step 4: 전체 테스트, 린트, 빌드를 실행한다.**
