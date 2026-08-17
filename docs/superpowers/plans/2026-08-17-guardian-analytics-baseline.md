# Guardian Analytics Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy privacy-minimal guardian result, share, and paid-conversion analytics to every user before changing the guardian UI, so the later full rollout has a trustworthy baseline.

**Architecture:** A small browser client owns anonymous visit/result/share identifiers and sends allowlisted events without blocking product actions. A focused Worker route validates and inserts events into a new D1 table; the existing Kakao webhook records confirmed shares while the browser records clicks and successful share-sheet handoffs.

**Tech Stack:** React 19, TypeScript 6, Node test runner, Cloudflare Pages Functions/Workers, D1, Kakao JavaScript SDK

## Global Constraints

- This plan changes instrumentation only; it does not add the chemistry UI, invite banner, or 60-image catalog.
- Never store birth date, birth time, gender, name, email, concern text, report content, raw user agent, or IP address in analytics rows.
- `eventId` deduplicates network retries only; legitimate repeated shares receive new event IDs.
- A result session reuses one `shareId` across every share attempt and page reload of that saved result.
- Analytics failure must never block result generation, sharing, payment, report generation, or share rewards.
- Add D1 schema with a non-destructive migration; never run `schema.sql`, which drops `paid_reports`.
- Existing unrelated worktree changes must remain untouched.

---

## File Structure

- `migrations/0001_guardian_analytics_events.sql`: additive D1 schema and KPI indexes.
- `workers/guardianAnalytics.js`: server allowlists, validation, D1 insertion, and request handler.
- `workers/guardianAnalytics.test.js`: route validation, privacy, retry dedupe, and failure tests.
- `src/utils/guardianAnalytics.ts`: anonymous identifier lifecycle, non-blocking transport, and event API.
- `src/utils/guardianAnalytics.test.ts`: storage lifecycle, payload filtering, retry, and transport tests.
- `src/utils/session.ts`: persist `resultSessionId` and `shareId` with an existing saved result.
- `src/utils/kakaoShare.ts`: carry analytics callback arguments and distinguish successful handoff results.
- `src/utils/kakaoShare.test.ts`: callback metadata and share-result regression tests.
- `src/contexts/AppContext.tsx`: create result/share IDs and emit result, share, and payment events.
- `workers/index.js`: route `/api/analytics` and record authenticated Kakao confirmation events.
- `workers/kakaoShareWebhookRoute.test.js`: confirmed-share logging and reward independence.
- `scripts/guardian-analytics-kpis.sql`: exact Primary-supporting, Secondary, Growth, and Guardrail queries.

### Task 1: Add the analytics D1 route

**Files:**
- Create: `migrations/0001_guardian_analytics_events.sql`
- Create: `workers/guardianAnalytics.js`
- Create: `workers/guardianAnalytics.test.js`
- Modify: `workers/index.js:359-405`

**Interfaces:**
- Consumes: `env.DB.prepare(sql).bind(...values).run()`.
- Produces: `handleGuardianAnalyticsRequest(request, env): Promise<Response | null>` and `recordGuardianAnalyticsEvent(env, event): Promise<'inserted' | 'duplicate'>`.

The server event accepted by `recordGuardianAnalyticsEvent` is exactly:

```js
{
  eventId, eventName, occurredAt,
  visitorSessionId: null | uuid,
  resultSessionId: null | uuid,
  shareId: null | uuid,
  guardianId: null | guardianId,
  fromGuardianId: null | guardianId,
  shareChannel: null | 'kakao' | 'web_link' | 'web_file' | 'download',
  utmSource: null | 'guardian_share',
}
```

- [ ] **Step 1: Write failing Worker tests for validation, privacy, and dedupe**

```js
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

const makeRequest = body => new Request('https://example.com/api/analytics', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

function createAnalyticsDb() {
  const rows = [];
  return {
    rows,
    prepare() {
      return { bind(...values) { return { async run() {
        if (rows.some(row => row.event_id === values[0])) {
          const error = new Error('UNIQUE constraint failed: guardian_analytics_events.event_id');
          throw error;
        }
        rows.push({ event_id: values[0], event_name: values[1], visitor_session_id: values[3] });
        return { success: true };
      } }; } };
    },
  };
}

test('POST /api/analytics stores one allowlisted event and dedupes the same eventId', async () => {
  const db = createAnalyticsDb();
  const body = {
    eventId: '11111111-1111-4111-8111-111111111111',
    eventName: 'guardian_result_view',
    occurredAt: '2026-08-17T00:00:00.000Z',
    visitorSessionId: '22222222-2222-4222-8222-222222222222',
    resultSessionId: '33333333-3333-4333-8333-333333333333',
    guardianId: '甲子',
  };
  const first = await handleGuardianAnalyticsRequest(makeRequest(body), { DB: db });
  const retry = await handleGuardianAnalyticsRequest(makeRequest(body), { DB: db });
  assert.equal(first.status, 202);
  assert.equal(retry.status, 202);
  assert.equal(db.rows.length, 1);
  assert.equal(Object.hasOwn(db.rows[0], 'email'), false);
});

test('rejects unknown events, invalid UUIDs, invalid guardian IDs, and oversized bodies', async () => {
  assert.equal((await handleGuardianAnalyticsRequest(makeRequest({ eventName: 'anything' }), { DB: createAnalyticsDb() })).status, 400);
});
```

