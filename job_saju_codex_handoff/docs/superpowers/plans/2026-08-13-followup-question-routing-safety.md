# Follow-up Question Routing and Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다양한 커리어 질문을 구조적으로 분류해 관련 근거로 직접 답하고, 위험·무관·조작 질문은 질문권을 소진하지 않고 차단한다.

**Architecture:** 브라우저와 Worker가 함께 쓰는 순수 JavaScript 정책 모듈을 `workers/`에 둔다. Worker는 결정적 사전 차단, 구조화 프롬프트, AI JSON 검증을 담당하고 클라이언트는 동일 정책으로 즉시 차단하며 서버 오류 시 다중 의도 기반 로컬 폴백을 제공한다.

**Tech Stack:** TypeScript 6, JavaScript ES modules, React 19, Cloudflare Pages Functions, Node test runner

## Global Constraints

- AI 호출은 추가하지 않고 기존 추가 질문당 1회를 유지한다.
- 질문은 5~300자만 허용한다.
- 차단·서버 오류·모델 오류는 질문 사용권을 소진하지 않는다.
- 입력에 없는 경력·회사·업종을 만들어내지 않는다.
- 업종·직무 질문에 월운·협상 점수를 기본 근거로 사용하지 않는다.
- 건강·법률·투자·불법·자해·타해·타인의 속마음 단정·프롬프트 유출·무관 질문은 차단한다.

---

### Task 1: 공용 질문 판정기

**Files:**
- Create: `workers/followUpPolicy.js`
- Create: `workers/followUpPolicy.d.ts`
- Create: `workers/followUpPolicy.test.js`

**Interfaces:**
- Produces: `assessFollowUpQuestion(question: string): QuestionAssessment`
- Produces: `parseFollowUpModelResponse(raw: string): ParsedFollowUpResponse | null`
- Produces: `buildRefusalMessage(assessment: QuestionAssessment): string`

- [ ] 다양한 업종·직무·복합·구어체·제약 질문과 위험·무관 질문의 기대 판정을 테이블 테스트로 작성한다.
- [ ] `node --test workers/followUpPolicy.test.js`를 실행해 모듈 부재로 실패하는 것을 확인한다.
- [ ] 점수 기반 다중 의도, 답변 형태, 제약 추출, 결정적 차단을 최소 구현한다.
- [ ] AI JSON의 필수 분석 필드·허용 intent·200~900자 answer·금지 서론을 검증한다.
- [ ] 집중 테스트를 다시 실행해 통과시킨다.

### Task 2: Worker 안전 게이트와 구조화 응답

**Files:**
- Modify: `workers/index.js`
- Create: `workers/followUpRoute.test.js`

**Interfaces:**
- Consumes: `assessFollowUpQuestion`, `parseFollowUpModelResponse`, `buildRefusalMessage`
- HTTP 422: `{ code: "FOLLOWUP_BLOCKED", error: string, suggestion: string }`
- HTTP 200: `{ question_analysis: {...}, answer: string }`

- [ ] 가짜 KV와 가짜 Gemini fetch를 사용해 차단 질문이 AI를 호출하지 않고 KV도 쓰지 않는 라우트 테스트를 작성한다.
- [ ] 허용 질문의 프롬프트가 질문 분석 계약과 사용자 컨텍스트를 포함하는지 테스트한다.
- [ ] 잘못된 AI JSON이 502를 반환하고 KV를 쓰지 않는지 테스트한다.
- [ ] 테스트를 실행해 현재 라우트가 기대와 다르게 동작하는 RED를 확인한다.
- [ ] 사전 차단, 구조화 시스템 지침, JSON 검증, 성공 후 KV 기록을 구현한다.
- [ ] 라우트 테스트를 다시 실행해 통과시킨다.

### Task 3: 클라이언트 판정과 폴백 답변

**Files:**
- Modify: `src/utils/followUp.ts`
- Modify: `src/utils/pricing.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- `validateFollowUpQuestion`은 길이와 차단 정책을 함께 검사한다.
- `buildLocalFollowUpAnswer(question, saju, context?)`는 주·보조 의도와 사용자 컨텍스트를 반영한다.

- [ ] IT 유지·산업군·복합 질문이 올바른 의도로 분류되고 업종 폴백이 월운·협상운을 말하지 않는 실패 테스트를 추가한다.
- [ ] 차단 질문이 검증 메시지를 반환하고 허용된 모호한 커리어 질문은 통과하는 실패 테스트를 추가한다.
- [ ] 다중 의도 판정을 기존 호환 `classifyFollowUp`에 연결하고 industry·role·preparation 폴백을 추가한다.
- [ ] App에서 HTTP 422를 폴백 답변으로 바꾸지 않고 오류·재질문 안내로 표시한다.
- [ ] 집중 테스트를 통과시킨다.

### Task 4: 전체 검증

**Files:**
- Modify only if verification exposes a defect.

- [ ] `node --test src/utils/*.test.ts workers/*.test.js`로 전체 테스트를 실행한다.
- [ ] `npm.cmd run lint`를 실행한다.
- [ ] `npm.cmd run build`를 실행한다.
- [ ] 질문 케이스 표를 로컬 함수에 실행해 판정 분포와 차단 메시지를 확인한다.
