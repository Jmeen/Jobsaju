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
