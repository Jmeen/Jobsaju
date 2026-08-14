# Mobile-first Report Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the result report mobile-first, visually focus attention on the character, and render long report copy as readable paragraphs without changing product behavior.

**Architecture:** Keep all report state, calculations, unlock rules, payment calls, and sharing logic in the existing flow. Add one pure text segmentation helper plus a focused React renderer, then update result markup and CSS classes so mobile and desktop use the same centered single-column hierarchy.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node test runner, server-side React rendering, vanilla CSS.

## Global Constraints

- The result layout remains a centered single column with a maximum width of 540px.
- Mobile below 480px uses 16 to 20px horizontal gutters; the screen must work at 320px without horizontal scrolling.
- Body copy in long-form report cards is 15px with approximately 1.75 line height.
- The character stage is approximately 82vw with a maximum width of 340px, and character occupancy is 82 to 86%.
- Do not change saju calculations, API calls, unlock/payment behavior, sharing behavior, or report copy meaning.
- Preserve the existing free/paid access boundary even when reordering evidence.
- Keep all interactive targets at least 44px and retain visible focus styles and reduced-motion behavior.

---

## File Structure

- Create `src/utils/reportProse.ts`: pure normalization and paragraph segmentation for report copy.
- Create `src/utils/reportProse.test.ts`: unit tests for newlines, whitespace, and empty input.
- Create `src/components/ReportProse.tsx`: semantic paragraph renderer shared by premium report cards.
- Create `src/components/ReportProse.test.ts`: server-rendered markup test for paragraph output and safe text escaping.
- Modify `src/App.tsx`: use `ReportProse`, add result grouping classes, and place technical evidence at the latest free-access position without changing access semantics.
- Modify `src/index.css`: mobile-first width, character emphasis, typography, spacing, responsive collapse, and lower-emphasis evidence styling.

---

### Task 1: Semantic report prose

**Files:**
- Create: `src/utils/reportProse.ts`
- Create: `src/utils/reportProse.test.ts`
- Create: `src/components/ReportProse.tsx`
- Create: `src/components/ReportProse.test.ts`

**Interfaces:**
- Consumes: `text: string`
- Produces: `splitReportParagraphs(text: string): string[]`
- Produces: `ReportProse({ text, className? }: { text: string; className?: string }): JSX.Element`

- [ ] **Step 1: Write failing unit tests for paragraph segmentation**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { splitReportParagraphs } from './reportProse';

test('splits newline-delimited report copy into trimmed paragraphs', () => {
  assert.deepEqual(
    splitReportParagraphs('First point.\n\n Second point. \nThird point.'),
    ['First point.', 'Second point.', 'Third point.'],
  );
});

test('keeps copy without line breaks as one paragraph', () => {
  assert.deepEqual(splitReportParagraphs('One uninterrupted report paragraph.'), [
    'One uninterrupted report paragraph.',
  ]);
});

test('drops whitespace-only content', () => {
  assert.deepEqual(splitReportParagraphs(' \n\t\n '), []);
});
```

- [ ] **Step 2: Run the unit test and verify it fails**

Run: `node --test src/utils/reportProse.test.ts`

Expected: FAIL because `src/utils/reportProse.ts` does not exist.

- [ ] **Step 3: Implement the pure segmentation helper**

```ts
export function splitReportParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
}
```

- [ ] **Step 4: Run the helper test and verify it passes**

Run: `node --test src/utils/reportProse.test.ts`

Expected: 3 passing tests.

- [ ] **Step 5: Write a failing server-rendered component test**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportProse } from './ReportProse';

test('renders each report paragraph as safe semantic markup', () => {
  const html = renderToStaticMarkup(createElement(ReportProse, {
    text: 'First paragraph.\n<script>alert(1)</script>',
  }));

  assert.match(html, /class="report-prose"/);
  assert.equal((html.match(/<p>/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
```

- [ ] **Step 6: Run the component test and verify it fails**

