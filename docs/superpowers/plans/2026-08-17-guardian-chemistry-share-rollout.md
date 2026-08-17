# Guardian Chemistry Share Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the analytics baseline is collected, replace duplicate share UI with one compact guardian chemistry block, 60 production guardian images, a guardian-first share card, and an attributed invite banner for every user.

**Architecture:** Typed guardian-domain modules derive properties from the existing 60 IDs, calculate symmetric chemistry as pure functions, and select deterministic best/worst matches. React renders one small chemistry/share component before the paywall; the existing share pipeline is reused with guardian content and an attributed landing URL, while analytics from the baseline plan measures the full loop.

**Tech Stack:** React 19, TypeScript 6, Node test runner, Canvas API, Pillow asset pipeline, Cloudflare Pages Functions/Workers, R2, KV, D1, Kakao JavaScript SDK

## Global Constraints

- Do not start this plan until the analytics-only build has collected the approved baseline period or sample.
- Roll out to all users; do not add an experiment variant or percentage flag.
- `score(A, B) === score(B, A)` for all 1,770 unique guardian pairs.
- Use only stem combination, branch six harmony, branch clash, five-element generation, and five-element control in MVP scoring.
- Show `직장 케미 N점`, never a percentage, `최악`, `상극`, or advice to avoid a person.
- Use one visible share CTA: `친구에게 물어보기` inside the chemistry block above the paid CTA.
- The share image shows only the current guardian, one short trait, and `너는 어떤 수호신일까?`.
- Invalid `fromGuardian` is ignored; missing images fall back to the existing emoji.
- Reuse one `shareId` for repeated shares of the same result; a recipient's new result receives a new result/share flow.
- Preserve existing Kakao, Web Share, file, download, paid-report, and one-time share-reward behavior.
- Existing unrelated worktree changes must remain untouched.

---

## File Structure

- `src/domain/guardian/guardianIds.ts`: typed 60-ID allowlist, validator, and parser.
- `src/domain/guardian/guardianCatalog.ts`: character copy and `GuardianId → /guardians/NN.webp` registry.
- `src/domain/guardian/relations.ts`: immutable stem, branch, and element relation tables.
- `src/domain/guardian/calculateChemistry.ts`: symmetric pure score and dominant-relation calculation.
- `src/domain/guardian/selectGuardianMatches.ts`: deterministic BEST/WORST selection.
- `src/domain/guardian/chemistryCopy.ts`: UI copy map independent of calculation.
- `src/domain/guardian/*.test.ts`: exhaustive parsing, symmetry, score, tie, distribution, and asset tests.
- `scripts/optimize_guardians.py`: deterministic conversion of approved PNGs to transparent delivery WebP files.
- `public/guardians/01.webp` … `public/guardians/60.webp`: delivery images.
- `src/components/GuardianChemistryPanel.tsx`: compact two-relation UI and single CTA.
- `src/components/GuardianInviteBanner.tsx`: validated invite context on the existing intro screen.
- `src/utils/guardianInvite.ts`: query parsing, attribution persistence, and landing URL construction.
- `src/utils/shareCard.ts`: repurposed guardian-only 800×800 share-card model, renderer, and existing PNG conversion helper.
- `src/contexts/AppContext.tsx`: guardian share preparation, attribution events, and existing reward integration.
- `src/components/screens/ResultScreen.tsx`: insert panel and remove three old share surfaces.
- `src/components/screens/IntroScreen.tsx`: insert invite banner without changing the input flow.
- `src/index.css`: responsive chemistry and invite styles.
- `src/utils/kakaoShare.ts`, `workers/sharePage.js`: separate direct Kakao landing URL from Web Share preview URL.

### Task 1: Build the typed guardian catalog and 60-image delivery pipeline

**Files:**
- Create: `src/domain/guardian/guardianIds.ts`
- Create: `src/domain/guardian/guardianCatalog.ts`
- Create: `src/domain/guardian/guardianCatalog.test.ts`
- Create: `scripts/optimize_guardians.py`
- Create: `public/guardians/01.webp` through `public/guardians/60.webp`

