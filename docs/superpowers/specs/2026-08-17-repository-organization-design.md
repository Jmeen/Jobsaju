# Repository Organization Design

## Goal

Keep `C:\GoogleDrive\job_saju_codex_handoff` as the single runnable application repository, move non-production design history to `C:\GoogleDrive\job_saju_archive`, and make the remaining project structure understandable without changing application behavior.

## Safety constraints

- Preserve every user-created file. Archive candidates are copied first, verified by SHA-256 and byte count, and removed from the project only after verification succeeds.
- Do not overwrite a different file at the archive destination. Identical existing files may be reused after hash verification.
- Preserve all current unrelated Git changes.
- Never copy `.env.production.local` or any other secret into the archive.
- Do not change runtime code structure merely for aesthetics. Any moved file reference must be updated and verified.
- Do not deploy, push, or run remote Cloudflare operations.

## Target structure

```text
C:\GoogleDrive\
├─ job_saju_codex_handoff\
│  ├─ src\
│  ├─ workers\
│  ├─ functions\
│  ├─ public\
│  ├─ migrations\
│  ├─ scripts\
│  ├─ docs\
│  │  ├─ product\
│  │  ├─ engineering\
│  │  ├─ operations\
│  │  ├─ qa\
│  │  ├─ mockups\
│  │  └─ superpowers\
│  └─ design-assets\
│     └─ characters\
│        └─ production\
└─ job_saju_archive\
   └─ 2026-08-guardian-assets\
      ├─ drafts\
      ├─ previous-versions\
      ├─ prompts\
      ├─ review-sheets\
      ├─ legacy-repository\
      └─ manifests\
```

Root-level build and runtime files such as `package.json`, `index.html`, TypeScript/Vite/Wrangler configuration, `free_engine_characters.js`, and secret environment files remain at the root when their current paths are part of runtime or tooling contracts.

## Classification rules

### Keep in the project

- Application source, Worker code, functions, migrations, scripts, tests, and runtime public assets.
- The final guardian production image set and final delivery documents that are still useful to the running product or current production workflow.
- Current product, engineering, operations, QA, mockup, design, and implementation documentation.
- Root files required by package scripts, Vite, TypeScript, Wrangler, HTML entry points, or existing imports.

### Move to the external archive

- Character drafts, concept explorations, samples, prior versions, generation prompts, review sheets, helper scripts used only for asset generation, and superseded deliverables.
- The loose generated screenshot `Codex 이미지 2026년 8월 13일 오후 03_08_16.png` unless a live reference proves it is current project documentation.
- Historical files from the former nested `job_saju_codex_handoff/` repository. Files already absent from disk are restored from the current Git tree directly into `legacy-repository/` before their project deletion is finalized.

### Remove only when reproducible or empty

- `dist/`, because it is reproduced by the build.
- Empty `.worktrees/`, empty nested `job_saju_codex_handoff/`, and inactive ignored scratch directories.
- Generated caches covered by `.gitignore`.

No unique source artifact is deleted.

## Documentation organization

Root documentation is moved only after a repository-wide reference scan:

- Product/domain documents → `docs/product/`
- API and AI-system engineering documents → `docs/engineering/`
- Deployment and Kakao setup documents → `docs/operations/`
- QA reports and datasets → `docs/qa/`

When a root path is referenced by code, configuration, or an external operational contract that cannot safely be updated, that file remains at the root. Moved references are updated in the same change. Historical Superpowers plans/specs remain under their current dated directories.

## Archive transaction

1. Inventory every archive candidate with source path, destination path, byte length, modified time, and SHA-256.
2. Validate that no destination contains different content.
3. Copy candidates to the archive without deleting sources.
4. Recompute the destination manifest and require a one-to-one hash and byte-count match.
5. Write `manifests/archive-manifest.csv` and an archive `README.md` explaining provenance and restoration.
6. Only after verification, remove the archived sources from the project and stage tracked moves/deletions explicitly.

If any comparison fails, stop with both source and archive copies intact.

## Reference and behavior verification

- Search the entire tracked project for every moved old path and update remaining references.
- Verify the final 60-guardian production asset count and any expected deliverable PDFs.
- Run `npm run check` from the canonical project root.
- Run `git diff --check` and inspect `git status --short` to ensure unrelated user changes remain present.
- Confirm the nested project and worktree directories are absent or empty and that Git reports only the canonical worktree.

## Git strategy

The organization is committed separately from unrelated user work. Exact paths are staged rather than using broad `git add`. The external archive is intentionally outside Git; its manifest and README provide recovery metadata. Existing history continues to retain formerly tracked nested-repository documents.

## Success criteria

- The application has one obvious runnable root.
- Only current production assets remain inside the repository's production asset tree.
- All non-production assets exist in the external archive with verified hashes.
- Root documentation is reduced to files that must remain there; other documents are categorized under `docs/`.
- No stale internal reference points to a moved path.
- The full test, lint, typecheck, and production build checks pass.
- All unrelated pre-existing Git changes are preserved.