Run: `node --test src/components/ReportProse.test.ts`

Expected: FAIL because `src/components/ReportProse.tsx` does not exist.

- [ ] **Step 7: Implement the semantic renderer**

```tsx
import { splitReportParagraphs } from '../utils/reportProse';

type ReportProseProps = {
  text: string;
  className?: string;
};

export function ReportProse({ text, className = '' }: ReportProseProps) {
  const classes = ['report-prose', className].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      {splitReportParagraphs(text).map((paragraph, index) => (
        <p key={`${index}-${paragraph}`}>{paragraph}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Run both focused tests**

Run: `node --test src/utils/reportProse.test.ts src/components/ReportProse.test.ts`

Expected: all tests pass.

- [ ] **Step 9: Commit the semantic prose unit**

```powershell
git add src/utils/reportProse.ts src/utils/reportProse.test.ts src/components/ReportProse.tsx src/components/ReportProse.test.ts
git commit -m "feat: render report copy as readable paragraphs"
```

---

### Task 2: Result hierarchy and character emphasis

**Files:**
- Modify: `src/App.tsx:21`
- Modify: `src/App.tsx:1418-1905`
- Modify: `src/index.css:730-1120`

**Interfaces:**
- Consumes: `ReportProse` from Task 1.
- Produces: result markup grouped by `.result-primary`, `.report-details`, and `.result-evidence`; long-form copy rendered by `ReportProse`.

- [ ] **Step 1: Import `ReportProse` in `src/App.tsx`**

```tsx
import { ReportProse } from './components/ReportProse';
```

- [ ] **Step 2: Replace all four long-form `<p className="report-prose">` elements**

Replace personal answer, current dilemma, career nature, and ideal environment bodies with:

```tsx
<ReportProse text={aiReport.personal_answer.content} />
<ReportProse text={aiReport.current_dilemma.content} />
<ReportProse text={aiReport.career_nature.content} />
<ReportProse text={aiReport.ideal_environment.content} />
```

Use the corresponding field in each card. Do not change the text or data guards.

- [ ] **Step 3: Add result grouping classes without changing state conditions**

Wrap character, verdict, strongest flow, score comparison, next action, and month brief in:

```tsx
<div className="result-primary">...</div>
```

Wrap the unlocked AI report cards and roadmap in:

```tsx
<div className="report-details">...</div>
```

Keep `.locked-area`, `isUnlocked`, and `.blur-content` in their current relationship.

- [ ] **Step 4: Move technical evidence to the latest valid free-access position**

Move the existing `.evidence-card` block from before `.locked-area` to immediately after `.locked-area` and before the unlocked follow-up section. Do not place it inside `.locked-area`; it must remain free content.

Add the class combination:

```tsx
<div className="glass-card evidence-card result-evidence">
```

Replace the outer inline `padding: 18` with CSS. Do not alter pillar calculations or displayed values.

- [ ] **Step 5: Update mobile-first container and major spacing CSS**

Use the following exact rules as the base, adapting only selector placement to avoid duplicate declarations:

```css
.app-container {
  width: 100%;
  max-width: 540px;
  padding: 24px 20px 40px;
}

.result-primary,
.report-details {
  display: flex;
  flex-direction: column;
}

.result-primary { gap: 20px; }
.report-details { gap: 22px; }
.result-primary > *,
.report-details > * { margin-bottom: 0; }
```

- [ ] **Step 6: Make the character dominant and quiet the frame**

```css
.creature-hero { margin-bottom: 4px; }

.creature-hero-stage {
  width: min(340px, 82vw);
  margin-bottom: 16px;
  border: 1px solid color-mix(in srgb, var(--tone-color, #64748b) 42%, #273149);
  background: radial-gradient(circle at 50% 46%, rgba(148, 163, 184, .1), rgba(18, 16, 28, 0) 68%), #12101c;
  box-shadow: 0 16px 32px rgba(0, 0, 0, .24);
}

.creature-hero-img {
  inset: 7%;
  width: 86%;
  height: 86%;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, .3));
}

