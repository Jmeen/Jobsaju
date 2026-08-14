# Personalization Evaluation Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable local QA harness with 30 synthetic career personas and 15 contrast pairs, then improve the report generator until it passes explicit personalization, ambiguity, hallucination, and style gates.

**Architecture:** Keep evaluation fixtures separate from production logic. A deterministic scorer evaluates the existing local fallback report using required facts, prohibited claims, intent interpretation, section completeness, and banned AI-like phrasing; a CLI prints aggregate and per-case failures. Production changes are driven by failing tests and rerun against a held-out split.

**Tech Stack:** TypeScript 6, Node 24 built-in test runner, existing React/Vite project.

## Global Constraints

- Use no real names, employers, email addresses, or other personal data in fixtures.
- Keep 20 development personas and 10 held-out personas visibly marked.
- Include exactly 30 personas and 15 one-variable contrast pairs.
- Do not use an LLM judge as the only quality gate.
- Do not modify payment, unlock, or saju calculation behavior.
- Treat ambiguous role acronyms as unresolved unless responsibility signals disambiguate them.

---

### Task 1: Evaluation fixtures and contracts

**Files:**
- Create: `src/evals/personalizationCases.ts`
- Create: `src/evals/personalizationCases.test.ts`

**Interfaces:**
- Produces `PERSONALIZATION_CASES: PersonalizationCase[]` and `CONTRAST_PAIRS: ContrastPair[]`.
- Each case contains `context`, `scores`, `expected.requiredTerms`, `expected.forbiddenTerms`, `expected.roleKind`, and `split`.

- [ ] Write tests asserting exactly 30 unique cases, 20 development and 10 held-out cases, 15 valid contrast pairs, no PII-like email, and complete expectations.
- [ ] Run the test and confirm failure because fixtures do not exist.
- [ ] Implement fixtures covering junior, mid-career, leader, executive ambiguity, burnout, and offer comparison scenarios.
- [ ] Re-run the fixture test and confirm it passes.

### Task 2: Deterministic report scorer

**Files:**
- Create: `src/evals/personalizationScorer.ts`
- Create: `src/evals/personalizationScorer.test.ts`

**Interfaces:**
- Consumes a `PersonalizationCase` and the result of `buildPremiumExpansion`.
- Produces `EvaluationResult` with checks for intent, required input use, forbidden claims, ambiguity handling, completeness, and banned style patterns.

- [ ] Write tests using intentionally good and bad reports and assert the scorer identifies each named failure.
- [ ] Run the test and confirm failure because the scorer does not exist.
- [ ] Implement literal, deterministic checks without external model calls.
- [ ] Re-run and confirm all scorer tests pass.

### Task 3: Baseline run and production improvements

**Files:**
- Modify: `src/utils/premiumReport.ts`
- Modify: `src/utils/premiumReport.test.ts`
- Create: `src/evals/runPersonalizationEval.ts`

**Interfaces:**
- CLI evaluates development or held-out cases and exits non-zero when launch gates fail.
- Production report preserves input facts, distinguishes role responsibilities, and marks conflicting or insufficient input.

- [ ] Add a regression test for the highest-frequency baseline failure.
- [ ] Run it and confirm the expected failure.
- [ ] Improve intent summarization and report copy using only verified input details.
- [ ] Run the 20-case development evaluation; repeat until every hard gate passes.
- [ ] Run the 10-case held-out evaluation once and record results.

### Task 4: Project integration and verification

**Files:**
- Modify: `package.json`
- Create: `job_saju_codex_handoff/eval-results/personalization-baseline.md`

**Interfaces:**
- Adds `npm run eval:personalization` for repeatable QA.

- [ ] Add a script that runs the deterministic QA CLI.
- [ ] Save aggregate results and remaining limitations in the evaluation report.
- [ ] Run all Node tests, TypeScript typecheck, oxlint, Worker syntax check, and Vite production build.
