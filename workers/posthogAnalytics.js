import { PostHog } from 'posthog-node';
import { sanitizeAnalyticsProperties } from '../src/utils/analyticsPolicy.ts';

async function eventUuid(id) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`purchase_complete:${id}`))).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Called only AFTER provider verification, atomic redemption and token persistence. */
export function schedulePurchaseCapture(env, ctx, { analytics, verifiedPrice, coupon, purchaseId }, Client = PostHog) {
  try {
    if (!env.POSTHOG_KEY || !env.POSTHOG_HOST || typeof verifiedPrice !== 'number' || !Number.isFinite(verifiedPrice) || verifiedPrice < 0) return;
    if (typeof purchaseId !== 'string' || !purchaseId) return;
    // The frontend sends the SDK anonymous UUID, never email/name or payment ID as identity.
    if (!analytics || typeof analytics !== 'object' || !/^[0-9a-f-]{36}$/i.test(analytics.distinct_id || '')) return;
    const task = (async () => {
      const client = new Client(env.POSTHOG_KEY, {
        host: env.POSTHOG_HOST, flushAt: 1, flushInterval: 0,
        requestTimeout: 5000, fetchRetryCount: 1, disableGeoip: true,
      });
      try {
        const properties = sanitizeAnalyticsProperties({
          ...analytics, report_type: 'paid_career', price: verifiedPrice, promo_code: coupon,
        });
        if (/^[0-9a-f-]{36}$/i.test(analytics.$session_id || '')) properties.$session_id = analytics.$session_id;
        properties.$process_person_profile = false;
        client.capture({ distinctId: analytics.distinct_id, event: 'purchase_complete', uuid: await eventUuid(purchaseId), properties });
      } finally {
        await client.shutdown();
      }
    })().catch(() => {
      // Do not log payment/customer payloads. Analytics failure must not affect payment.
      console.warn('PostHog purchase capture failed');
    });
    if (ctx?.waitUntil) ctx.waitUntil(task);
    else void task; // Only non-Worker test environments lack an execution context.
  } catch { /* analytics must never change the payment response */ }
}
