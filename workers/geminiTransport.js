const DIRECT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GATEWAY_BASE_URL = 'https://gateway.ai.cloudflare.com/v1';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

let cachedVertexToken = null;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

async function getVertexAccessToken(env) {
  let credentials;
  try {
    credentials = JSON.parse(clean(env.VERTEX_SERVICE_ACCOUNT_JSON));
  } catch {
    throw new Error('Vertex 서비스 계정 JSON을 읽을 수 없습니다.');
  }
  if (credentials?.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
    throw new Error('Vertex 서비스 계정 JSON 형식이 올바르지 않습니다.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedVertexToken?.clientEmail === credentials.client_email && cachedVertexToken.expiresAt > now + 60) {
    return { accessToken: cachedVertexToken.accessToken, projectId: credentials.project_id };
  }

  const encoder = new TextEncoder();
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claimSet = base64UrlEncode(encoder.encode(JSON.stringify({
    iss: credentials.client_email, scope: GOOGLE_CLOUD_SCOPE, aud: GOOGLE_OAUTH_TOKEN_URL, iat: now, exp: now + 3600,
  })));
  const unsignedToken = `${header}.${claimSet}`;
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(credentials.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsignedToken));
  const assertion = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !clean(body.access_token)) throw new Error(`Vertex 인증에 실패했습니다: ${clean(body?.error_description) || response.status}`);

  cachedVertexToken = { clientEmail: credentials.client_email, accessToken: body.access_token, expiresAt: now + Math.max(60, Number(body.expires_in) || 3600) };
  return { accessToken: cachedVertexToken.accessToken, projectId: credentials.project_id };
}

export async function buildGeminiRequest(env, resourcePath) {
  const apiKey = clean(env.GEMINI_API_KEY);
  const transport = clean(env.GEMINI_TRANSPORT).toLowerCase();
  if (transport === 'vertex') {
    const { accessToken, projectId: credentialProjectId } = await getVertexAccessToken(env);
    const projectId = clean(env.VERTEX_PROJECT_ID) || clean(credentialProjectId);
    const location = clean(env.VERTEX_LOCATION) || 'global';
    const modelPath = clean(resourcePath).replace(/^models\//, '');
    if (!projectId || !modelPath) throw new Error('Vertex 프로젝트 또는 모델 설정이 비어 있습니다.');
    return {
      transport: 'google-vertex-ai',
      url: `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/publishers/google/models/${modelPath}`,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    };
  }

  const accountId = clean(env.CF_AIG_ACCOUNT_ID);
  const gatewayId = clean(env.CF_AIG_GATEWAY_ID);
  const gatewayToken = clean(env.CF_AIG_TOKEN);
  const gatewayValues = [accountId, gatewayId, gatewayToken];
  const gatewayConfigured = gatewayValues.every(Boolean);
  const gatewayPartiallyConfigured = gatewayValues.some(Boolean) && !gatewayConfigured;
  if (gatewayPartiallyConfigured) throw new Error('AI Gateway 설정이 완전하지 않습니다.');
  if (gatewayConfigured && transport !== 'direct') {
    return { transport: 'cloudflare-ai-gateway', url: `${GATEWAY_BASE_URL}/${encodeURIComponent(accountId)}/${encodeURIComponent(gatewayId)}/google-ai-studio/v1/${resourcePath}`, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, 'cf-aig-authorization': `Bearer ${gatewayToken}` } };
  }
  return { transport: 'google-ai-studio-direct', url: `${DIRECT_BASE_URL}/${resourcePath}?key=${encodeURIComponent(apiKey)}`, headers: { 'Content-Type': 'application/json' } };
}

export function hasConfiguredGeminiProvider(env) {
  return clean(env.GEMINI_TRANSPORT).toLowerCase() === 'vertex'
    ? Boolean(clean(env.VERTEX_SERVICE_ACCOUNT_JSON))
    : Boolean(clean(env.GEMINI_API_KEY));
}
