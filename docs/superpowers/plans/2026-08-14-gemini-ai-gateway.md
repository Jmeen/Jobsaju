# Gemini AI Gateway Regional Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route production Gemini Flash requests through an authenticated Cloudflare AI Gateway so `jobsaju.kr` can generate AI reports without the current Google AI Studio regional rejection.

**Architecture:** Add a small Worker-only transport module that selects either authenticated Cloudflare AI Gateway or the existing direct Google AI Studio endpoint. Both premium reports, follow-up answers, and `/api/diag` reuse this transport; Cloudflare configuration is created separately and production deployment is gated on a real successful Gemini response.

**Tech Stack:** Cloudflare Pages Functions/Workers, Cloudflare AI Gateway, Google AI Studio Gemini REST API, Node.js built-in test runner, Wrangler

## Global Constraints

- Gateway ID is exactly `jobsaju-gemini`.
- Gemini model is `gemini-3.5-flash`; the originally planned 2.5 model was retired for new users during live validation.
- Gateway provider endpoint uses `/google-ai-studio/v1/models/...`.
- Gateway authentication is enabled and requests include `cf-aig-authorization: Bearer <token>`.
- Google credentials use the `x-goog-api-key` header on Gateway requests, never a Gateway URL query parameter.
- Gateway cache and prompt/response logging are disabled; the existing 90-day application KV cache remains unchanged.
- `GEMINI_API_KEY` and `CF_AIG_TOKEN` remain encrypted environment secrets and never enter source, config, logs, or user responses.
- Incomplete Gateway configuration fails before any provider request; direct Google AI Studio access remains only when all Gateway variables are absent.
- Production deployment is not successful unless `/api/diag`, `/api/interpret`, and `/api/followup` return real AI results without the regional error.

---

### Task 1: Add a tested Gemini transport boundary

**Files:**
- Create: `workers/geminiTransport.js`
- Create: `workers/geminiTransport.test.js`

**Interfaces:**
- Consumes: `env.GEMINI_API_KEY`, `env.CF_AIG_ACCOUNT_ID`, `env.CF_AIG_GATEWAY_ID`, `env.CF_AIG_TOKEN`
- Produces: `buildGeminiRequest(env, resourcePath): { transport: 'cloudflare-ai-gateway' | 'google-ai-studio-direct', url: string, headers: Record<string, string> }`

- [ ] **Step 1: Write failing transport tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGeminiRequest } from './geminiTransport.js';

test('완전한 Gateway 설정은 인증된 Google AI Studio v1 URL을 만든다', () => {
  const request = buildGeminiRequest({
    GEMINI_API_KEY: 'google-key',
    CF_AIG_ACCOUNT_ID: 'account-123',
    CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
    CF_AIG_TOKEN: 'gateway-token',
  }, 'models/gemini-3.5-flash:generateContent');

  assert.equal(request.transport, 'cloudflare-ai-gateway');
  assert.equal(request.url, 'https://gateway.ai.cloudflare.com/v1/account-123/jobsaju-gemini/google-ai-studio/v1/models/gemini-3.5-flash:generateContent');
  assert.equal(request.headers['x-goog-api-key'], 'google-key');
  assert.equal(request.headers['cf-aig-authorization'], 'Bearer gateway-token');
  assert.ok(!request.url.includes('google-key'));
});

test('Gateway 설정이 전혀 없으면 기존 직접 호출을 유지한다', () => {
  const request = buildGeminiRequest({ GEMINI_API_KEY: 'google-key' }, 'models/gemini-3.5-flash:generateContent');
  assert.equal(request.transport, 'google-ai-studio-direct');
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=google-key');
  assert.equal(request.headers['Content-Type'], 'application/json');
});

