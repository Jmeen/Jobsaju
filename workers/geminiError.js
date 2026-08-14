const redactSecrets = (value) => value.replace(/([?&]|\b)key=[^&\s]+/gi, '$1key=[redacted]');

const printable = (value) => {
  Object.defineProperty(value, 'toString', {
    enumerable: false,
    value: () => `[${value.code}] ${value.message}`,
  });
  return value;
};

export function parseGeminiError(status, statusText, rawBody) {
  try {
    const parsed = JSON.parse(rawBody);
    const upstreamError = parsed?.error;
    const message = typeof upstreamError?.message === 'string'
      ? redactSecrets(upstreamError.message)
      : statusText;
    return printable({
      status,
      code: typeof upstreamError?.status === 'string' ? upstreamError.status : 'GEMINI_UPSTREAM_ERROR',
      message: message || 'Gemini API request failed',
    });
  } catch {
    return printable({
      status,
      code: 'GEMINI_UPSTREAM_ERROR',
      message: statusText || 'Gemini API request failed',
    });
  }
}
