# Calm Fintech UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the local career-saju prototype as a calm, trustworthy mobile fintech report without changing its payment or analysis behavior.

**Architecture:** Keep the existing React state flow and domain calculations intact. Add a small pure report view-model for testable score presentation, replace decorative gauges/orbits with semantic report components, and consolidate visual decisions in CSS tokens and reusable classes.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node 24 test runner, CSS.

## Global Constraints

- Preserve all existing analysis, unlock, modal, and API behavior.
- Use a matte navy surface and one indigo accent; remove neon gradients and excessive glow.
- Present the verdict before evidence, followed by horizontal comparison bars and a next action.
- Use a Korean serif face only for the central verdict; use sans-serif for controls and data.
- Keep the layout mobile-first and usable at 320px width.

---

### Task 1: Report presentation model

**Files:**
- Create: `src/utils/reportViewModel.ts`
- Create: `src/utils/reportViewModel.test.ts`

**Interfaces:**
- Consumes: `{ jobChange: number; stay: number; negotiation: number }`
- Produces: `buildScoreBars(scores): ScoreBar[]` and `buildVerdict(scores): string`

- [ ] **Step 1: Write failing tests** for Korean labels, order, clamped widths, and a decisive verdict.
- [ ] **Step 2: Run `node --test src/utils/reportViewModel.test.ts`** and confirm failure because the module is absent.
- [ ] **Step 3: Implement the minimal pure functions** with stable input order and values clamped to 0–100.
- [ ] **Step 4: Re-run the Node test** and confirm all cases pass.

### Task 2: Calm fintech flow and result hierarchy

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `buildScoreBars` and `buildVerdict` from Task 1.
- Produces: semantic intro, step header, loading state, verdict card, horizontal score bars, next-action card, and quieter detail surfaces.

- [ ] **Step 1: Add a progress header** to the four input screens and remove the English trend badge.
- [ ] **Step 2: Replace the orbit loader** with a compact progress indicator and transparent status copy.
- [ ] **Step 3: Replace circular gauges** with verdict-first horizontal bars and a next-action block.
- [ ] **Step 4: Move the four-pillar table into a lower-emphasis evidence section.**
- [ ] **Step 5: Replace neon/glass tokens** with matte navy surfaces, indigo accent, subtle borders, and accessible focus states.
- [ ] **Step 6: Add 320px and reduced-motion rules** and ensure touch targets remain at least 44px.

### Task 3: Verification

**Files:**
- Verify: `src/App.tsx`, `src/index.css`, `src/utils/reportViewModel.ts`

- [ ] **Step 1: Run `node --test src/utils/reportViewModel.test.ts`.**
- [ ] **Step 2: Run `npx tsc -p tsconfig.app.json --noEmit --tsBuildInfoFile .tmp/tsconfig.app.tsbuildinfo`.**
- [ ] **Step 3: Run the Vite build with temp output paths inside the writable project root.**
- [ ] **Step 4: Inspect the final diff and confirm payment/API behavior was not changed.**