test('Gateway 설정 일부만 있으면 외부 요청 전에 거부한다', () => {
  assert.throws(() => buildGeminiRequest({
    GEMINI_API_KEY: 'google-key',
    CF_AIG_ACCOUNT_ID: 'account-123',
    CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
  }, 'models'), /AI Gateway 설정이 완전하지 않습니다/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test workers/geminiTransport.test.js
```

Expected: FAIL because `workers/geminiTransport.js` does not exist.

- [ ] **Step 3: Implement the minimal transport module**

```js
const DIRECT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GATEWAY_BASE_URL = 'https://gateway.ai.cloudflare.com/v1';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildGeminiRequest(env, resourcePath) {
  const apiKey = clean(env.GEMINI_API_KEY);
  const accountId = clean(env.CF_AIG_ACCOUNT_ID);
  const gatewayId = clean(env.CF_AIG_GATEWAY_ID);
  const gatewayToken = clean(env.CF_AIG_TOKEN);
  const gatewayValues = [accountId, gatewayId, gatewayToken];
  const gatewayConfigured = gatewayValues.every(Boolean);
  const gatewayPartiallyConfigured = gatewayValues.some(Boolean) && !gatewayConfigured;

  if (gatewayPartiallyConfigured) {
    throw new Error('AI Gateway 설정이 완전하지 않습니다.');
  }

  if (gatewayConfigured) {
    return {
      transport: 'cloudflare-ai-gateway',
      url: `${GATEWAY_BASE_URL}/${encodeURIComponent(accountId)}/${encodeURIComponent(gatewayId)}/google-ai-studio/v1/${resourcePath}`,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'cf-aig-authorization': `Bearer ${gatewayToken}`,
      },
    };
  }

  return {
    transport: 'google-ai-studio-direct',
    url: `${DIRECT_BASE_URL}/${resourcePath}?key=${encodeURIComponent(apiKey)}`,
    headers: { 'Content-Type': 'application/json' },
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `node --test workers/geminiTransport.test.js`.

Expected: 3 tests PASS.

- [ ] **Step 5: Commit when Git identity is available**

```powershell
git add -- workers/geminiTransport.js workers/geminiTransport.test.js
git commit -m "feat: add Gemini AI Gateway transport"
```

If identity remains unset, leave the verified files uncommitted and report that limitation.

---

### Task 2: Route reports, follow-ups, and diagnostics through the transport

**Files:**
- Modify: `workers/index.js:1-260`
- Modify: `workers/premiumReportRoute.test.js`
- Modify: `workers/followUpRoute.test.js`
- Create: `workers/geminiGatewayRoute.test.js`

**Interfaces:**
- Consumes: `buildGeminiRequest(env, resourcePath)` from Task 1
- Produces: existing `/api/interpret`, `/api/followup`, and `/api/diag` response contracts plus non-secret diagnostic fields `ai_transport` and `gateway_configured`

- [ ] **Step 1: Write failing route tests**

Add `workers/geminiGatewayRoute.test.js` with a real Worker invocation and a fetch recorder:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import worker from './index.js';

test('/api/diag uses the configured Gateway without exposing secrets', async () => {
  const originalFetch = globalThis.fetch;
  let received;
  globalThis.fetch = async (url, options = {}) => {
    received = { url: String(url), headers: options.headers };
    return Response.json({ models: [{ name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] }] });
  };

  try {
    const response = await worker.fetch(new Request('https://example.com/api/diag'), {
      GEMINI_API_KEY: 'google-secret',
      GEMINI_MODEL: 'gemini-3.5-flash',
      CF_AIG_ACCOUNT_ID: 'account-123',
      CF_AIG_GATEWAY_ID: 'jobsaju-gemini',
      CF_AIG_TOKEN: 'gateway-secret',
    });
    const body = await response.json();

    assert.equal(body.ai_transport, 'cloudflare-ai-gateway');
    assert.equal(body.gateway_configured, true);
    assert.match(received.url, /gateway\.ai\.cloudflare\.com\/v1\/account-123\/jobsaju-gemini\/google-ai-studio\/v1\/models$/);
    assert.equal(received.headers['x-goog-api-key'], 'google-secret');
    assert.equal(received.headers['cf-aig-authorization'], 'Bearer gateway-secret');
    assert.doesNotMatch(JSON.stringify(body), /google-secret|gateway-secret|account-123/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

Extend the existing premium and follow-up tests to pass full Gateway configuration and assert their recorded URL uses `/google-ai-studio/v1/models/<model>:generateContent`.

- [ ] **Step 2: Run route tests and verify RED**

Run:

```powershell
node --test workers/geminiGatewayRoute.test.js workers/premiumReportRoute.test.js workers/followUpRoute.test.js
```

Expected: the new diagnostic test FAILS because the Worker still calls Google directly and does not return `ai_transport`.

- [ ] **Step 3: Integrate the transport into `workers/index.js`**

Import `buildGeminiRequest`. In `callGemini`, replace the hard-coded Google URL and headers with:

```js
const providerRequest = buildGeminiRequest(env, `models/${model}:generateContent`);
const res = await fetch(providerRequest.url, {
  method: 'POST',
  headers: providerRequest.headers,
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: genConfig,
  }),
});
```

In `/api/diag`, resolve `buildGeminiRequest(env, 'models')`, use its URL and headers, and include:

```js
ai_transport: providerRequest.transport,
gateway_configured: providerRequest.transport === 'cloudflare-ai-gateway',
```

On incomplete Gateway configuration, return `models_error` with a sanitized configuration message; never include environment values.

- [ ] **Step 4: Run focused route tests and verify GREEN**

Run the Step 2 command.

Expected: all selected tests PASS and both AI routes use the same Gateway transport.

- [ ] **Step 5: Run the full local check**

Run:

```powershell
npm.cmd run check
```

Expected: all tests, Oxlint, TypeScript compilation, and Vite build PASS.

- [ ] **Step 6: Commit when Git identity is available**

```powershell
git add -- workers/index.js workers/premiumReportRoute.test.js workers/followUpRoute.test.js workers/geminiGatewayRoute.test.js
git commit -m "fix: route Gemini through AI Gateway"
```

If identity remains unset, leave the verified files uncommitted and report that limitation.

---

### Task 3: Create and configure the authenticated Cloudflare AI Gateway

**Files:**
- Modify: `CLOUDFLARE_DEPLOY.md`
- No source-controlled secret files

**Interfaces:**
- Consumes: Cloudflare account containing Pages project `job-saju`
- Produces: AI Gateway `jobsaju-gemini` and Preview/Production variables `CF_AIG_ACCOUNT_ID`, `CF_AIG_GATEWAY_ID`, `CF_AIG_TOKEN`

- [ ] **Step 1: Create the Gateway in the Cloudflare dashboard**

Open AI Gateway in the same Cloudflare account as `job-saju`, create `jobsaju-gemini`, and set:

```text
Authentication: On
Cache: Off / TTL 0
Prompt and response logs: Off
Rate limit: Off during validation
```

- [ ] **Step 2: Create and securely capture the Gateway Run token**

Create the authenticated Gateway token from the Gateway settings. Do not paste it into chat, source, `wrangler.jsonc`, or a plaintext file.

- [ ] **Step 3: Add Preview variables and secrets**

In Pages project `job-saju` Preview environment, add `CF_AIG_ACCOUNT_ID` by copying the exact Account ID shown in the Cloudflare dashboard, add `CF_AIG_GATEWAY_ID` with the literal value `jobsaju-gemini`, and add `CF_AIG_TOKEN` as an encrypted secret by pasting the one-time Gateway Run token generated in Step 2.

Keep the existing encrypted `GEMINI_API_KEY` and set `GEMINI_MODEL=gemini-3.5-flash`.

- [ ] **Step 4: Document the exact production settings**

Update `CLOUDFLARE_DEPLOY.md` with the Gateway ID, variable names, encrypted-secret requirements, and the prohibition on Gateway caching/logging for personal reports.

- [ ] **Step 5: Verify documentation and repository safety**

Run:

```powershell
rg -n "CF_AIG|jobsaju-gemini" CLOUDFLARE_DEPLOY.md workers
git diff --check -- CLOUDFLARE_DEPLOY.md workers
```

Confirm no actual token, Google key, or Cloudflare account ID appears in tracked files or `git diff`.

---

### Task 4: Preview validation, production rollout, and live proof

**Files:**
- No additional source changes unless validation exposes a new root cause

**Interfaces:**
- Consumes: built app, configured Preview/Production environments, `TESTJM` test coupon
- Produces: live `jobsaju.kr` AI report and follow-up response without `source: fallback`

- [ ] **Step 1: Build and deploy a Preview**

Run:

```powershell
npm.cmd run check
npx.cmd wrangler pages deploy dist --project-name job-saju --branch codex-ai-gateway
```

Capture the Preview URL printed by Wrangler.

- [ ] **Step 2: Verify Preview diagnostics**

Request the exact Preview URL printed in Step 1 with `/api/diag` appended and require all of:

```json
{
  "has_api_key": true,
  "has_kv": true,
  "configured_model": "gemini-3.5-flash",
  "ai_transport": "cloudflare-ai-gateway",
  "gateway_configured": true,
  "configured_model_available": true
}
```

Any `models_error`, especially the regional error, stops rollout and triggers the documented Vertex AI design path.

- [ ] **Step 3: Verify a real Preview premium report**

Use `/api/coupon/check` to confirm `TESTJM` without consuming it, then `/api/payment/validate` once to obtain a test unlock token and `/api/interpret` with synthetic career and saju data. Require HTTP 200, valid premium JSON, and no fallback notice.

- [ ] **Step 4: Verify a real Preview follow-up**

Call `/api/followup` with the same unlock token and synthetic question. Require HTTP 200 and a structured answer generated through the Gateway.

- [ ] **Step 5: Apply the same three Gateway values to Production and redeploy**

Add `CF_AIG_ACCOUNT_ID`, `CF_AIG_GATEWAY_ID`, and encrypted `CF_AIG_TOKEN` to Production, then deploy the same verified tree to the production branch:

```powershell
npx.cmd wrangler pages deploy dist --project-name job-saju
```

- [ ] **Step 6: Verify production**

Repeat diagnostics, one synthetic `TESTJM` premium report, and one follow-up against `https://jobsaju.kr`. Require HTTP 200 and `ai_transport: cloudflare-ai-gateway`.

- [ ] **Step 7: Final regression and diff review**

Run:

```powershell
npm.cmd run check
git diff --check
git status --short
```

Report the exact test count, Preview URL, production diagnostic transport, and any non-blocking build warnings. Do not claim success if AI Gateway still returns the regional restriction.
