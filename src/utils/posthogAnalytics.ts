import {
  acquisitionChannel, sanitizeAnalyticsProperties, sanitizeSdkProperties,
  safeUrl, type AnalyticsProperties,
} from './analyticsPolicy';
import { createAnalyticsRuntime, scheduleAnalyticsLoad } from './analyticsRuntime';
import { replayPrivacyConfig } from './posthogPrivacy';

let initializing = false;
let attribution: AnalyticsProperties | undefined;

function storage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}
export function commonAnalyticsProperties(): AnalyticsProperties {
  if (!attribution) {
    try { attribution = JSON.parse(storage()?.getItem('jobsaju_attribution_v1') || 'null') || undefined; } catch { /* invalid storage */ }
    if (!attribution) {
      const query = new URLSearchParams(window.location.search);
      attribution = sanitizeAnalyticsProperties({
        utm_source: query.get('utm_source'), utm_medium: query.get('utm_medium'), utm_campaign: query.get('utm_campaign'),
        referrer: document.referrer,
      });
      attribution.acquisition_channel = acquisitionChannel(attribution);
      try { storage()?.setItem('jobsaju_attribution_v1', JSON.stringify(attribution)); } catch { /* memory fallback */ }
    }
  }
  const ua = navigator.userAgent;
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? 'tablet' : /Mobile|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  return sanitizeAnalyticsProperties({ ...attribution, current_path: window.location.pathname, device_type: device });
}

export function installPostHog(): void {
  if (initializing) return;
  initializing = true;
  const env = import.meta.env;
  if (!env.VITE_POSTHOG_KEY || !env.VITE_POSTHOG_HOST || (!env.PROD && env.VITE_POSTHOG_DEBUG !== 'true')) return;
  try {
    // Save first touch before payment/recovery code removes URL query parameters.
    commonAnalyticsProperties();
    runtime.start();
    const loadSdk = () => {
      void import('posthog-js').then(({ default: posthog }) => {
        posthog.init(env.VITE_POSTHOG_KEY, {
          api_host: env.VITE_POSTHOG_HOST,
          defaults: '2026-05-30',
          autocapture: false, capture_pageview: false, capture_pageleave: false,
          capture_dead_clicks: false, capture_exceptions: false, capture_heatmaps: false,
          capture_performance: false,
          disable_surveys: true, disable_conversations: true, disable_product_tours: true,
          person_profiles: 'never', disable_session_recording: false,
          enable_recording_console_log: false,
          get_current_url: () => safeUrl(window.location.href) || window.location.origin + '/',
          save_campaign_params: false, save_referrer: false,
          session_recording: replayPrivacyConfig(window.location.origin),
          before_send: event => {
            if (!event) return null;
            event.properties = sanitizeSdkProperties(event.event, event.properties);
            delete event.$set;
            delete event.$set_once;
            return event;
          },
          loaded: sdk => {
            if (env.VITE_POSTHOG_DEBUG === 'true') sdk.debug();
            sdk.register(commonAnalyticsProperties());
            runtime.ready(sdk);
          },
        });
      }).catch(() => runtime.stop());
    };
    scheduleAnalyticsLoad(loadSdk, window);
  } catch { runtime.stop(); }
}

const runtime = createAnalyticsRuntime({ properties: commonAnalyticsProperties, storage });
export const { trackFunnel, trackClick, trackScreen, paymentAnalyticsContext } = runtime;