**Interfaces:**
- Consumes: `free_engine_characters.js` and `design-assets/characters/jobsaju-60-guardians-v2.4-production/NN_*.png`.
- Produces: `GuardianId`, `GUARDIAN_IDS`, `isGuardianId`, `parseGuardianId`, `getGuardian`, and `listGuardians`.

`getGuardian` and `listGuardians` expose this immutable domain shape:

```ts
export type Guardian = Readonly<{
  id: GuardianId;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  yinYang: 'yin' | 'yang';
  name: string;
  emoji: string;
  coreType: string;
  shortTrait: string;
  identity: string;
  keywords: readonly string[];
  imageUrl: string;
}>;
```

- [ ] **Step 1: Write failing catalog and asset tests**

```ts
import { access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

async function assertDeliveryAsset(imageUrl: string, maxBytes: number): Promise<void> {
  const filePath = fileURLToPath(new URL(`../../../public${imageUrl}`, import.meta.url));
  await access(filePath);
  const info = await stat(filePath);
  assert.ok(info.size <= maxBytes, `${imageUrl} is ${info.size} bytes`);
}

test('the allowlist exactly matches all 60 existing character IDs', () => {
  assert.equal(GUARDIAN_IDS.length, 60);
  assert.deepEqual([...GUARDIAN_IDS].sort(), FREE_CHARACTERS.map(x => x.id).sort());
});

test('parser accepts only allowlisted two-character IDs', () => {
  assert.deepEqual(parseGuardianId('甲寅'), { stem: '甲', branch: '寅' });
  assert.equal(isGuardianId('甲寅'), true);
  assert.equal(isGuardianId('甲'), false);
  assert.equal(isGuardianId('hello'), false);
});

test('all guardians have distinct deployable images below 200 KB', async () => {
  const guardians = listGuardians();
  assert.equal(new Set(guardians.map(x => x.imageUrl)).size, 60);
  for (const guardian of guardians) await assertDeliveryAsset(guardian.imageUrl, 200 * 1024);
});
```

- [ ] **Step 2: Run the catalog test and verify failure**

Run: `node --test src/domain/guardian/guardianCatalog.test.ts`

Expected: FAIL because the guardian-domain modules do not exist.

- [ ] **Step 3: Implement the explicit typed allowlist and parser**

```ts
export const GUARDIAN_IDS = [
  '甲子','乙丑','丙寅','丁卯','戊辰','己巳','庚午','辛未','壬申','癸酉','甲戌','乙亥',
  '丙子','丁丑','戊寅','己卯','庚辰','辛巳','壬午','癸未','甲申','乙酉','丙戌','丁亥',
  '戊子','己丑','庚寅','辛卯','壬辰','癸巳','甲午','乙未','丙申','丁酉','戊戌','己亥',
  '庚子','辛丑','壬寅','癸卯','甲辰','乙巳','丙午','丁未','戊申','己酉','庚戌','辛亥',
  '壬子','癸丑','甲寅','乙卯','丙辰','丁巳','戊午','己未','庚申','辛酉','壬戌','癸亥',
] as const;
export type GuardianId = (typeof GUARDIAN_IDS)[number];
const GUARDIAN_ID_SET: ReadonlySet<string> = new Set(GUARDIAN_IDS);
export const isGuardianId = (value: string): value is GuardianId => GUARDIAN_ID_SET.has(value);
export const parseGuardianId = (id: GuardianId) => ({ stem: id.slice(0, 1), branch: id.slice(1, 2) });
```

Build `guardianCatalog.ts` by validating every imported `FREE_CHARACTERS` entry against this allowlist and assigning `/guardians/${String(index + 1).padStart(2, '0')}.webp`. Preserve existing `name`, `emoji`, `core_type`, `summary_og`, `identity`, and keywords; derive stem, branch, element, and yin/yang from fixed maps.

- [ ] **Step 4: Implement deterministic transparent WebP conversion**

