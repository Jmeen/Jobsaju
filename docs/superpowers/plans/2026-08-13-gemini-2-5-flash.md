# Gemini 2.5 Flash Model Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set the application and Cloudflare Pages deployment model to `gemini-2.5-flash`.

**Architecture:** Preserve the existing `env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL` precedence. Declare the same model in both Wrangler Pages variables and the Worker fallback, while retaining sequential fallback behavior for model-specific 404 responses.

**Tech Stack:** Cloudflare Pages Functions, Wrangler JSONC, Node.js test runner, Vite

## Global Constraints

- The selected model is exactly `gemini-2.5-flash`.
- Gemini API keys, prompts, report schemas, R2, KV, and payment settings remain unchanged.
- The configured model remains observable through `/api/diag`.
- No production deployment is performed in this task.

---

### Task 1: Pin Gemini 2.5 Flash in Worker and Pages configuration

**Files:**
- Modify: `workers/pagesConfig.test.js`
- Create: `workers/geminiModelConfig.test.js`
- Modify: `workers/index.js`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: `env.GEMINI_MODEL` string supplied by Cloudflare Pages.
- Produces: `configured_model: "gemini-2.5-flash"` through `/api/diag` when no deployment override is present.

- [ ] **Step 1: Write failing configuration tests**

Add this assertion to `workers/pagesConfig.test.js`:

```js
assert.equal(config.vars.GEMINI_MODEL, 'gemini-2.5-flash');
```

Create `workers/geminiModelConfig.test.js`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Worker uses Gemini 2.5 Flash as its default and first fallback model', async () => {
  const source = await readFile(new URL('./index.js', import.meta.url), 'utf8');
  assert.match(source, /const DEFAULT_GEMINI_MODEL = ["']gemini-2\.5-flash["']/);
  assert.match(source, /const FALLBACK_FLASH_MODELS = \[\s*["']gemini-2\.5-flash["']/);
});
```

- [ ] **Step 2: Run tests and verify the expected failure**

Run:

```powershell
node --test workers/pagesConfig.test.js workers/geminiModelConfig.test.js
```

Expected: both new assertions fail because Wrangler has no `vars.GEMINI_MODEL` and the Worker still defaults to `gemini-1.5-flash`.

- [ ] **Step 3: Apply the minimal configuration change**

In `workers/index.js`, set:

```js
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const FALLBACK_FLASH_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
];
```

In `wrangler.jsonc`, add:

```json
"vars": {
  "GEMINI_MODEL": "gemini-2.5-flash"
}
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test workers/pagesConfig.test.js workers/geminiModelConfig.test.js
```

Expected: 2 tests pass, 0 fail.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Expected: all tests pass, lint exits 0, and Vite produces `dist` successfully. A bundle-size warning is permitted; errors are not.

- [ ] **Step 6: Record the deployment verification command**

After the user deploys, run:

```powershell
curl.exe -s https://job-saju-eo3.pages.dev/api/diag
```

Expected response fields:

```json
{
  "configured_model": "gemini-2.5-flash",
  "configured_model_available": true
}
```

No commit step is included because `C:\GoogleDrive\job_saju_codex_handoff` is not a Git repository.
