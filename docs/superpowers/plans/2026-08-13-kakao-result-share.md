# Kakao Result Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload an 800×800 privacy-safe career verdict card to Cloudflare R2 and share it as a KakaoTalk feed message with a service CTA.

**Architecture:** The browser renders a deterministic B-style card to Canvas, uploads the PNG to a same-origin Pages Function, and passes the returned public image URL to Kakao JavaScript SDK. The existing Worker router delegates upload/read requests to a focused R2 module; every Kakao or storage failure falls back to file sharing, download, and link copy without blocking the user.

**Tech Stack:** React 19, TypeScript 6, Canvas API, Kakao JavaScript SDK 2.8.2, Cloudflare Pages Functions/Workers, R2, Node test runner, oxlint, Vite 8.

## Global Constraints

- Shared PNG size is exactly 800×800 pixels and at most 1MB.
- Shared content includes only the derived verdict, one action sentence, one rank, year, and brand; never pass email, birth data, gender, current job text, career goal text, or free-form concern text to the renderer.
- Kakao feed copy is `나는 지금 옮겨야 할까?`, `내 사주와 실제 고민을 함께 분석한 커리어 리포트입니다.`, and `내 이직 결론 확인하기`.
- R2 binding is `SHARE_CARDS`; object keys are `share-cards/<uuid>.png`; objects expire after 30 days through an R2 lifecycle rule.
- Upload accepts only valid PNG bytes with `Content-Type: image/png`; reject payloads above 1,048,576 bytes with HTTP 413.
- Do not expose a Kakao Admin key. Only `VITE_KAKAO_JS_KEY` is read by the browser.
- A Kakao picker cancellation is silent. Technical failures fall back in the order: file Web Share → PNG download plus link copy.
- The project has no Git repository. Do not initialize one implicitly; use passing tests as task checkpoints instead of commits.

---

## File Structure

- Create `src/utils/shareCard.ts`: build the privacy-safe card model, draw the B-style Canvas, and convert Canvas to PNG.
- Create `src/utils/shareCard.test.ts`: pure model, truncation, and Blob conversion tests.
- Create `src/utils/kakaoShare.ts`: upload PNG, initialize Kakao SDK, send feed message, and choose fallbacks.
- Create `src/utils/kakaoShare.test.ts`: upload and share-routing tests with injected browser dependencies.
- Create `src/types/kakao.d.ts`: the minimal SDK types used by this app.
- Create `workers/shareCard.js`: validate/store/read PNG objects from R2.
- Create `workers/shareCard.test.js`: Worker-level request and R2 behavior tests.
- Modify `workers/index.js`: route share-card upload/read before the POST-only AI route gate.
- Modify `src/App.tsx`: render the new 800×800 B card and drive loading/error UI through the sharing helper.
- Modify `index.html`: load Kakao JavaScript SDK 2.8.2 with its official SHA-384 integrity value.
- Create `wrangler.jsonc`: document the Pages output directory and `SHARE_CARDS` R2 binding.
- Modify `CLOUDFLARE_DEPLOY.md`: add bucket, binding, lifecycle, Kakao domain, and environment-variable setup.

---

### Task 1: Privacy-safe B-style card renderer

**Files:**
- Create: `src/utils/shareCard.ts`
- Create: `src/utils/shareCard.test.ts`
- Modify: `src/App.tsx:318-445`

**Interfaces:**
- Produces: `buildShareCardModel(input: ShareCardInput): ShareCardModel`
- Produces: `drawShareCard(canvas: HTMLCanvasElement, model: ShareCardModel): void`
- Produces: `canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob>`
- Consumed later by: `shareCareerResult({ canvas, ... })` in Task 3.

- [ ] **Step 1: Write failing pure-model tests**