```py
for index, source in enumerate(sorted(SOURCE_DIR.glob("[0-9][0-9]_*.png")), start=1):
    if int(source.name[:2]) != index:
        raise ValueError(f"guardian sequence gap: {source.name}")
    with Image.open(source) as image:
        converted = image.convert("RGBA")
        converted.thumbnail((512, 512), Image.Resampling.LANCZOS)
        converted.save(OUTPUT_DIR / f"{index:02d}.webp", "WEBP", quality=82, method=6)
```

Fail unless exactly 60 input and 60 output images exist. Do not overwrite source PNGs.

- [ ] **Step 5: Generate assets and pass catalog tests**

Run: `python scripts/optimize_guardians.py`

Run: `node --test src/domain/guardian/guardianCatalog.test.ts`

Expected: 60 files generated and all tests PASS.

- [ ] **Step 6: Commit the catalog slice**

```bash
git add src/domain/guardian/guardianIds.ts src/domain/guardian/guardianCatalog.ts src/domain/guardian/guardianCatalog.test.ts scripts/optimize_guardians.py public/guardians
git commit -m "feat: add production guardian catalog"
```

### Task 2: Implement and exhaustively verify symmetric chemistry

**Files:**
- Create: `src/domain/guardian/relations.ts`
- Create: `src/domain/guardian/calculateChemistry.ts`
- Create: `src/domain/guardian/selectGuardianMatches.ts`
- Create: `src/domain/guardian/chemistryCopy.ts`
- Create: `src/domain/guardian/calculateChemistry.test.ts`
- Create: `src/domain/guardian/selectGuardianMatches.test.ts`

**Interfaces:**
- Consumes: Task 1 `Guardian` and `GuardianId`.
- Produces: `calculateGuardianChemistry(a, b): ChemistryResult`, `selectGuardianMatches(current, guardians): GuardianMatches`, and `getChemistryCopy(relation, kind): string`.

```ts
export type ChemistryReason =
  | 'six_harmony' | 'stem_combination' | 'generating' | 'same_element'
  | 'clash' | 'control' | 'negative_stem_relation';
export type DominantRelation = ChemistryReason | 'neutral';
export type ChemistryResult = Readonly<{
  score: number;
  positiveReasons: readonly ChemistryReason[];
  negativeReasons: readonly ChemistryReason[];
  dominantRelation: DominantRelation;
}>;
export type GuardianMatch = Readonly<{ guardian: Guardian; chemistry: ChemistryResult }>;
export type GuardianMatches = Readonly<{ best: GuardianMatch; challenging: GuardianMatch }>;
```

- [ ] **Step 1: Write failing scoring and symmetry tests**

```ts
test('known rules produce exact scores', () => {
  assert.equal(calculateGuardianChemistry(getGuardian('甲子'), getGuardian('己丑')).score, 85);
  assert.equal(calculateGuardianChemistry(getGuardian('甲子'), getGuardian('庚午')).score, 17);
  assert.equal(calculateGuardianChemistry(getGuardian('甲子'), getGuardian('丙寅')).score, 58);
});

test('all 1,770 unique pairs are symmetric including reasons and dominant relation', () => {
  const guardians = listGuardians();
  for (let i = 0; i < guardians.length; i++) for (let j = i + 1; j < guardians.length; j++) {
    assert.deepEqual(calculateGuardianChemistry(guardians[i], guardians[j]), calculateGuardianChemistry(guardians[j], guardians[i]));
  }
});
```

- [ ] **Step 2: Run the chemistry test and verify failure**

Run: `node --test src/domain/guardian/calculateChemistry.test.ts`

Expected: FAIL because the relation modules do not exist.

- [ ] **Step 3: Implement immutable unordered-pair relations and scoring**

Use canonical pair keys so input order never changes results:

```ts
const normalizePair = (value: string) => value.split(':').sort().join(':');
const pairKey = (a: string, b: string) => normalizePair(`${a}:${b}`);
export const STEM_COMBINATIONS = new Set(['甲:己','乙:庚','丙:辛','丁:壬','戊:癸'].map(normalizePair));
export const BRANCH_SIX_HARMONY = new Set(['子:丑','寅:亥','卯:戌','辰:酉','巳:申','午:未'].map(normalizePair));
export const BRANCH_CLASHES = new Set(['子:午','丑:未','寅:申','卯:酉','辰:戌','巳:亥'].map(normalizePair));
```

