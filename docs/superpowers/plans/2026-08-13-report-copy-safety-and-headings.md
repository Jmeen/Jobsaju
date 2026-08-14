# Report Copy Safety and Headings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove misleading percentile claims, replace them with score levels, prevent unsafe AI copy, and standardize every report heading and hero label.

**Architecture:** Add a pure score-presentation module for all user-facing score labels and a pure Worker-side report-quality module for date context, language validation, and one repair attempt. Keep React responsible only for rendering presentation models and fixed heading copy. Preserve the existing rule-based score calculation and payment flow.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node test runner, Cloudflare Workers JavaScript, Gemini JSON responses.

## Global Constraints

- Do not change the underlying saju score formulas.
- Do not expose percentile, sample-size, `상위 N%`, or `하위 N%` copy in UI, share cards, AI prompts, or follow-up context.
- Score levels are: 70–100 `높음`, 55–69 `보통 이상`, 40–54 `보통`, 0–39 `낮음`.
- The current date for AI prompts is computed in `Asia/Seoul`.
- Reject disallowed script contamination and listed banned phrases before caching an AI report; retry correction at most once.
- Preserve user input as analysis context, but display a refined question title.
- Do not overwrite or revert unrelated staged or untracked user changes.

---

### Task 1: User-facing score presentation

**Files:**
- Create: `src/utils/scorePresentation.ts`
- Create: `src/utils/scorePresentation.test.ts`
- Modify: `src/utils/shareCard.ts`
- Modify: `src/utils/shareCard.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/utils/followUp.ts`
- Modify: `src/utils/premiumReport.ts`
- Modify: `src/utils/premiumReport.test.ts`

**Interfaces:**
- Produces: `buildScoreView(axis: ScoreAxis, score: number): ScoreView`
- Produces: `buildTopScore(scores: CareerScores): ScoreView`
- Produces: `buildAllScoreViews(scores: CareerScores): ScoreView[]`
- `ScoreView` contains `axis`, `axisLabel`, `score`, `level`, `tone`, `headline`, and `detail`; it never contains a percentile rank.

- [ ] **Step 1: Write failing score-boundary and top-axis tests**

```ts
assert.equal(getScoreLevel(39), '낮음');
assert.equal(getScoreLevel(40), '보통');
assert.equal(getScoreLevel(55), '보통 이상');
assert.equal(getScoreLevel(70), '높음');
assert.equal(buildTopScore({ jobChange: 63, stay: 33, negotiation: 71 }).axis, 'negotiation');
assert.equal(buildTopScore({ jobChange: 70, stay: 70, negotiation: 50 }).axis, 'jobChange');
assert.doesNotMatch(JSON.stringify(buildAllScoreViews(scores)), /상위|하위|백분위|20,000/);
```

- [ ] **Step 2: Run the new test and confirm RED**

Run: `node --test src/utils/scorePresentation.test.ts`

Expected: FAIL because `scorePresentation.ts` does not exist.

- [ ] **Step 3: Implement the minimal score presentation module**

```ts
export type ScoreLevel = '높음' | '보통 이상' | '보통' | '낮음';

export function getScoreLevel(score: number): ScoreLevel {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  if (value >= 70) return '높음';
  if (value >= 55) return '보통 이상';
  if (value >= 40) return '보통';
  return '낮음';
}
```

Use raw score descending order for `buildTopScore`; preserve axis order for ties.

- [ ] **Step 4: Convert share-card tests to score and level fields**

Remove `rank`, `topAxisRank`, and percentile assertions. Assert that the model contains `topAxisLevel`, score levels, and no forbidden percentile words.

- [ ] **Step 5: Run share-card tests and confirm RED**

Run: `node --test src/utils/shareCard.test.ts`

Expected: FAIL because the current share-card model still requires and renders ranks.

- [ ] **Step 6: Update share-card types and canvas copy**

The hero stamp displays `협상운 우세` and each score chip displays `71점 · 높음`. Change `${elementLabel} 크리처` to `${elementLabel} 개척자형` for the current character type presentation. No rank field remains in the share-card public model.