- [ ] **Step 2: Run the focused Worker test and verify it fails**

Run: `node --test workers/guardianAnalytics.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `workers/guardianAnalytics.js`.

- [ ] **Step 3: Add the non-destructive migration**

```sql
CREATE TABLE IF NOT EXISTS guardian_analytics_events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  visitor_session_id TEXT,
  result_session_id TEXT,
  share_id TEXT,
  guardian_id TEXT,
  from_guardian_id TEXT,
  share_channel TEXT,
  utm_source TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guardian_events_name_time
  ON guardian_analytics_events(event_name, occurred_at);
CREATE INDEX IF NOT EXISTS idx_guardian_events_share
  ON guardian_analytics_events(share_id, event_name);
CREATE INDEX IF NOT EXISTS idx_guardian_events_visitor
  ON guardian_analytics_events(visitor_session_id, event_name);
CREATE INDEX IF NOT EXISTS idx_guardian_events_result
  ON guardian_analytics_events(result_session_id, event_name);
```

- [ ] **Step 4: Implement the minimal allowlisted route**

```js
export const GUARDIAN_EVENT_NAMES = new Set([
  'guardian_result_view', 'guardian_match_section_view',
  'guardian_share_click', 'guardian_share_sheet_opened', 'guardian_share_confirmed',
  'guardian_share_landing_view', 'guardian_result_complete_from_share',
  'paid_conversion',
]);

export async function handleGuardianAnalyticsRequest(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/analytics') return null;
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!env.DB) return json({ error: 'Analytics unavailable' }, 503);
  const body = await readAndValidateAnalyticsBody(request);
  if (!body.ok) return json({ error: body.error }, 400);
  await recordGuardianAnalyticsEvent(env, body.value);
  return json({ accepted: true }, 202);
}
```

Use a 4 KB maximum body, UUIDv4 validation for all IDs, `free_engine_characters.js` IDs as the guardian allowlist, fixed channel values `kakao|web_link|web_file|download`, and bound prepared-statement parameters only. Catch D1 unique-constraint failures as duplicates; rethrow other database failures.

- [ ] **Step 5: Route the handler before the generic POST-only gate**

Import `handleGuardianAnalyticsRequest` in `workers/index.js`, call it near the existing Kakao webhook routes, and return its response when non-null.

- [ ] **Step 6: Run focused and route regression tests**

Run: `node --test workers/guardianAnalytics.test.js workers/kakaoShareWebhookRoute.test.js workers/test_import.test.js`

Expected: all tests PASS.

- [ ] **Step 7: Commit the server slice**

```bash
git add migrations/0001_guardian_analytics_events.sql workers/guardianAnalytics.js workers/guardianAnalytics.test.js workers/index.js
git commit -m "feat: add guardian analytics event endpoint"
```

### Task 2: Add anonymous identifier lifecycle and non-blocking transport

**Files:**
- Create: `src/utils/guardianAnalytics.ts`
- Create: `src/utils/guardianAnalytics.test.ts`
- Modify: `src/utils/session.ts:6-18`

**Interfaces:**
- Consumes: `Storage`, `crypto.randomUUID`, `navigator.sendBeacon`, and `fetch`.
- Produces: `GuardianAnalyticsIds`, `getVisitorSessionId`, `createResultSessionId`, `ensureShareId`, and `trackGuardianEvent`.

- [ ] **Step 1: Write failing tests for ID lifetime**

```ts
function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

const baseEvent = {
  eventId: '11111111-1111-4111-8111-111111111111',
  eventName: 'guardian_result_view' as const,
  occurredAt: '2026-08-17T00:00:00.000Z',
  visitorSessionId: '22222222-2222-4222-8222-222222222222',
  resultSessionId: '33333333-3333-4333-8333-333333333333',
  guardianId: '甲子',
};
const failingTransport = {
  sendBeacon: () => false,
  fetch: async () => { throw new Error('offline'); },
};

test('visitor ID is stable in sessionStorage and one result reuses one shareId', () => {
  const storage = createMemoryStorage();
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  const randomUUID = () => ids.shift()!;
  assert.equal(getVisitorSessionId(storage, randomUUID), '11111111-1111-4111-8111-111111111111');
  assert.equal(getVisitorSessionId(storage, randomUUID), '11111111-1111-4111-8111-111111111111');
  assert.equal(ensureShareId(null, randomUUID), '22222222-2222-4222-8222-222222222222');
  assert.equal(ensureShareId('22222222-2222-4222-8222-222222222222', randomUUID), '22222222-2222-4222-8222-222222222222');
});