Start at 50, apply `+18`, `+25`, `-25`, `+8`, and `-8` exactly once when each relation exists, and clamp to 0–100. Sort reason arrays by fixed enum order. Choose `dominantRelation` as `clash → six_harmony → stem_combination → control → generating → same_element → neutral`.

- [ ] **Step 4: Write failing BEST/WORST and tie tests**

```ts
test('甲子 deterministically selects meaningful matches and never itself', () => {
  const matches = selectGuardianMatches(getGuardian('甲子'), listGuardians());
  assert.equal(matches.best.guardian.id, '己丑');
  assert.equal(matches.challenging.guardian.id, '庚午');
  assert.notEqual(matches.best.guardian.id, '甲子');
  assert.notEqual(matches.challenging.guardian.id, '甲子');
});
```

Add synthetic equal-score candidates proving BEST uses harmony, stem combination, generation, same element, then ID; WORST uses clash, control, reserved negative stem relation, then ID.

- [ ] **Step 5: Implement deterministic selection and copy mapping**

Sort copies of the 59 candidates. Never mutate the catalog. Copy keys are `six_harmony`, `stem_combination`, `generating`, `same_element`, `clash`, `control`, and `neutral`; return workplace-safe one-line copy only.

- [ ] **Step 6: Add exhaustive distribution assertions and diagnostic output**

Evaluate all 3,540 directional comparisons and assert score bounds, one BEST/WORST per guardian, no self-match, and repeat determinism. Fail if any single guardian receives more than 6 of the 60 BEST selections or more than 6 of the 60 WORST selections. Print sorted BEST/WORST frequency tables only when the test fails or `GUARDIAN_DISTRIBUTION=1` is set.

- [ ] **Step 7: Run all guardian-domain tests**

Run: `node --test src/domain/guardian/*.test.ts`

Expected: all tests PASS and cover 1,770 unique pairs.

- [ ] **Step 8: Commit the chemistry engine**

```bash
git add src/domain/guardian/relations.ts src/domain/guardian/calculateChemistry.ts src/domain/guardian/selectGuardianMatches.ts src/domain/guardian/chemistryCopy.ts src/domain/guardian/*.test.ts
git commit -m "feat: add symmetric guardian chemistry engine"
```

### Task 3: Replace the career share card with a guardian-first card

**Files:**
- Modify: `src/utils/shareCard.ts`
- Modify: `src/utils/shareCard.test.ts`
- Modify: `src/utils/shareIncentive.ts`
- Modify: `src/utils/shareIncentive.test.ts`
- Modify: `src/contexts/AppContext.tsx:430-585`

**Interfaces:**
- Consumes: Task 1 `Guardian`, existing `canvasToPngBlob`, R2 upload, and share-page preparation.
- Produces: `buildGuardianShareCardModel`, `drawGuardianShareCard`, and `buildGuardianShareHook`.

- [ ] **Step 1: Write failing guardian-card model tests**

```ts
test('share model contains only guardian-safe content', () => {
  const model = buildGuardianShareCardModel({
    guardianName: '푸른 호랑이', imageUrl: '/guardians/51.webp',
    trait: '결정적인 순간 가장 먼저 움직이는 타입',
  });
  assert.deepEqual(Object.keys(model).sort(), ['guardianName','imageUrl','prompt','trait']);
  assert.equal(model.prompt, '너는 어떤 수호신일까?');
  assert.doesNotMatch(JSON.stringify(model), /best|worst|birth|email|이직운|잔류운|협상운/);
});
```

- [ ] **Step 2: Run the card test and verify failure**

Run: `node --test src/utils/shareCard.test.ts src/utils/shareIncentive.test.ts`

Expected: FAIL because guardian card functions do not exist.

- [ ] **Step 3: Implement the minimal 800×800 renderer**

Draw one contained guardian image, guardian name, a maximum two-line trait, `너는 어떤 수호신일까?`, and small `Jobsaju.kr`. Do not draw chemistry matches, the three career scores, personal inputs, or paid conclusions. If the image fails, draw the guardian emoji in the image stage.