- [ ] **Step 7: Replace percentile imports and strings in UI and local report helpers**

Update `App.tsx`, `followUp.ts`, and `premiumReport.ts` to use `buildTopScore` and `buildAllScoreViews`. Remove `SAMPLE_SIZE`, percentile request payloads, percentile follow-up context, and all `상위 ${...}%` branches.

- [ ] **Step 8: Run focused tests and confirm GREEN**

Run: `node --test src/utils/scorePresentation.test.ts src/utils/shareCard.test.ts src/utils/premiumReport.test.ts src/utils/pricing.test.ts`

Expected: PASS with no percentile copy assertions.

---

### Task 2: Fixed headings and accessible character header

**Files:**
- Create: `src/utils/reportCopy.ts`
- Create: `src/utils/reportCopy.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `REPORT_HEADINGS`, a read-only object containing every fixed report heading.
- Produces: `buildCharacterTypeLabel(elementLabel: string, topAxisLabel: string): string`.

- [ ] **Step 1: Write a failing copy-contract test**

```ts
const renderedCopy = JSON.stringify(REPORT_HEADINGS);
for (const banned of [
  '입력 내용을 이렇게 이해했어요', '이번 흐름의 결론', '다음 환경',
  '내 질문에 대한 답', '상담사의 마지막 조언', '오피스 능력치',
  '밸런스 풀이', '백분위 카드',
]) assert.doesNotMatch(renderedCopy, new RegExp(banned));

assert.equal(REPORT_HEADINGS.intent, '커리어 목표와 현재 고민');
assert.equal(REPORT_HEADINGS.personalAnswer, '핵심 질문 분석');
assert.equal(buildCharacterTypeLabel('목(木)', '협상운'), '목(木) 개척자형 · 협상운 우세');
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test src/utils/reportCopy.test.ts`

Expected: FAIL because `reportCopy.ts` does not exist.

- [ ] **Step 3: Implement fixed copy constants and replace hardcoded headings**

Use the approved title mapping from the design document. Merge duplicate follow-up and share-card headings into one visible title each.

- [ ] **Step 4: Make the hero image decorative and separate text semantics**

Set the character image to `alt=""` and `aria-hidden="true"`. Add an accessible label to the hero section using the character title. Render title, type, and collection number as distinct blocks. Replace the percentile badge with `{icon} {axisLabel} 우세`.

- [ ] **Step 5: Run the heading test and typecheck**

Run: `node --test src/utils/reportCopy.test.ts`

Run: `npx tsc -b`

Expected: PASS.

---

### Task 3: AI report quality validator and Korean date context

**Files:**
- Create: `workers/reportQuality.js`
- Create: `workers/reportQuality.test.js`
- Modify: `workers/index.js`
- Modify: `workers/followUpRoute.test.js`

**Interfaces:**
- Produces: `formatSeoulDate(now?: Date): string`
- Produces: `validatePremiumReport(report: unknown): { ok: true } | { ok: false, reasons: string[] }`
- Produces: `buildRepairInstruction(reasons: string[]): string`
- Produces: `parseAndValidatePremiumReport(raw: string)` for JSON parsing plus validation.

- [ ] **Step 1: Write failing validator tests**

Cover these cases separately:

```js
assert.equal(formatSeoulDate(new Date('2026-08-12T15:30:00Z')), '2026-08-13');
assert.equal(validatePremiumReport(validReport).ok, true);
assert.equal(validatePremiumReport(withText('내 ارزش을 증명')).ok, false);
assert.equal(validatePremiumReport(withText('까다로운 정차')).ok, false);
assert.equal(validatePremiumReport(withText('높음 협상운')).ok, false);
assert.equal(validatePremiumReport(withText('최종 커리어 골인 CEO')).ok, false);
assert.equal(validatePremiumReport({ ...validReport, personal_answer: { question: '', content: '답변' } }).ok, false);
```

- [ ] **Step 2: Run validator tests and confirm RED**

Run: `node --test workers/reportQuality.test.js`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement recursive string validation**

Allow Hangul, Hanja, ASCII letters needed for job titles, digits, whitespace, punctuation, and emoji. Reject characters in Arabic, Cyrillic, Devanagari, and other explicitly disallowed Unicode script ranges. Reject the exact known bad phrases and validate required report fields without logging their contents.

- [ ] **Step 4: Add prompt-contract tests for date and tone rules**

Assert `workers/index.js` includes generated date context, `Asia/Seoul`, future-only month guidance, refined question-title requirements, and does not request percentile input or verbatim question display.

- [ ] **Step 5: Update premium and follow-up prompts**

Add `기준일: YYYY-MM-DD`, `시간대: Asia/Seoul`, and explicit rules against past-month recommendations. Replace `최종 커리어 골` with `최종 커리어 목표`. Remove percentile fields and horoscope-based salary justification. Change `personal_answer.question` contract from raw input to a concise refined title.

- [ ] **Step 6: Add one repair attempt before cache writes**

Call Gemini once, parse and validate. On failure, call it once more with the original prompt plus `buildRepairInstruction(reasons)`. Cache only a valid parsed JSON string. Return a `502 REPORT_INVALID_RESPONSE` response when the second result fails. Never include generated report text or user input in the error response.

- [ ] **Step 7: Run Worker tests and confirm GREEN**

Run: `node --test workers/reportQuality.test.js workers/followUpRoute.test.js workers/geminiModelConfig.test.js`

Expected: PASS.

---

### Task 4: Cache-version and legacy report behavior

**Files:**
- Modify: `workers/index.js`
- Modify: `workers/followUpRoute.test.js`
- Modify: `src/utils/premiumApi.test.ts`
- Modify: `src/utils/premiumApi.ts`

**Interfaces:**
- Uses `REPORT_VERSION = 'copy-v2'` in report cache keys.
- Lookup responses include `report_version` when available.

- [ ] **Step 1: Write failing cache-version tests**

Assert new interpretation requests read and write `report:copy-v2:<token>`, never overwrite `report:<token>`, and lookup can identify a legacy report without mutating it.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test workers/followUpRoute.test.js src/utils/premiumApi.test.ts`