.creature-hero-badge {
  border-width: 1px;
  border-color: color-mix(in srgb, var(--tone-color, #94a3b8) 48%, #334155);
  font-size: 11.5px;
}
```

- [ ] **Step 7: Strengthen long-form hierarchy and evidence de-emphasis**

```css
.premium-section { padding: 28px 24px; }
.premium-section h3 {
  max-width: calc(100% - 36px);
  margin: 10px 0 20px;
  font-size: clamp(20px, 5vw, 22px);
  line-height: 1.5;
}
.report-prose { color: var(--text-secondary); font-size: 15px; line-height: 1.75; }
.report-prose p { margin: 0 0 14px; overflow-wrap: anywhere; word-break: keep-all; }
.report-prose p:last-child { margin-bottom: 0; }
.result-evidence { margin-top: 28px; padding: 18px; opacity: .68; }
```

- [ ] **Step 8: Add compact-screen behavior**

```css
@media (max-width: 480px) {
  .app-container { padding-inline: 18px; }
}

@media (max-width: 360px) {
  .app-container { padding-inline: 16px; }
  .creature-hero-stage { width: min(340px, 88vw); }
  .creature-hero-no { top: 8px; left: 8px; }
  .creature-hero-badge { right: 8px; bottom: 8px; padding: 5px 9px; }
  .premium-section { padding: 24px 18px; }
  .trait-grid, .check-list, .action-columns { grid-template-columns: 1fr; }
}
```

- [ ] **Step 9: Run focused and full static checks**

Run:

```powershell
node --test src/utils/reportProse.test.ts src/components/ReportProse.test.ts
npx tsc -p tsconfig.app.json --noEmit --tsBuildInfoFile .tmp/tsconfig.app.tsbuildinfo
npm run lint
```

Expected: all commands exit 0.

- [ ] **Step 10: Commit result presentation changes**

```powershell
git add src/App.tsx src/index.css
git commit -m "style: improve mobile report readability"
```

---

### Task 3: Regression and visual verification

**Files:**
- Verify: `src/App.tsx`
- Verify: `src/index.css`
- Verify: `src/components/ReportProse.tsx`
- Verify: `src/utils/reportProse.ts`

**Interfaces:**
- Consumes: completed result presentation from Tasks 1 and 2.
- Produces: verified production build and viewport inspection evidence.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: all existing and new tests pass.

- [ ] **Step 2: Run lint and the production build**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit 0 and Vite writes a successful production bundle.

- [ ] **Step 3: Inspect the functional diff**

Run:

```powershell
git diff HEAD~2 -- src/App.tsx src/index.css src/components/ReportProse.tsx src/utils/reportProse.ts
rg -n "requestPayment|requestPremiumReport|setIsUnlocked|shareCareerResult|calculateSaju" src/App.tsx
```

Expected: the diff changes result markup and CSS only; payment, unlock, API, sharing, and calculation function bodies are unchanged.

- [ ] **Step 4: Start the local preview for visual QA**

Run: `npm run dev -- --host 127.0.0.1`

Inspect 320px, 390px, 540px, and 1280px viewport widths. Confirm:

- no horizontal scrolling;
- the character image occupies more area than its frame decoration;
- desktop retains the mobile card order and stops growing at 540px;
- report titles are visually distinct from 15px body copy;
- source newline breaks render as separate paragraphs;
- two-column grids collapse at compact width;
- technical evidence appears after the decision-oriented report while remaining free.

- [ ] **Step 5: Confirm keyboard and reduced-motion behavior**

Tab through all visible controls and verify focus rings remain visible and targets are at least 44px. Emulate `prefers-reduced-motion: reduce` and confirm animations are effectively disabled.

- [ ] **Step 6: Record final status**

Run: `git status --short`

Expected: no unintended generated files are staged or tracked. Report any pre-existing unrelated changes without modifying them.
