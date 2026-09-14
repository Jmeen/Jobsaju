export const DIAGNOSTIC_ROUTES = new Set([
  '/api/followup', '/api/paid-report', '/api/interpret', '/api/report-by-token',
  '/api/lookup', '/api/payment/validate', '/api/free-result',
]);

export function diagnosticPath(value: unknown): string {
  const path = typeof value === 'string' ? value.split(/[?#]/)[0] : '';
  return DIAGNOSTIC_ROUTES.has(path) ? path : '/';
}

export function errorCategory(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/dynamically imported module|Loading chunk|module script/i.test(message)) return 'CHUNK_LOAD_FAILED';
  if (/replace is not a function/.test(message)) return 'INVALID_TEXT_VALUE';
  if (/Cannot read properties of (undefined|null)/.test(message)) return 'MISSING_DATA';
  if (/not a function/.test(message)) return 'INVALID_DATA_TYPE';
  if (error instanceof Error && /Timeout|Abort/.test(error.name)) return 'REQUEST_TIMEOUT';
  if (error instanceof SyntaxError) return 'INVALID_JSON';
  return 'UNEXPECTED_ERROR';
}

// Error messages can contain questions, report text or tokens. Keep only build asset locations.
export function diagnosticFrames(error: unknown): string[] {
  const stack = error instanceof Error ? error.stack || '' : '';
  return [...stack.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.js:\d+:\d+/g)]
    .map(match => match[0]).slice(0, 8);
}