test('transport filters undefined fields and resolves even when beacon and fetch fail', async () => {
  await assert.doesNotReject(() => trackGuardianEvent(baseEvent, failingTransport));
});
```

- [ ] **Step 2: Run the client utility test and verify it fails**

Run: `node --test src/utils/guardianAnalytics.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement typed events and transport**

```ts
export type GuardianEventName =
  | 'guardian_result_view' | 'guardian_match_section_view'
  | 'guardian_share_click' | 'guardian_share_sheet_opened' | 'guardian_share_confirmed'
  | 'guardian_share_landing_view' | 'guardian_result_complete_from_share'
  | 'paid_conversion';

export type GuardianAnalyticsIds = {
  visitorSessionId: string;
  resultSessionId: string;
  shareId: string | null;
};

export async function trackGuardianEvent(input: GuardianEventInput, deps = browserTransport): Promise<void> {
  const body = JSON.stringify(compactEvent(input));
  try {
    if (deps.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }))) return;
    await deps.fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
  } catch { /* analytics never blocks product behavior */ }
}
```

Use `sessionStorage` key `jobsaju_visitor_session_id`. Extend `SavedSession` with optional `resultSessionId?: string` and `shareId?: string`; do not store inbound attribution or personal data in analytics helpers.

- [ ] **Step 4: Run the utility and session tests**

Run: `node --test src/utils/guardianAnalytics.test.ts src/utils/shareIncentive.test.ts`

Expected: all tests PASS.

- [ ] **Step 5: Commit the client foundation**

```bash
git add src/utils/guardianAnalytics.ts src/utils/guardianAnalytics.test.ts src/utils/session.ts
git commit -m "feat: add guardian analytics identities"
```

### Task 3: Instrument baseline result, share, confirmation, and payment events

**Files:**
- Modify: `src/utils/kakaoShare.ts:2-85,138-188`
- Modify: `src/utils/kakaoShare.test.ts`
- Modify: `src/contexts/AppContext.tsx:130-290,320-390,645-745,945-990`
- Modify: `workers/index.js:359-389`
- Modify: `workers/kakaoShareWebhookRoute.test.js`

**Interfaces:**
- Consumes: Task 2 `GuardianAnalyticsIds` and `trackGuardianEvent`.
- Produces: Kakao `serverCallbackArgs` containing `share_id`, `result_session_id`, `visitor_session_id`, and `guardian_id`; baseline events for the current UI.

- [ ] **Step 1: Add failing Kakao metadata tests**

```ts
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

test('Kakao callback args contain reward and anonymous analytics metadata', () => {
  const template = buildKakaoFeedTemplate({
    imageUrl: 'https://example.com/card.png', serviceUrl: 'https://example.com', shareHook: 'hook',
    unlockToken: 'unlock-token', shareId: UUID_A, resultSessionId: UUID_B,
    visitorSessionId: UUID_C, guardianId: '甲子',
  });
  assert.deepEqual(template.serverCallbackArgs, {
    unlock_token: 'unlock-token', share_id: UUID_A, result_session_id: UUID_B,
    visitor_session_id: UUID_C, guardian_id: '甲子',
  });
});
```