```ts
test('공유 모델에는 허용된 필드만 남는다', () => {
  const model = buildShareCardModel({
    year: 2026,
    conclusion: '지금은 퇴사보다 조건을 협상할 때입니다.',
    action: '값을 올린 뒤 움직이세요.',
    rankLabel: '협상운 상위 5%',
  });
  assert.deepEqual(Object.keys(model).sort(), ['action', 'conclusion', 'rankLabel', 'year']);
  assert.equal(JSON.stringify(model).includes('email'), false);
});

test('긴 결론은 카드용 두 줄 길이로 제한한다', () => {
  const model = buildShareCardModel({
    year: 2026,
    conclusion: '아주 긴 결론 '.repeat(30),
    action: '행동 문장',
    rankLabel: '이직운 상위 12%',
  });
  assert.ok(model.conclusion.length <= 64);
  assert.match(model.conclusion, /…$/);
});
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `node --test src/utils/shareCard.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shareCard.ts`.

- [ ] **Step 3: Implement the model and renderer**

```ts
export type ShareCardInput = {
  year: number;
  conclusion: string;
  action: string;
  rankLabel: string;
};

export type ShareCardModel = Readonly<ShareCardInput>;

export function buildShareCardModel(input: ShareCardInput): ShareCardModel {
  const compact = input.conclusion.replace(/\s+/g, ' ').trim();
  return {
    year: input.year,
    conclusion: compact.length > 64 ? `${compact.slice(0, 63)}…` : compact,
    action: input.action.replace(/\s+/g, ' ').trim().slice(0, 54),
    rankLabel: input.rankLabel.replace(/\s+/g, ' ').trim().slice(0, 24),
  };
}
```

Implement `drawShareCard` with an 800×800 backing store, the approved dark-purple B layout, a two-line conclusion, one action quote, and bottom brand/rank. The function receives only `ShareCardModel`; it must not receive `careerContext`, `birthData`, or email.

- [ ] **Step 4: Add and pass Canvas-to-Blob tests**

Use a fake Canvas whose `toBlob` returns a PNG Blob. Assert `canvasToPngBlob` resolves for `image/png` and rejects with `공유 이미지를 만들지 못했습니다.` when `toBlob` yields `null`.

Run: `node --test src/utils/shareCard.test.ts`

Expected: PASS.

- [ ] **Step 5: Replace the shared Canvas drawing in App**

Build the model from `aiReport.one_line_conclusion`, the first action item already present in the report, and `buildTopRank(sajuResult.scores).headline`. Keep the existing summary-card Canvas behavior, but set the viral/share Canvas attributes to `width="800" height="800"` and call `drawShareCard` for that ref.

- [ ] **Step 6: Run regression tests**

Run: `node --test src/utils/resultCardTargets.test.ts src/utils/shareCard.test.ts`

Expected: all tests PASS and both Canvas refs remain independently rendered.

Checkpoint: record `src/utils/shareCard.ts`, its test, and `src/App.tsx` as Task 1 complete; no Git commit because the workspace is not a repository.

---

### Task 2: R2 upload and public image route

**Files:**
- Create: `workers/shareCard.js`
- Create: `workers/shareCard.test.js`
- Modify: `workers/index.js:1-110`

**Interfaces:**
- Produces: `handleShareCardRequest(request: Request, env: Env): Promise<Response | null>`
- Requires: `env.SHARE_CARDS` with `put(key, value, options)` and `get(key)`.
- API: `POST /api/share-card` and `GET /api/share-card/<uuid>.png`.

- [ ] **Step 1: Write failing upload validation tests**

```js
test('valid PNG is stored with metadata and returns an absolute URL', async () => {
  const stored = [];
  const env = { SHARE_CARDS: { put: async (...args) => stored.push(args) } };
  const request = new Request('https://job-saju.example/api/share-card', {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]),
  });
  const response = await handleShareCardRequest(request, env);
  assert.equal(response.status, 201);
  assert.equal(stored.length, 1);
  assert.match((await response.json()).imageUrl, /^https:\/\/job-saju\.example\/api\/share-card\/[0-9a-f-]+\.png$/);
});
```

Add separate assertions for MIME 415, bad PNG signature 400, body length 1,048,577 returning 413, and missing `SHARE_CARDS` returning 503.

- [ ] **Step 2: Run the Worker test and confirm red**

Run: `node --test workers/shareCard.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shareCard.js`.

- [ ] **Step 3: Implement strict storage validation**

```js
const MAX_PNG_BYTES = 1_048_576;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function isPng(bytes) {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}
```

Read the body once as `ArrayBuffer`, validate before `put`, generate `crypto.randomUUID()`, and store with `httpMetadata: { contentType: 'image/png' }` plus a `uploadedAt` custom metadata timestamp. Return 201 and an URL derived from `new URL(request.url).origin`.

- [ ] **Step 4: Add read-route tests and implementation**

Test a found R2 object, missing object 404, malformed UUID 404, correct `Content-Type: image/png`, `Cache-Control: public, max-age=86400`, and `X-Content-Type-Options: nosniff`.

Implement `GET /api/share-card/<uuid>.png` using an anchored UUID pathname regex and `env.SHARE_CARDS.get(key)`. Stream `object.body`; do not buffer the image again.

- [ ] **Step 5: Integrate before the Worker method gate**

At the start of `worker.fetch`, after OPTIONS handling and before the current `request.method !== "POST"` branch:

```js
const shareResponse = await handleShareCardRequest(request, env);
if (shareResponse) return shareResponse;
```

Keep existing AI/payment routes unchanged.

- [ ] **Step 6: Run Worker regression tests**

Run: `node --test workers/*.test.js`

Expected: all Worker tests PASS.

Checkpoint: record `workers/shareCard.js`, its test, and `workers/index.js` as Task 2 complete.

---

### Task 3: Kakao feed share and graceful fallback

**Files:**
- Create: `src/utils/kakaoShare.ts`
- Create: `src/utils/kakaoShare.test.ts`
- Create: `src/types/kakao.d.ts`
- Modify: `index.html`
- Modify: `src/App.tsx:120-160, 639-686, 1490-1512`

**Interfaces:**
- Consumes: `canvasToPngBlob(canvas)` from Task 1.
- Consumes: `POST /api/share-card` from Task 2.
- Produces: `shareCareerResult(input: ShareCareerInput, deps?: ShareCareerDependencies): Promise<'kakao' | 'file' | 'download' | 'cancelled'>`.

- [ ] **Step 1: Write failing routing tests with injected dependencies**

```ts
test('R2 upload 뒤 Kakao feed를 호출한다', async () => {
  const calls: string[] = [];
  const input = {
    blob: new Blob(['png'], { type: 'image/png' }),
    serviceUrl: 'https://example.com',
    kakaoKey: 'javascript-key',
  };
  const result = await shareCareerResult(input, {
    upload: async () => 'https://example.com/api/share-card/id.png',
    kakaoShare: async () => { calls.push('kakao'); },
    fileShare: async () => true,
    downloadAndCopy: async () => undefined,
  });
  assert.equal(result, 'kakao');
  assert.deepEqual(calls, ['kakao']);
});

test('Kakao 기술 오류는 파일 공유로 대체한다', async () => {
  const input = {
    blob: new Blob(['png'], { type: 'image/png' }),
    serviceUrl: 'https://example.com',
    kakaoKey: 'javascript-key',
  };
  const result = await shareCareerResult(input, {
    upload: async () => 'https://example.com/api/share-card/id.png',
    kakaoShare: async () => { throw new Error('sdk failed'); },
    fileShare: async () => true,
    downloadAndCopy: async () => undefined,
  });
  assert.equal(result, 'file');
});
```

Add tests for SDK key missing, upload non-2xx, file sharing `AbortError` returning `cancelled`, file sharing unsupported, and final download/link-copy fallback.

- [ ] **Step 2: Run the focused tests and confirm red**

Run: `node --test src/utils/kakaoShare.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `kakaoShare.ts`.

- [ ] **Step 3: Implement upload and typed Kakao feed call**

Define the minimum global interface in `src/types/kakao.d.ts`:

```ts
type KakaoFeedTemplate = {
  objectType: 'feed';
  content: {
    title: string;
    description: string;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
    link: { mobileWebUrl: string; webUrl: string };
  };
  buttons: Array<{
    title: string;
    link: { mobileWebUrl: string; webUrl: string };
  }>;
};

interface Window {
  Kakao?: {
    init(key: string): void;
    isInitialized(): boolean;
    Share: { sendDefault(template: KakaoFeedTemplate): void };
  };
}
```

Define the injectable boundary in `src/utils/kakaoShare.ts`:

```ts
export type ShareCareerInput = {
  blob: Blob;
  serviceUrl: string;
  kakaoKey: string;
};

export type ShareCareerDependencies = {
  upload(blob: Blob): Promise<string>;
  kakaoShare(input: { imageUrl: string; serviceUrl: string; kakaoKey: string }): Promise<void>;
  fileShare(blob: Blob, serviceUrl: string): Promise<boolean>;
  downloadAndCopy(blob: Blob, serviceUrl: string): Promise<void>;
};
```

Build a feed template with `objectType: 'feed'`, `imageUrl`, `imageWidth: 800`, `imageHeight: 800`, HTTPS mobile/web links, and one button. Initialize once with `import.meta.env.VITE_KAKAO_JS_KEY`.

- [ ] **Step 4: Pin the official SDK**

Use Kakao JavaScript SDK 2.8.2 from `https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js`. Compute its SHA-384 digest with the official command pattern and add the literal `integrity="sha384-..."` plus `crossorigin="anonymous"` to `index.html`. Verify the browser network request has no SRI error.

- [ ] **Step 5: Implement the fallback chain**

Create a `File([blob], '이직사주_결과카드.png', { type: 'image/png' })`; call `navigator.canShare({ files: [file] })` before `navigator.share`. If unavailable, trigger a Blob URL download, revoke it after the click, and copy `${serviceUrl}` to the clipboard. Detect only explicit picker cancellation (`AbortError`) as silent; do not swallow storage, SDK, or clipboard errors.

- [ ] **Step 6: Wire App loading state and labels**

Add `const [isShareLoading, setIsShareLoading] = useState(false)`. Disable the share button while true and switch its label between `카카오톡으로 공유` and `공유 카드 준비 중...`. Use `viralCardCanvasRef.current`; prevent duplicate clicks before creating the Blob. Keep the existing download button functional.

- [ ] **Step 7: Run front-end tests**

Run: `node --test src/utils/kakaoShare.test.ts src/utils/shareCard.test.ts src/utils/resultCardTargets.test.ts`

Expected: all tests PASS.

Checkpoint: record the Kakao helper, types, tests, `index.html`, and App wiring as Task 3 complete.

---

### Task 4: Cloudflare configuration, documentation, and end-to-end verification

**Files:**
- Create: `wrangler.jsonc`
- Modify: `CLOUDFLARE_DEPLOY.md`
- Modify: `package.json`

**Interfaces:**
- Configures: Pages output `dist` and R2 binding `SHARE_CARDS` to bucket `job-saju-share-cards`.
- Documents: `VITE_KAKAO_JS_KEY`, `VITE_PUBLIC_SERVICE_URL`, Kakao domains, and 30-day lifecycle.

- [ ] **Step 1: Add reproducible test scripts**

Add:

```json
"test": "node --test src/**/*.test.ts workers/*.test.js",
"check": "npm run test && npm run lint && npm run build"
```

Run: `npm.cmd run test`

Expected: all existing and new tests PASS.

- [ ] **Step 2: Add Pages/R2 configuration**

Create `wrangler.jsonc` with:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "job-saju-eo3",
  "pages_build_output_dir": "./dist",
  "r2_buckets": [
    { "binding": "SHARE_CARDS", "bucket_name": "job-saju-share-cards" }
  ]
}
```

Do not create or deploy the remote bucket without explicit deployment authorization.

- [ ] **Step 3: Document dashboard setup exactly**

Add commands and UI steps for creating `job-saju-share-cards`, setting a 30-day lifecycle deletion rule for prefix `share-cards/`, binding it as `SHARE_CARDS`, setting `VITE_KAKAO_JS_KEY`/`VITE_PUBLIC_SERVICE_URL`, and registering both `https://job-saju-eo3.pages.dev` and the final custom domain in Kakao Developers JavaScript SDK domains.

- [ ] **Step 4: Run full local verification**

Run: `npm.cmd run check`

Expected: Node tests PASS, oxlint exits 0, `tsc -b && vite build` exits 0. The existing Vite chunk-size warning is non-blocking unless a new build error accompanies it.

- [ ] **Step 5: Verify deployed behavior after configuration**

On an authorized Cloudflare deployment, upload one generated card and verify the returned image URL responds 200 with `Content-Type: image/png`, `Cache-Control: public, max-age=86400`, and no personal fields. Send one test each from Android and iOS KakaoTalk and confirm the square image, two-line verdict, description, and CTA landing.

Checkpoint: save command output and mobile screenshots as verification evidence. Deployment remains a separate explicit action.