- [ ] **Step 4: Replace share hook copy**

```ts
export function buildGuardianShareHook(guardianName: string): string {
  return `내 수호신은 ${guardianName}래.\n너는 어떤 수호신일까?`;
}
```

Keep `earnsBonusQuestion` unchanged.

- [ ] **Step 5: Switch background card preparation in `AppContext`**

Resolve the day-pillar Guardian, build the guardian card, preload its image, draw it into the existing hidden `viralCardCanvasRef`, clear stale R2/page caches when the result changes, and retain the second render after font/image settling.

- [ ] **Step 6: Run card, sharing, and full tests**

Run: `node --test src/utils/shareCard.test.ts src/utils/shareIncentive.test.ts src/utils/kakaoShare.test.ts`

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the new share card**

```bash
git add src/utils/shareCard.ts src/utils/shareCard.test.ts src/utils/shareIncentive.ts src/utils/shareIncentive.test.ts src/contexts/AppContext.tsx
git commit -m "feat: create guardian-first share card"
```

### Task 4: Add attributed landing URLs and invite context

**Files:**
- Create: `src/utils/guardianInvite.ts`
- Create: `src/utils/guardianInvite.test.ts`
- Create: `src/components/GuardianInviteBanner.tsx`
- Modify: `src/components/screens/IntroScreen.tsx`
- Modify: `src/contexts/AppContext.tsx:130-290,320-390,945-990`
- Modify: `src/utils/kakaoShare.ts`
- Modify: `src/utils/kakaoShare.test.ts`
- Modify: `workers/sharePage.js`
- Modify: `workers/sharePage.test.js`

**Interfaces:**
- Consumes: Plan 1 analytics IDs/events and Task 1 Guardian validator/catalog.
- Produces: `parseGuardianInvite(search)`, `buildGuardianLandingUrl`, `GuardianInviteBanner`, direct Kakao landing URL, and attributed Web Share preview CTA.

- [ ] **Step 1: Write failing query and attribution tests**