Add a Worker test proving two authenticated Kakao callbacks with the same `share_id` create two `guardian_share_confirmed` rows with different server-generated `event_id` values while `share-bonus:<unlockToken>` remains one KV key.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test src/utils/kakaoShare.test.ts workers/kakaoShareWebhookRoute.test.js`

Expected: metadata assertions FAIL because the new callback fields are absent.

- [ ] **Step 3: Integrate identifier state in `AppProvider`**

On provider initialization, get `visitorSessionId` from `sessionStorage`. When a new Saju result is computed, create a new `resultSessionId` and clear `shareId`; when a saved result is restored, reuse its saved IDs or create missing IDs once. Save both IDs with `SavedSession`.

Emit `guardian_result_view` once per `resultSessionId` when `step === 'result' && sajuResult`. Derive `guardianId` from `ganHanja + zhiHanja` and include no birth fields.

- [ ] **Step 4: Instrument the existing share handler without changing its UI**

At the start of the first valid `handleShareResult`, call `ensureShareId`, persist it in the current result session, and emit `guardian_share_click`. Pass the four callback metadata fields into `shareCareerResult`.

After `shareCareerResult` resolves:

```ts
if (result === 'kakao') {
  void trackGuardianEvent(event('guardian_share_sheet_opened', { shareChannel: 'kakao' }));
} else if (result === 'link' || result === 'file') {
  void trackGuardianEvent(event('guardian_share_sheet_opened', {
    shareChannel: result === 'link' ? 'web_link' : 'web_file',
  }));
}
```

Do not emit sheet-opened for `cancelled` or `download`. Preserve the existing reward branches exactly.

- [ ] **Step 5: Record paid conversion after the paid report is actually available**

Immediately after `setAiReport`, `setIsUnlocked(true)`, and a successful `/api/paid-report` response, emit `paid_conversion` with the current `resultSessionId` and guardian ID. Do not emit on checkout click, payment initialization, report retry, or restored paid-report links.

- [ ] **Step 6: Record confirmed Kakao events in the authenticated webhook**

Parse the added callback values from GET, form POST, and JSON POST. Keep the existing admin-key check. After granting the KV reward, call:

```js
await recordGuardianAnalyticsEvent(env, {
  eventId: crypto.randomUUID(), eventName: 'guardian_share_confirmed',
  occurredAt: new Date().toISOString(), shareId, resultSessionId,
  visitorSessionId, guardianId, shareChannel: 'kakao', utmSource: 'guardian_share',
});
```

If analytics metadata is absent or invalid, still return `200` and preserve reward behavior. If D1 insertion fails, still return `200` within the Kakao webhook contract.

- [ ] **Step 7: Run focused tests and the complete suite**

Run: `node --test src/utils/guardianAnalytics.test.ts src/utils/kakaoShare.test.ts workers/guardianAnalytics.test.js workers/kakaoShareWebhookRoute.test.js`

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Commit baseline instrumentation**

```bash
git add src/utils/kakaoShare.ts src/utils/kakaoShare.test.ts src/contexts/AppContext.tsx workers/index.js workers/kakaoShareWebhookRoute.test.js
git commit -m "feat: instrument guardian funnel baseline"
```

### Task 4: Add exact KPI queries and baseline release checks

**Files:**
- Create: `scripts/guardian-analytics-kpis.sql`
- Modify: `KAKAO_SHARE_SETUP.md`

**Interfaces:**
- Consumes: Task 1 D1 schema and Task 3 event semantics.
- Produces: copy-pasteable D1 queries for the approved KPIs and a documented two-stage rollout checkpoint.

- [ ] **Step 1: Write KPI SQL using distinct approved identifiers**

```sql
-- Secondary: Share Rate
SELECT
  1.0 * COUNT(DISTINCT CASE WHEN event_name = 'guardian_share_click' THEN result_session_id END)
      / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'guardian_result_view' THEN result_session_id END), 0)
    AS share_rate
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;

-- Guardrail: Paid Conversion Rate
SELECT
  1.0 * COUNT(DISTINCT CASE WHEN event_name = 'paid_conversion' THEN result_session_id END)
      / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'guardian_result_view' THEN result_session_id END), 0)
    AS paid_conversion_rate
FROM guardian_analytics_events
WHERE occurred_at >= ?1 AND occurred_at < ?2;
```

Also include the approved inbound completion, confirmed-share growth, and attempted-share growth queries even though inbound events begin with Plan 2.

- [ ] **Step 2: Document event semantics and Kakao callback setup**

Add the callback argument names, clarify that `guardian_share_confirmed` is logged per confirmed behavior while reward is granted once, and state that analytics failure never changes the webhook response.

- [ ] **Step 3: Run static checks**

Run: `rg -n "birth|gender|email|concern|report_json" migrations/0001_guardian_analytics_events.sql workers/guardianAnalytics.js scripts/guardian-analytics-kpis.sql`

Expected: no analytics column or insert binding contains those personal fields; incidental comments must be reviewed manually.

Run: `npm run check`

Expected: tests, lint, and production build PASS.

- [ ] **Step 4: Apply and verify the local migration**

Run: `npx wrangler d1 migrations apply paid_reports_db --local`

Run: `npx wrangler d1 execute paid_reports_db --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name IN ('paid_reports','guardian_analytics_events') ORDER BY name"`

Expected: both `guardian_analytics_events` and `paid_reports` are returned.

- [ ] **Step 5: Commit release documentation**

```bash
git add scripts/guardian-analytics-kpis.sql KAKAO_SHARE_SETUP.md
git commit -m "docs: add guardian analytics baseline queries"
```

- [ ] **Step 6: Production checkpoint requiring explicit deployment authority**

After review, apply the migration remotely and deploy the instrumentation-only build to all users. Record the UTC deployment time, then collect at least seven days or the agreed minimum sample before executing the feature-rollout plan.

Commands after approval:

```bash
npx wrangler d1 migrations apply paid_reports_db --remote
npm run build
```

Verify live events for `guardian_result_view`, `guardian_share_click`, `guardian_share_sheet_opened`, `guardian_share_confirmed`, and `paid_conversion`; verify no guardian chemistry UI or invite banner is present yet.
