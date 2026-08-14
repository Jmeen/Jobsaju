# Share Card Domain Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the strategy conclusion and divider from the visible 800×800 share card and render `Jobsaju.kr` as its only footer copy.

**Architecture:** Keep the existing share-card model and callers unchanged. Add a focused renderer test that records Canvas text and path calls, then minimally remove the conclusion/divider drawing block and replace the footer string in the dedicated Canvas renderer.

**Tech Stack:** TypeScript, Canvas 2D API, Node.js built-in test runner, Vite

## Global Constraints

- Modify only the live renderer in `src/utils/shareCard.ts`; do not change the unused 400×400 renderer in `src/App.tsx`.
- Preserve `ShareCardInput.conclusion` and `ShareCardModel.conclusion` for caller compatibility.
- Preserve the character, title, scores, collection number, dimensions, colors, and borders.
- Render the exact case-sensitive domain string `Jobsaju.kr` at the existing footer position.
- Do not render the conclusion text or the horizontal divider above it.

---

### Task 1: Simplify the visible share-card footer

**Files:**
- Modify: `src/utils/shareCard.test.ts`
- Modify: `src/utils/shareCard.ts:230-245`

**Interfaces:**
- Consumes: `drawShareCard(canvas: HTMLCanvasElement, model: ShareCardModel, characterImage?: HTMLImageElement): void`
- Produces: the same `drawShareCard` signature, with updated Canvas output only

- [x] **Step 1: Write the failing renderer test**

Extend the import and add a lightweight Canvas recorder. The recorder must return gradient stubs from `createLinearGradient` and `createRadialGradient`, record arguments passed to `fillText`, `moveTo`, and `lineTo`, and provide no-op implementations for the other methods called by `drawShareCard`.

```ts
import { buildShareCardModel, canvasToPngBlob, drawShareCard } from './shareCard.ts';

test('공유 카드에서 결론과 구분선을 빼고 Jobsaju.kr만 푸터로 표시한다', () => {
  const texts: string[] = [];
  const paths: Array<[string, number, number]> = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect() {}, beginPath() {}, roundRect() {}, stroke() {}, fill() {},
    save() {}, clip() {}, restore() {},
    fillText(text: string) { texts.push(text); },
    moveTo(x: number, y: number) { paths.push(['moveTo', x, y]); },
    lineTo(x: number, y: number) { paths.push(['lineTo', x, y]); },
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const model = buildShareCardModel(baseInput({ conclusion: '현직을 유지하며 면접 전략을 재정비하세요.' }));

  drawShareCard(canvas as unknown as HTMLCanvasElement, model);

  assert.ok(texts.includes('Jobsaju.kr'));
  assert.ok(!texts.includes(model.conclusion));
  assert.ok(!paths.some(([, x, y]) => x === 60 && y === 662));
  assert.ok(!paths.some(([, x, y]) => x === 740 && y === 662));
});
```

- [x] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node --test src/utils/shareCard.test.ts
```

Expected: FAIL because the renderer still draws `model.conclusion`, draws the divider at y=662, and does not draw the exact standalone string `Jobsaju.kr`.

- [x] **Step 3: Implement the minimal Canvas change**

Delete the divider and conclusion drawing block in `drawShareCard`. Replace the existing footer CTA with the exact domain string while preserving its position and typography.

```ts
  // 8. 하단 도메인
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.font = `500 13px ${font}`;
  ctx.fillText('Jobsaju.kr', 60, H - 46);
```

Do not remove `conclusion` from the input/model types or `buildShareCardModel`.

- [x] **Step 4: Run the focused test and verify it passes**

Run:

```powershell
node --test src/utils/shareCard.test.ts
```

Expected: all tests in `src/utils/shareCard.test.ts` PASS.

- [x] **Step 5: Run project verification**

Run:

```powershell
npm run check
```

Expected: tests, lint, TypeScript compilation, and Vite production build all PASS.

- [x] **Step 6: Review the production diff**

Run:

```powershell
git diff --check -- src/utils/shareCard.ts src/utils/shareCard.test.ts
git diff -- src/utils/shareCard.ts src/utils/shareCard.test.ts
```

Expected: only the focused renderer test and the removal/replacement of the Canvas conclusion/footer block are present.

- [x] **Step 7: Commit the implementation when repository identity is available**

```powershell
git add -- src/utils/shareCard.ts src/utils/shareCard.test.ts
git commit -m "fix: simplify share card footer"
```

Git author identity remains unset, so the verified files are intentionally left uncommitted without changing repository or global Git identity.