```ts
const UUID_A = '11111111-1111-4111-8111-111111111111';

test('valid invite keeps guardian and share IDs while invalid guardian is ignored', () => {
  assert.deepEqual(parseGuardianInvite('?fromGuardian=甲寅&utm_source=guardian_share&shareId=' + UUID_A), {
    fromGuardianId: '甲寅', shareId: UUID_A, utmSource: 'guardian_share',
  });
  assert.equal(parseGuardianInvite('?fromGuardian=BAD&shareId=' + UUID_A), null);
});

test('landing URL contains only approved attribution parameters', () => {
  assert.equal(buildGuardianLandingUrl('https://jobsaju.kr', '甲寅', UUID_A),
    `https://jobsaju.kr/?fromGuardian=${encodeURIComponent('甲寅')}&utm_source=guardian_share&shareId=${UUID_A}`);
});
```

- [ ] **Step 2: Run invite/share-page tests and verify failure**

Run: `node --test src/utils/guardianInvite.test.ts src/utils/kakaoShare.test.ts workers/sharePage.test.js`

Expected: new invite and URL tests FAIL.

- [ ] **Step 3: Implement safe invite parsing and session attribution**

Accept only `isGuardianId(fromGuardian)`, UUIDv4 `shareId`, and exact `utm_source=guardian_share`. Store the inbound attribution in `sessionStorage` until the visitor completes or explicitly resets the flow. Do not copy inbound `shareId` into the recipient's own result `shareId`.

On initial valid landing, emit `guardian_share_landing_view` once per visitor session. When the shared visitor's Saju result is set, emit `guardian_result_complete_from_share` with the original inbound `shareId`, the visitor's `visitorSessionId`, and the newly computed guardian ID.

- [ ] **Step 4: Render the invite banner in the existing Intro screen**

`GuardianInviteBanner` receives a validated Guardian and renders its image, fallback emoji, `${guardian.name}가 당신의 수호신을 궁금해해요.`, and `당신은 어떤 수호신일까요?`. Insert it above the existing intro content; leave all buttons and input navigation unchanged.

- [ ] **Step 5: Separate Kakao direct landing from Web Share preview**

Refactor `ShareCareerInput` to accept both:

```ts
landingUrl: string; // Kakao content/button destination
previewUrl: string; // Web Share URL with OG preview and CTA
```

Kakao `content.link` and button use `landingUrl`; `linkShare` uses `previewUrl`; file/download fallback copies `landingUrl`. Extend share-page creation to store a validated guardian/share attribution and render its CTA to the attributed landing URL. Reject arbitrary external `appUrl` values to prevent open redirects.

Keep preloading the base share page without attribution. On the first valid share click, synchronously create the result's single `shareId`, build the direct landing URL, and append `fromGuardian`, `utm_source`, and `shareId` to the already-created preview URL without another network request. `workers/sharePage.js` validates those GET query values and uses them only for its CTA destination. This preserves the iOS user gesture while honoring first-share ID creation; do not record or count the ID until a share event activates it.

- [ ] **Step 6: Run focused tests**

Run: `node --test src/utils/guardianInvite.test.ts src/utils/kakaoShare.test.ts workers/sharePage.test.js src/utils/guardianAnalytics.test.ts`

Expected: all tests PASS.

- [ ] **Step 7: Commit invite attribution**

```bash
git add src/utils/guardianInvite.ts src/utils/guardianInvite.test.ts src/components/GuardianInviteBanner.tsx src/components/screens/IntroScreen.tsx src/contexts/AppContext.tsx src/utils/kakaoShare.ts src/utils/kakaoShare.test.ts workers/sharePage.js workers/sharePage.test.js
git commit -m "feat: preserve guardian share context on landing"
```

### Task 5: Add the compact chemistry panel and remove duplicate share UI

**Files:**
- Create: `src/components/GuardianChemistryPanel.tsx`
- Create: `src/components/GuardianChemistryPanel.test.ts`
- Modify: `src/components/screens/ResultScreen.tsx:1-120,125-370,743-817`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: Task 2 `selectGuardianMatches` and chemistry copy, Task 3 hidden canvas, and existing `handleShareResult` state.
- Produces: one visible `친구에게 물어보기` CTA and `guardian_match_section_view` observation target.

- [ ] **Step 1: Write a failing static-render test for the compact panel**

```ts
const current = getGuardian('甲子');
const matches = selectGuardianMatches(current, listGuardians());
const fixtureProps = {
  current,
  best: matches.best,
  challenging: matches.challenging,
  isShareLoading: false,
  isShareConfirming: false,
  onShare: () => undefined,
};