Expected: FAIL because current code uses only `report:<token>`.

- [ ] **Step 3: Implement versioned cache keys**

Use the new key for generated reports. Keep a read-only legacy fallback for lookup. Return fixed UI copy for legacy reports, but do not perform blind body-string replacement.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test workers/followUpRoute.test.js src/utils/premiumApi.test.ts`

Expected: PASS.

---

### Task 5: Full regression and visual verification

**Files:**
- Modify only files required by failures found during verification.

- [ ] **Step 1: Search for prohibited user-facing copy**

Run:

```powershell
rg -n '또래 직장인|상위 [0-9]|하위 [0-9]|백분위|입력 내용을 이렇게 이해했어요|내 질문에 대한 답|상담사의 마지막 조언|크리처 ·|최종 커리어 골|높음 협상운|정차|ارزش' src workers
```

Expected: no user-facing matches. Comments or archived generated distribution files must not be imported by the app.

- [ ] **Step 2: Run the complete project check**

Run: `npm run check`

Expected: all tests, lint, TypeScript compilation, and Vite production build pass without warnings attributable to this change.

- [ ] **Step 3: Start the app and inspect the result screen**

Run: `npm run dev -- --host 127.0.0.1`

Verify in the browser:

- character title, type, number, and dominant-axis badge are visually separated;
- no percentile or 20,000-person comparison remains;
- score rows use score and level;
- every approved heading is present;
- premium question title is refined rather than raw input;
- share card contains score levels and no percentile wording.

- [ ] **Step 4: Review the final diff without disturbing unrelated changes**

Run: `git diff -- src workers docs/superpowers/specs/2026-08-13-report-copy-safety-and-headings-design.md docs/superpowers/plans/2026-08-13-report-copy-safety-and-headings.md`

Confirm only in-scope changes are present. Do not reset or commit unrelated staged files.
