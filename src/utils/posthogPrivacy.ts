import type { SessionRecordingOptions } from 'posthog-js';
import { safeUrl } from './analyticsPolicy.ts';

export function replayPrivacyConfig(origin: string): SessionRecordingOptions {
  return {
    maskAllInputs: true,
    maskTextSelector: '.ph-mask, .ph-mask *, .jg-error, .jg-error *',
    blockSelector: 'iframe, canvas, .ph-no-capture',
    recordHeaders: false, recordBody: false,
    maskCapturedNetworkRequestFn: request => ({ ...request, name: safeUrl(request.name) || '' }),
    maskAttributeFn: (key, value) => {
      if (['value', 'title', 'alt', 'aria-label', 'aria-valuetext', 'placeholder', 'srcdoc'].includes(key) || key.startsWith('data-')) return '';
      if (['href', 'src'].includes(key)) {
        if (value.startsWith('data:') || value.startsWith('blob:')) return '';
        try {
          const url = new URL(value, origin);
          // Only public assets may retain paths, not personalized share-card URLs.
          if (key === 'src' && url.origin === origin && /^\/(assets|guardians|characters|fonts)\/[a-zA-Z0-9_./-]+$/.test(url.pathname)) return url.origin + url.pathname;
          return safeUrl(url.href) || '';
        } catch { return ''; }
      }
      return value;
    },
  };
}