test('panel renders two relations and exactly one share CTA without hostile copy', () => {
  const html = renderToStaticMarkup(createElement(GuardianChemistryPanel, fixtureProps));
  assert.match(html, /함께 일하면\?/);
  assert.match(html, /찰떡/);
  assert.match(html, /티격태격/);
  assert.equal((html.match(/친구에게 물어보기/g) || []).length, 1);
  assert.doesNotMatch(html, /최악|상극|피해야/);
  assert.match(html, /직장 케미 \d+점/);
});
```

- [ ] **Step 2: Run the panel test and verify failure**

Run: `node --test src/components/GuardianChemistryPanel.test.ts`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the prop-driven panel**

Use this public component interface:

```ts
export type GuardianChemistryPanelProps = {
  current: Guardian;
  best: GuardianMatch;
  challenging: GuardianMatch;
  isShareLoading: boolean;
  isShareConfirming: boolean;
  onShare: () => void;
};
```

Render one semantic `<section>` with two compact relation rows. Each row contains a 56–72 px image, emoji fallback, relation label, guardian name, one-line copy, and score. Render one full-width button bound to `onShare`; use `aria-busy` and existing loading/confirming copy.

- [ ] **Step 4: Insert the panel before the paywall and remove old share surfaces**

In `ResultScreen`, derive the current day-pillar Guardian and matches once, then place the panel after the career-DNA section and before `.locked-area`. Remove:

- the Section 5 `내 캐릭터 공유하기` text link;
- locked Section 11 `결과 공유하고 할인받기` block;
- the unlocked follow-up section's `친구에게 공유하고 한 번 더 물어보기` button; replace it with passive text explaining that the chemistry panel's share action unlocks the one-time bonus;
- the unlocked bottom visible viral-card section and download button.

Replace both direct `FREE_CHARACTERS.find(...)` lookups with `getGuardian(dayPillar)` so the hero, chemistry panel, and share card resolve the same domain record. Keep one hidden `<canvas ref={viralCardCanvasRef} width="800" height="800" aria-hidden="true" />` for the existing share pipeline.

- [ ] **Step 5: Emit the section-view event once**

Attach an `IntersectionObserver` to the panel section and emit `guardian_match_section_view` once per `resultSessionId` when at least 50% is visible. If `IntersectionObserver` is unavailable, emit once after render. Observation/analytics errors must not affect UI.

- [ ] **Step 6: Add responsive styles**

Use one-column relation rows below 420 px, prevent images from stretching, keep the panel visually quieter than `.creature-hero`, and limit added vertical height to approximately 360 px on a 390 px-wide viewport. Do not add a sticky CTA.

- [ ] **Step 7: Run component, full, lint, and build checks**

Run: `node --test src/components/GuardianChemistryPanel.test.ts src/domain/guardian/*.test.ts`

Run: `npm run check`

Expected: all tests, lint, and production build PASS.

- [ ] **Step 8: Commit the integrated UI**

```bash
git add src/components/GuardianChemistryPanel.tsx src/components/GuardianChemistryPanel.test.ts src/components/screens/ResultScreen.tsx src/index.css
git commit -m "feat: integrate guardian chemistry share panel"
```

### Task 6: Verify the complete loop and prepare full rollout

**Files:**
- Modify: `KAKAO_SHARE_SETUP.md`
- Modify: `scripts/guardian-analytics-kpis.sql`

**Interfaces:**
- Consumes: all previous tasks and the analytics baseline.
- Produces: verified release artifact and operational comparison checklist.

- [ ] **Step 1: Run exhaustive automated verification**

Run: `GUARDIAN_DISTRIBUTION=1 npm test`

On PowerShell run: `$env:GUARDIAN_DISTRIBUTION='1'; npm test; Remove-Item Env:GUARDIAN_DISTRIBUTION`

Expected: 60 guardians, 3,540 directional evaluations, 1,770 symmetric unique pairs, valid BEST/WORST for every guardian, and no asset gaps.

- [ ] **Step 2: Run production-quality checks**

Run: `npm run lint`

Run: `npm run build`

Expected: both PASS.

- [ ] **Step 3: Manually verify mobile and sharing behavior**

Use a 390×844 viewport and verify: current guardian remains dominant; chemistry is one compact box; exactly one visible share CTA exists; paid CTA remains visible shortly below; image failure shows emoji; invalid `fromGuardian` shows no banner.

On real Android and iOS paths verify: Kakao opens the attributed app landing directly; Web Share preview shows the guardian card and its CTA preserves `fromGuardian`, `utm_source`, and `shareId`; cancel grants no reward; a second real share is logged but reward remains one-time.

- [ ] **Step 4: Verify analytics end to end without personal data**

For one controlled `shareId`, generate two distinct landing visitor sessions, complete one result, and confirm the D1 rows produce a 50% inbound completion rate for that share flow. Confirm the event rows contain no birth, gender, email, concern, or report fields.

- [ ] **Step 5: Update operating documentation and commit**

Document the new Kakao direct landing, Web Share preview behavior, 60-image regeneration command, invalid-ID fallback, event semantics, and the UTC full-rollout timestamp field.

```bash
git add KAKAO_SHARE_SETUP.md scripts/guardian-analytics-kpis.sql
git commit -m "docs: add guardian share rollout checks"
```

- [ ] **Step 6: Full-production deployment checkpoint requiring explicit authority**

After review, deploy the feature build to all users. Do not create an A/B variant. Compare the post-rollout period against the instrumentation-only baseline for Share Rate and Paid Conversion Rate; monitor Share Inbound Completion Rate and both Activated Share growth definitions from rollout onward.
