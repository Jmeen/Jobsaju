# Repository Asset Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the outer repository the single canonical project while preserving every August 16 image and deliverable before removing the nested temporary worktree.

**Architecture:** Production images and final PDF are promoted into canonical `design-assets/characters` paths. Drafts, prior versions, generation prompts, review sheets, and helper scripts are consolidated into a dated archive under the same asset tree. The legacy handoff documents remain tracked, while their embedded `.worktrees` directory is removed through Git after hash and count verification.

**Tech Stack:** Git worktrees, Git LFS-aware repository, PowerShell filesystem and SHA-256 verification.

## Global Constraints

- Do not overwrite an existing destination file with different content.
- Preserve all untracked August 16 source images, drafts, prompts, review sheets, scripts, and final deliverables.
- Verify source and destination SHA-256 manifests before removing the worktree.
- Keep `C:\GoogleDrive\job_saju_codex_handoff` as the only runnable application root.

---

### Task 1: Capture source manifest and validate destinations

**Files:**
- Read: `job_saju_codex_handoff/.worktrees/gap-guardian-zodiac-set/**`
- Create: `design-assets/characters/_archive/2026-08-16-guardian-generation/source-manifest.csv`

- [x] **Step 1:** Enumerate all files that will be preserved, recording relative path, byte length, modified time, and SHA-256.
- [x] **Step 2:** Confirm no destination collision has different content.
- [x] **Step 3:** Record the expected source file count and total bytes.

### Task 2: Consolidate final and archival assets

**Files:**
- Create: `design-assets/characters/baby-guardians/**`
- Create: `design-assets/characters/jobsaju-60-guardians-v2.4-production/**`
- Create: `design-assets/characters/_archive/2026-08-16-guardian-generation/**`
- Create: `docs/superpowers/plans/2026-08-16-guardian-heavenly-stem-recolor.md`
- Create: `docs/superpowers/specs/2026-08-16-guardian-heavenly-stem-color-design.md`

- [x] **Step 1:** Copy the six baby guardian images from both nested asset locations into the canonical baby guardian directory.
- [x] **Step 2:** Copy the 60 production images and final catalog PDF into the canonical production directory.
- [x] **Step 3:** Copy all drafts, earlier versions, prompts, review sheets, and helper scripts into the dated archive without flattening their source paths.
- [x] **Step 4:** Copy the two new design documents into the outer documentation tree.

### Task 3: Verify preservation and remove temporary worktree

**Files:**
- Remove after verification: `job_saju_codex_handoff/.worktrees/gap-guardian-zodiac-set/**`

- [x] **Step 1:** Recompute destination SHA-256 values and require every manifest entry to match.
- [x] **Step 2:** Confirm the worktree branch has no code changes relative to `master`.
- [x] **Step 3:** Remove the registered worktree with `git worktree remove --force` only after Steps 1 and 2 succeed.
- [x] **Step 4:** Prune stale worktree metadata and verify `git worktree list` contains only the outer repository.

### Task 4: Verify the canonical project

**Files:**
- Modify: `vite.config.ts` (retain existing `.worktrees` watch exclusion)

- [x] **Step 1:** Run the application build from the outer repository.
- [x] **Step 2:** Verify the canonical asset counts and final PDF presence.
- [x] **Step 3:** Inspect `git status --short --branch` and report all remaining tracked and untracked changes.
