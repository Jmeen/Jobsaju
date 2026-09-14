import { diagnosticFrames, diagnosticPath, DIAGNOSTIC_ROUTES, errorCategory } from './diagnosticData.ts';

const STORAGE_KEY = 'saju_diagnostics_v1';
let send: typeof fetch | undefined;
let screen = 'startup';
let lastId = '';
let sent = 0;

export function setDiagnosticScreen(value: string) { screen = value; }
export function lastDiagnosticId() { return lastId; }

export function reportDiagnostic(code: string, error?: unknown, extra: Record<string, unknown> = {}) {
  try {
    const id = crypto.randomUUID();
    lastId = id;
    const event = {
      ...extra, id, code, category: errorCategory(error), screen,
      frames: diagnosticFrames(error), timestamp: new Date().toISOString(),
      release: document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src.split('/').pop()?.split('?')[0],
    };
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([event, ...(Array.isArray(saved) ? saved : [])].slice(0, 20)));
    } catch { /* Logging must also work when browser storage is unavailable. */ }
    if (send && sent++ < 20) {
      void send('/api/diagnostics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event), keepalive: true,
      }).catch(() => {});
    }
    return id;
  } catch { return ''; }
}

export function downloadDiagnostics() {
  try {
    const blob = new Blob([sessionStorage.getItem(STORAGE_KEY) || '[]'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jobsaju-error-log.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { /* A restricted browser must not break the recovery screen. */ }
}

export function installDiagnostics() {
  if (send) return;
  send = window.fetch.bind(window);
  const originalFetch = send;
  window.addEventListener('error', event => reportDiagnostic('WINDOW_ERROR', event.error));
  window.addEventListener('unhandledrejection', event => reportDiagnostic('UNHANDLED_REJECTION', event.reason));
  window.addEventListener('vite:preloadError', event => reportDiagnostic('CHUNK_LOAD_FAILED', (event as Event & { payload?: unknown }).payload));
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href);
    if (url.origin !== location.origin || !DIAGNOSTIC_ROUTES.has(url.pathname)) return originalFetch(input, init);
    const id = crypto.randomUUID();
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('X-Request-Id', id);
    const start = performance.now();
    try {
      const response = await originalFetch(input, { ...init, headers });
      if (!response.ok) reportDiagnostic('API_HTTP_ERROR', undefined, {
        requestId: response.headers.get('X-Request-Id') || id,
        route: diagnosticPath(url.pathname), status: response.status, durationMs: Math.round(performance.now() - start),
      });
      return response;
    } catch (error) {
      reportDiagnostic('API_NETWORK_ERROR', error, { requestId: id, route: diagnosticPath(url.pathname), durationMs: Math.round(performance.now() - start) });
      throw error;
    }
  };
}
