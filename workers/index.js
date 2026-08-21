import { parseGeminiError } from './geminiError.js';
import { encodeSecurePayload } from './crypto.js';
import { buildGeminiRequest } from './geminiTransport.js';
import {
  assessFollowUpQuestion,
  buildRefusalMessage,
  parseFollowUpModelResponse,
} from './followUpPolicy.js';
import { handleShareCardRequest } from './shareCard.js';
import { handleSharePageRequest } from './sharePage.js';
import { handleAdminPageRequest } from './adminPage.js';
import {
  evaluateCoupon,
  listCoupons,
  redeemCoupon,
  revokeCoupon,
  upsertCoupon,
} from './coupons.js';
import {
  buildRepairInstruction,
  formatSeoulDate,
  parseAndValidatePremiumReport,
} from './reportQuality.js';
import {
  GUARDIAN_IDS,
  UUID_V4_PATTERN,
  handleGuardianAnalyticsRequest,
  recordGuardianAnalyticsEvent,
} from './guardianAnalytics.js';

/**
 * 직장인 이직사주 - Cloudflare Workers 기반 AI API 프록시 & 해금 게이트웨이
 */

/**
 * 모델명은 환경 변수로 바꿀 수 있게 둔다 (GEMINI_MODEL).
 * 진단 API에서 생성 가능함을 확인한 최신 Flash 계열을 기본값과 폴백으로 사용합니다.
 */
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const FALLBACK_FLASH_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.7-flash"
];
const REPORT_VERSION = 'copy-v2';
const reportCacheKey = (token) => `report:${REPORT_VERSION}:${token}`;
const EMAIL_HISTORY_LIMIT = 20;

async function kakaoResourceEventId(resourceId) {
  const digest = new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`guardian-share-confirmed:${resourceId}`),
  ));
  digest[6] = (digest[6] & 0x0f) | 0x40;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = [...digest.slice(0, 16)].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * 이메일당 리포트 구매 이력을 [{ token, createdAt, label }, ...] (최신순) 형태로 저장/조회한다.
 * 과거엔 email:<이메일> 키에 토큰 문자열 하나만 저장했으므로, 그 레거시 값도 1건짜리 이력으로 복원한다.
 */
function parseEmailHistory(rawText) {
  if (!rawText) return [];
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // 레거시: JSON이 아닌 순수 토큰 문자열
    return [{ token: rawText, createdAt: null, label: null }];
  }
  return [];
}

function buildReportLabel(userContext) {
  const parts = [userContext?.current_job || userContext?.job_title, userContext?.career_goal || userContext?.goal].filter(Boolean);
  return parts.length ? parts.join(' → ') : 'AI 커리어 리포트';
}

/**
 * 해금 토큰의 유효성을 검증합니다.
 * KV 저장소의 token 레코드 확인, 기존 리포트 보관 여부 확인 및 최종 일관성 지연을 방어합니다.
 */
async function verifyUnlockToken(env, unlockToken) {
  if (!unlockToken || typeof unlockToken !== 'string') return false;
  const token = unlockToken.trim();
  if (token.length < 10) return false;

  if (env.SAJU_KV) {
    // 1. 직접 token 레코드 확인
    let tokenData = await env.SAJU_KV.get(`token:${token}`);
    if (tokenData) return true;

    // 2. 이미 리포트가 보관되어 있는 토큰인지 확인 (결제 완료된 토큰)
    const hasReport = (await env.SAJU_KV.get(reportCacheKey(token))) || (await env.SAJU_KV.get(`report:${token}`));
    if (hasReport) return true;

    // 3. UUID 형식일 경우 KV 복제 지연을 고려해 1회 재시도
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
    if (isUuid) {
      await new Promise((r) => setTimeout(r, 80));
      tokenData = await env.SAJU_KV.get(`token:${token}`);
      if (tokenData) return true;
    }

    return false;
  }

  // KV 미매핑 환경 (로컬 개발 환경)
  return token.length >= 10;
}

/**
 * 리포트 생성 완료 시 사용자에게 알림 이메일을 발송합니다.
 * RESEND_API_KEY 또는 EMAIL_WEBHOOK_URL이 설정되어 있을 때 자동 발송됩니다.
 */
async function sendReportNotificationEmail(env, { email, unlockToken, sajuData, origin }) {
  if (!email || !email.includes('@')) return;
  const baseUrl = origin || env.PUBLIC_SERVICE_URL || 'https://jobsaju.kr';
  const payloadStr = encodeSecurePayload({ token: unlockToken, email });
  const reportUrl = `${baseUrl}/?p=${encodeURIComponent(payloadStr)}`;
  const title = sajuData?.ilgan ? `[직장인 이직사주] ${sajuData.ilgan} 일간 맞춤 커리어 리포트가 완성되었습니다` : `[직장인 이직사주] 요청하신 AI 사주 분석 리포트가 완성되었습니다`;

  // 1. Resend API 연동 (환경변수 RESEND_API_KEY 가 있을 때)
  if (env.RESEND_API_KEY) {
    try {
      const fromEmail = env.RESEND_FROM_EMAIL || '직장인 이직사주 <admin@jobsaju.kr>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: title,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">
              <h2 style="color: #6d28d9; margin-bottom: 12px;">🔮 직장인 이직사주 리포트 완성</h2>
              <p>기다려주셔서 감사합니다! 요청하신 정밀 커리어 사주 분석 리포트가 안전하게 생성되었습니다.</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                <p style="margin: 0 0 10px; font-weight: bold; color: #334155;">언제든 아래 링크를 통해 전체 리포트를 열람하실 수 있습니다:</p>
                <a href="${reportUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">내 리포트 즉시 열람하기 →</a>
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">본 메일은 리포트 생성 시 입력하신 이메일 주소로 발송된 안내 메일입니다.</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error('Failed to send email via Resend:', e);
    }
  }

  // 2. 커스텀 웹훅 / Supabase Function 연동 (환경변수 EMAIL_WEBHOOK_URL 이 있을 때)
  if (env.EMAIL_WEBHOOK_URL) {
    try {
      await fetch(env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, unlockToken, reportUrl, sajuData }),
      });
    } catch (e) {
      console.error('Failed to trigger email webhook:', e);
    }
  }
}

/**
 * "다시보기(이메일로 리포트 찾기)" 요청 시, 화면에 바로 리포트를 보여주는 대신
 * 해당 이메일로 열람 링크(들)을 발송한다 — 이메일 주소만 아는 제3자가 남의 리포트를
 * 그대로 열람할 수 없도록 이메일 소유권을 확인하는 절차다.
 */
async function sendLookupEmail(env, { email, history, origin }) {
  if (!email || !history || history.length === 0) return;
  const baseUrl = origin || env.PUBLIC_SERVICE_URL || 'https://jobsaju.kr';
  const linksHtml = history.map(({ token, createdAt, label }) => {
    const payloadStr = encodeSecurePayload({ token, email });
    const reportUrl = `${baseUrl}/?p=${encodeURIComponent(payloadStr)}`;
    const dateLabel = createdAt ? new Date(createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '날짜 미상';
    return `<div style="margin-bottom:10px;"><a href="${reportUrl}" style="color:#7c3aed;font-weight:bold;text-decoration:none;">[${dateLabel}] ${label || 'AI 커리어 리포트'} 열람하기 →</a></div>`;
  }).join('');

  const title = '[직장인 이직사주] 리포트 다시보기 링크';

  if (env.RESEND_API_KEY) {
    try {
      const fromEmail = env.RESEND_FROM_EMAIL || '직장인 이직사주 <admin@jobsaju.kr>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: title,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; line-height: 1.6;">
              <h2 style="color: #6d28d9; margin-bottom: 12px;">🔮 리포트 다시보기</h2>
              <p>요청하신 리포트 열람 링크입니다. 아래에서 확인해 주세요:</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
                ${linksHtml}
              </div>
              <p style="font-size: 12px; color: #64748b; margin-top: 24px;">본인이 요청하지 않으셨다면 이 메일은 무시하셔도 됩니다.</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error('Failed to send lookup email via Resend:', e);
    }
  }

  if (env.EMAIL_WEBHOOK_URL) {
    try {
      await fetch(env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          type: 'lookup',
          links: history.map(({ token, createdAt, label }) => ({ token, createdAt, label })),
        }),
      });
    } catch (e) {
      console.error('Failed to trigger lookup email webhook:', e);
    }
  }
}

/**
 * Gemini 호출 공통 처리.
 * 지정한 모델이 API Key 쿼터/지역 미지원(404)일 경우, 사용 가능한 가성비 Flash 모델로 자동 폴백합니다.
 */
async function callGemini(env, { systemInstruction, prompt }) {
  const initialModel = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  
  // 시도할 모델 순서 (지정 모델 -> 범용 Flash 후보군 순서)
  const modelsToTry = Array.from(new Set([initialModel, ...FALLBACK_FLASH_MODELS]));
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const genConfig = { responseMimeType: "application/json" };
      // 2.0/2.5 Thinking 모델일 경우 생각 토큰 설정 추가
      if (model.includes("2.0") || model.includes("2.5")) {
        genConfig.thinkingConfig = { thinkingBudget: 1024 };
      }

      const providerRequest = buildGeminiRequest(env, `models/${model}:generateContent`);
      const res = await fetch(providerRequest.url, {
        method: "POST",
        headers: providerRequest.headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: genConfig,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        const { code, message } = parseGeminiError(res.status, res.statusText, detail);

        // 404 Not Found (해당 키에서 모델을 찾을 수 없음)인 경우 다음 후보 모델로 시도
        if (res.status === 404 || code === "NOT_FOUND" || detail.includes("404")) {
          lastError = new Error(`Gemini 모델 ${model} 미지원 (404): ${message}`);
          continue;
        }

        throw new Error(
          `Gemini 호출 실패 (model=${model}, status=${res.status}, code=${code}): ${message}`
        );
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      // thought: true(생각 과정)가 아닌 실제 모델 답변 파트를 추출하여 결합
      const answerParts = parts.filter(p => !p.thought && typeof p.text === 'string');
      let text = answerParts.map(p => p.text).join('\n').trim();
      if (!text && parts.length > 0) {
        text = parts[parts.length - 1]?.text || '';
      }

      if (!text) {
        throw new Error(`Gemini 응답에 본문이 없습니다: ${JSON.stringify(data).slice(0, 300)}`);
      }

      // 마크다운 코드 블록(```json ... ```)이 포함된 경우 순수 JSON 텍스트만 추출
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      return text;
    } catch (err) {
      if (err.message.includes("404") || err.message.includes("NOT_FOUND") || err.message.includes("미지원")) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("사용 가능한 Gemini Flash 모델을 찾지 못했습니다.");
}

export default {
  async fetch(request, env, ctx) {
    // 1. CORS Preflight 처리
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const shareCardResponse = await handleShareCardRequest(request, env);
    if (shareCardResponse) return shareCardResponse;

    const sharePageResponse = await handleSharePageRequest(request, env);
    if (sharePageResponse) return sharePageResponse;

    // 쿠폰 관리자 페이지 — 뼈대 HTML만 내려주고, 실제 인증은 페이지 안 fetch가 /api/admin/coupons*로 한다.
    const adminPageResponse = handleAdminPageRequest(request);
    if (adminPageResponse) return adminPageResponse;

    // 진단용: 이 배포가 어떤 키/모델을 보고 있고, 그 키로 어떤 모델을 쓸 수 있는지 확인한다.
    // (키 값 자체는 절대 노출하지 않는다)
    if (request.method === "GET" && new URL(request.url).pathname === "/api/diag") {
      const model = env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      const result = {
        has_api_key: Boolean(env.GEMINI_API_KEY),
        has_kv: Boolean(env.SAJU_KV),
        configured_model: model,
      };

      try {
        const providerRequest = buildGeminiRequest(env, 'models');
        result.ai_transport = providerRequest.transport;
        result.gateway_configured = providerRequest.transport === 'cloudflare-ai-gateway';

        if (env.GEMINI_API_KEY) {
          const res = await fetch(providerRequest.url, { headers: providerRequest.headers });
          const body = await res.json();
          if (!res.ok) {
            result.models_error = body?.error?.message || `status ${res.status}`;
          } else {
            const usable = (body.models || [])
              .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
              .map((m) => m.name.replace("models/", ""));
            result.usable_models = usable;
            result.configured_model_available = usable.includes(model);
            result.recommended_model = usable.find(m => FALLBACK_FLASH_MODELS.includes(m)) || usable[0] || DEFAULT_GEMINI_MODEL;
          }
        }
      } catch (err) {
        result.ai_transport = 'configuration-error';
        result.gateway_configured = false;
        result.models_error = err instanceof Error ? err.message : 'AI Gateway 설정을 확인하지 못했습니다.';
      }

      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // --- 카카오톡 공유 웹훅 (GET 또는 POST) — 카카오 서버가 실제 전송 성공 시에만 호출한다.
    // Kakao Developers 콘솔 [앱 > 웹훅 > 카카오톡 공유 웹훅]에 이 URL을 등록해야 들어온다.
    if (new URL(request.url).pathname === "/api/kakao-share-webhook") {
      const expectedAuth = env.KAKAO_ADMIN_KEY ? `KakaoAK ${env.KAKAO_ADMIN_KEY}` : null;
      const receivedAuth = request.headers.get("Authorization") || "";
      // Admin Key 미설정이거나 헤더가 일치하지 않으면(카카오 서버가 아닌 임의의 호출) 거부한다.
      if (!expectedAuth || receivedAuth !== expectedAuth) {
        return new Response("Unauthorized", { status: 401 });
      }

      const callbackArgs = Object.fromEntries(new URL(request.url).searchParams);
      if (request.method === "POST") {
        try {
          const contentType = request.headers.get("Content-Type") || "";
          if (contentType.includes("application/json")) {
            const body = await request.json();
            if (body && typeof body === 'object') Object.assign(callbackArgs, body);
          } else {
            const body = await request.text();
            Object.assign(callbackArgs, Object.fromEntries(new URLSearchParams(body)));
          }
        } catch {
          // 바디 파싱에 실패해도 아래에서 2XX만 정상 응답하면 된다 (문서 요구사항: 3초 내 2XX).
        }
      }

      const unlockToken = typeof callbackArgs.unlock_token === 'string' ? callbackArgs.unlock_token : null;

      // 결제 전 클라이언트는 'local-developer-unlock-token'이라는 고정 상수를 들고 다닌다.
      // 검증 없이 기록하면 무료 사용자 한 명의 공유가 같은 상수를 쓰는 모든 무료 사용자에게
      // 보너스 획득으로 표시된다(실제 추가 질문은 /api/followup이 막지만 UI가 어긋난다).
      // /api/share-bonus와 동일하게 실제 해금 토큰만 기록한다.
      if (unlockToken && env.SAJU_KV && await verifyUnlockToken(env, unlockToken)) {
        await env.SAJU_KV.put(`share-bonus:${unlockToken}`, new Date().toISOString());
      }

      const shareId = typeof callbackArgs.share_id === 'string' ? callbackArgs.share_id : null;
      const resultSessionId = typeof callbackArgs.result_session_id === 'string' ? callbackArgs.result_session_id : null;
      const visitorSessionId = typeof callbackArgs.visitor_session_id === 'string' ? callbackArgs.visitor_session_id : null;
      const guardianId = typeof callbackArgs.guardian_id === 'string' ? callbackArgs.guardian_id : null;
      const kakaoResourceId = request.headers.get('X-Kakao-Resource-ID')?.trim() || null;
      const hasValidAnalyticsMetadata = [shareId, resultSessionId, visitorSessionId].every(value => UUID_V4_PATTERN.test(value || ''))
        && Boolean(guardianId && GUARDIAN_IDS.has(guardianId))
        && Boolean(kakaoResourceId);
      if (hasValidAnalyticsMetadata && env.DB) {
        const analyticsTask = (async () => {
          await recordGuardianAnalyticsEvent(env, {
            eventId: await kakaoResourceEventId(kakaoResourceId),
            eventName: 'guardian_share_confirmed',
            occurredAt: new Date().toISOString(),
            shareId,
            resultSessionId,
            visitorSessionId,
            guardianId,
            shareChannel: 'kakao',
            utmSource: 'guardian_share',
          });
        })().catch(() => {
          // 분석 D1 장애가 카카오의 2XX 웹훅 계약이나 공유 보상을 막으면 안 된다.
        });
        if (ctx && typeof ctx.waitUntil === 'function') {
          ctx.waitUntil(analyticsTask);
        } else {
          // Node 단위 테스트나 ExecutionContext가 없는 호환 런타임에서는 안전하게 완료를 기다린다.
          await analyticsTask;
        }
      }

      return new Response("OK", { status: 200 });
    }

    const guardianAnalyticsResponse = await handleGuardianAnalyticsRequest(request, env);
    if (guardianAnalyticsResponse) return guardianAnalyticsResponse;

    // --- 프론트엔드가 카카오 웹훅 도착 여부를 짧은 간격으로 확인하는 폴링 API ---
    if (request.method === "GET" && new URL(request.url).pathname === "/api/share-bonus/status") {
      const unlockToken = new URL(request.url).searchParams.get("unlock_token");
      let granted = false;
      if (env.SAJU_KV && unlockToken) {
        granted = Boolean(await env.SAJU_KV.get(`share-bonus:${unlockToken}`));
      }
      return new Response(JSON.stringify({ granted }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // --- [신규 경로] 무료 사주 결과 제공 API (AI 호출 없음) ---
    if (new URL(request.url).pathname === "/api/free-result") {
      try {
        const { year, month, day, hour, minute, gender, isSolar } = await request.json();
        
        // 1. sajuEngine을 통해 사주 계산
        const { buildFreeSajuResult } = await import('./sajuEngine.js');
        const sajuResult = buildFreeSajuResult(year, month, day, hour, minute, gender, isSolar);
        
        // 2. 일주 추출 및 60갑자 DB 매칭
        const dayPillar = sajuResult.pillars.day.ganHanja + sajuResult.pillars.day.zhiHanja;
        const characters = (await import('../free_engine_characters.js')).default;
        
        const characterData = characters.find(c => c.id === dayPillar);
        if (!characterData) {
          return new Response(JSON.stringify({ error: `일주(${dayPillar})에 매칭되는 캐릭터를 찾을 수 없습니다.` }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        
        return new Response(JSON.stringify({
          saju_data: sajuResult,
          character: characterData
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "무료 사주 계산 중 오류가 발생했습니다." }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }

    try {
      const url = new URL(request.url);

      // --- [경로: 유료 리포트 생성 API (V5.1)] ---
      if (request.method === "POST" && url.pathname === "/api/paid-report") {
        const { handlePaidReportRequest } = await import('./paidReportApi.js');
        return handlePaidReportRequest(request, env);
      }

      // --- [경로 0] 토큰 기반 해금 리포트 조회 API (딥링크/이메일 링크 복구용) ---
      if (url.pathname === "/api/report-by-token" || (request.method === "GET" && url.pathname === "/api/report")) {
        const unlockToken = url.searchParams.get("unlock_token") || (request.method === "POST" ? (await request.json().catch(() => ({})))?.unlock_token : null);
        if (!unlockToken) {
          return new Response(JSON.stringify({ error: "해금 토큰이 필요합니다." }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        if (!env.SAJU_KV) {
          return new Response(JSON.stringify({ error: "KV 저장소 매핑이 필요합니다." }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const currentReportText = await env.SAJU_KV.get(reportCacheKey(unlockToken));
        const legacyReportText = currentReportText ? null : await env.SAJU_KV.get(`report:${unlockToken}`);
        const cachedReportText = currentReportText || legacyReportText;
        const metaText = await env.SAJU_KV.get(`meta:${unlockToken}`);

        if (!cachedReportText) {
          return new Response(JSON.stringify({ error: "리포트를 찾지 못했습니다." }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const meta = metaText ? JSON.parse(metaText) : {};

        // 저장된 추가 질문 내역 가져오기
        let followups = [];
        const followupsText = await env.SAJU_KV.get(`followups:${unlockToken}`);
        if (followupsText) {
          try { followups = JSON.parse(followupsText); } catch(e) {}
        }

        // 이 리포트의 소유 이메일로 다른 구매 이력이 있으면 함께 내려줘서, 메일 속 링크 하나로 들어와도
        // 과거 리포트를 골라볼 수 있게 한다.
        let history = [];
        const ownerEmail = String(meta?.user_context?.email || '').toLowerCase().trim();
        if (ownerEmail) {
          history = parseEmailHistory(await env.SAJU_KV.get(`email:${ownerEmail}`)).map(({ token, createdAt, label }) => ({
            unlock_token: token,
            created_at: createdAt,
            label: label || 'AI 커리어 리포트',
          }));
        }

        return new Response(JSON.stringify({
          status: "success",
          report: JSON.parse(cachedReportText),
          user_context: meta.user_context || null,
          saju_data: meta.saju_data || null,
          unlockToken,
          history,
          followups,
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 1] 결제 검증 및 토큰 발급 API (쿠폰은 SAJU_KV에 등록된 코드만 인정) ---
      if (url.pathname === "/api/payment/validate") {
        const requestBody = await request.json().catch(() => ({}));
        const { paymentId = '', couponCode = '' } = requestBody;

        let isPaymentValid = false;
        let appliedCoupon = null;
        let failureReason = null;

        if (couponCode) {
          // 1. 쿠폰 코드 검증 — 소스에 박힌 문자열이 아니라 SAJU_KV의 coupon:<CODE> 레코드만 인정하고,
          //    성공 시 usedCount를 소비해 무제한 재사용을 막는다.
          const result = await redeemCoupon(env, couponCode);
          if (result.ok) {
            isPaymentValid = true;
            appliedCoupon = result.code;
          } else {
            failureReason = result.reason;
          }
        } else if (env.PAYMENT_SANDBOX_MODE === "true") {
          // 서버 환경변수로만 켤 수 있는 개발/테스트 우회. 클라이언트가 임의로 켤 수 없다
          // (예전엔 paymentId가 "sandbox-"로 시작하기만 하면 통과였는데, 클라이언트가 그 문자열을
          // 매번 스스로 만들어 보냈기 때문에 사실상 전원 무료 통과였다).
          isPaymentValid = true;
        } else if (paymentId) {
          // 포트원 결제 상태 교차 검증 (PortOne V2 API 호출)
          const PORTONE_API_KEY = env.PORTONE_API_KEY;
          const portoneRes = await fetch(`https://api.portone.io/payments/${paymentId}`, {
            headers: {
              "Authorization": `PortOne ${PORTONE_API_KEY}`,
              "Content-Type": "application/json"
            }
          });

          if (portoneRes.ok) {
            const paymentData = await portoneRes.json();
            // 금액 위변조 검증 — 가격 A/B 변형(6,900 / 8,900) 중 하나여야 하며 PAID 상태여야 한다
            const VALID_AMOUNTS = [6900, 8900];
            if (paymentData.status === "PAID" && VALID_AMOUNTS.includes(paymentData.amount.total)) {
              isPaymentValid = true;
            }
          }
        }

        if (!isPaymentValid) {
          return new Response(JSON.stringify({
            error: failureReason || (paymentId
              ? "결제 검증에 실패했습니다."
              : "결제 시스템을 준비 중입니다. 테스터이신가요? 쿠폰 코드를 입력해 주세요."),
          }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // 해금용 유일 토큰 발급 (UUIDv4)
        const unlockToken = crypto.randomUUID();

        // KV 저장소나 D1 데이터베이스에 토큰 영구 바인딩 (환경에 KV가 매핑되어 있을 때 활용)
        if (env.SAJU_KV) {
          await env.SAJU_KV.put(`token:${unlockToken}`, JSON.stringify({
            paymentId,
            coupon: appliedCoupon,
            createdAt: new Date().toISOString(),
            status: "unlocked"
          }));
        }

        return new Response(JSON.stringify({
          status: "success",
          unlockToken,
          couponApplied: Boolean(appliedCoupon)
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 1-1] 쿠폰 코드 실시간 확인 (소비하지 않음) — 입력창에서 바로 유효성 피드백용 ---
      if (url.pathname === "/api/coupon/check") {
        const { couponCode = '' } = await request.json().catch(() => ({}));
        const result = await evaluateCoupon(env, couponCode);
        if (!result.ok) {
          return new Response(JSON.stringify({ valid: false, error: result.reason }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        const remainingUses = typeof result.coupon.maxUses === 'number'
          ? Math.max(0, result.coupon.maxUses - result.coupon.usedCount)
          : null;
        return new Response(JSON.stringify({
          valid: true,
          code: result.code,
          remainingUses,
          expiresAt: result.coupon.expiresAt,
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 1-2] 쿠폰 관리자 API — 재배포 없이 코드를 추가·조회·회수한다 ---
      // Authorization: Bearer <COUPON_ADMIN_KEY> 헤더가 필요하다.
      if (url.pathname.startsWith("/api/admin/coupons")) {
        const expectedAuth = env.COUPON_ADMIN_KEY ? `Bearer ${env.COUPON_ADMIN_KEY}` : null;
        const receivedAuth = request.headers.get("Authorization") || "";
        if (!expectedAuth || receivedAuth !== expectedAuth) {
          return new Response(JSON.stringify({ error: "관리자 인증에 실패했습니다." }), {
            status: 401,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        if (!env.SAJU_KV) {
          return new Response(JSON.stringify({ error: "KV 저장소가 설정되지 않았습니다." }), {
            status: 503,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const body = await request.json().catch(() => ({}));

        if (url.pathname === "/api/admin/coupons/list") {
          const coupons = await listCoupons(env);
          return new Response(JSON.stringify({ coupons }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        if (url.pathname === "/api/admin/coupons/revoke") {
          const revoked = await revokeCoupon(env, body.code);
          if (!revoked) {
            return new Response(JSON.stringify({ error: "존재하지 않는 코드입니다." }), {
              status: 404,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          }
          return new Response(JSON.stringify({ coupon: revoked }), {
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        if (url.pathname === "/api/admin/coupons") {
          try {
            const coupon = await upsertCoupon(env, {
              code: body.code,
              maxUses: Number(body.maxUses),
              expiresAt: body.expiresAt || null,
              note: body.note || '',
            });
            return new Response(JSON.stringify({ coupon }), {
              status: 201,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
              status: 400,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          }
        }

        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 2-1] 공유 완료 후 보너스 질문권 등록 ---
      if (url.pathname === "/api/share-bonus") {
        const { unlock_token } = await request.json();
        const isAuthorized = await verifyUnlockToken(env, unlock_token);
        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: "해금 토큰이 유효하지 않습니다." }), {
            status: 403,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        if (env.SAJU_KV) {
          await env.SAJU_KV.put(`share-bonus:${unlock_token}`, new Date().toISOString());
        }
        return new Response(JSON.stringify({ status: "success" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 2-2] 추가 질문 API (기본 1회 + 공유 보너스 1회) ---
      if (url.pathname === "/api/followup") {
        const { unlock_token, question, question_index, saju_summary, user_context } = await request.json();

        // 해금 토큰 검증
        const isAuthorized = await verifyUnlockToken(env, unlock_token);
        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: "해금 토큰이 유효하지 않습니다." }), {
            status: 403,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const questionIndex = Number(question_index || 1);
        if (!Number.isInteger(questionIndex) || questionIndex < 1 || questionIndex > 2) {
          return new Response(JSON.stringify({ error: "추가 질문을 모두 사용했습니다." }), {
            status: 409,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
        const usageKey = questionIndex === 2
          ? `followup:${unlock_token}:bonus`
          : `followup:${unlock_token}`;

        // 기본 1회와 공유 보너스 1회를 각각 강제한다.
        if (env.SAJU_KV) {
          if (questionIndex === 2) {
            const bonus = await env.SAJU_KV.get(`share-bonus:${unlock_token}`);
            if (!bonus) {
              return new Response(JSON.stringify({ error: "친구에게 공유하면 질문을 한 번 더 할 수 있습니다." }), {
                status: 403,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
              });
            }
          }
          const used = await env.SAJU_KV.get(usageKey);
          if (used) {
            return new Response(JSON.stringify({ error: "해당 추가 질문을 이미 사용했습니다." }), {
              status: 409,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          }
        }

        // 질문 검증 (비용·어뷰징 가드)
        const q = (question || "").trim();
        if (q.length < 5 || q.length > 300) {
          return new Response(JSON.stringify({ error: "질문은 5~300자로 적어주세요." }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // 명백히 위험하거나 커리어 범위를 벗어난 질문은 AI에 보내지 않는다.
        // 차단된 질문은 KV에 사용 완료를 기록하지 않아 질문권도 소진되지 않는다.
        const questionAssessment = assessFollowUpQuestion(q);
        if (!questionAssessment.allowed) {
          return new Response(JSON.stringify({
            code: "FOLLOWUP_BLOCKED",
            error: buildRefusalMessage(questionAssessment),
            suggestion: "예: 지금 갈등이 있는 직장에서 안전하게 관계를 정리하고 이직하려면 무엇부터 해야 할까요?",
          }), {
            status: 422,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const GEMINI_API_KEY = env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: "서버 AI API Key 설정 오류" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const generatedAt = formatSeoulDate();
        const followupSystem = `
당신은 한국 직장인의 이직·잔류·연봉 협상을 상담해 온 시니어 커리어 상담사입니다.
사용자는 이미 상세 리포트를 읽었고, 남은 궁금증 하나를 추가로 질문했습니다.
기준 시간대는 Asia/Seoul이며 생성 기준일은 ${generatedAt}입니다.

[가장 중요한 규칙]
답변을 쓰기 전에 질문을 먼저 정리하고 question_analysis에 구조화하십시오. 그 분석에 맞춰 사용자가 실제로 물은 것에 답하십시오. 총평이나 전체 흐름 요약으로 시작하지 마십시오.
- question_analysis.summary에는 질문을 복사하지 말고, 사용자가 실제로 알고 싶은 결정을 한 문장으로 정리하십시오.
- primary_intent와 secondary_intents로 복합 질문의 모든 의도를 보존하고, constraints에는 질문과 사용자 상황에 나온 현실 제약만 넣으십시오.
- 첫 문장은 반드시 질문에 대한 직접적인 답이어야 합니다.
  질문이 "언제"를 물으면 시점으로, "얼마"를 물으면 금액 기준으로,
  "해도 되는지"를 물으면 된다/안 된다와 그 조건으로 시작하십시오.
- "이 질문의 답은 큰 흐름 위에서 봐야 합니다" 같은 서론은 금지입니다. 바로 답부터 쓰십시오.
- 사주 데이터는 답을 뒷받침하는 근거로만 쓰고, 질문과 무관한 지표는 언급하지 마십시오.
  (연봉을 물었는데 이직운 점수를 나열하는 식의 답변은 실패입니다)
- 질문이 두 선택지를 비교하는 것이면 반드시 어느 쪽에 무게가 실리는지 밝히고 그 이유를 대십시오.
  판단을 회피한 채 "본인이 결정할 문제입니다"로 끝내지 마십시오.
- 업종·산업군·IT 유지·직무 전환 질문에는 월운이나 협상운을 기본 근거로 쓰지 마십시오. 현재 경력의 전환 가능성, 목표, 채용공고 요구조건, 시장에서 검증할 행동으로 답하십시오.
- 입력에 없는 경력, 회사 사정, 적합 업종을 만들어내지 마십시오. 정보가 부족하면 단정 대신 확인 조건을 밝히십시오.
- 시점을 추천할 때 생성 기준일 이전 날짜나 달을 앞으로 실행할 계획으로 제시하지 마십시오. 과거를 언급해야 한다면 이미 지난 시점임을 밝히고 현재 이후 행동으로 다시 제안하십시오.
- 불합격 원인, 합격 가능성, 승진 가능성, CEO 가능성을 사실처럼 확정하지 말고 가능한 원인과 확인 방법을 함께 제시하십시오.
- 한국어 중심으로 작성하고 필요한 영문 직함·약어 외의 다른 문자권 단어를 섞지 마십시오.

[그 외 규칙]
1. 한국어 350~550자, 존댓말, 2~3개 문단.
2. 사주는 참고 근거이며, 현실 조건(연봉·계약·평가·리더)을 함께 확인하도록 이끄십시오.
3. 건강·법률·투자에 대한 단정적 조언은 하지 마십시오.
4. 리포트 본문을 다시 쓰지 마십시오. 이미 읽은 내용의 반복은 가치가 없습니다.
5. 반드시 아래 형태의 유효한 JSON만 반환하십시오. 허용 intent는 industry, role, timing, offer, salary, wait, quit, people, compare, preparation, general입니다.
{
  "question_analysis": {
    "summary": "사용자가 실제로 알고 싶은 것",
    "primary_intent": "industry",
    "secondary_intents": ["compare"],
    "answer_mode": "choice",
    "constraints": ["질문에 실제로 나타난 제약"]
  },
  "answer": "질문에 직접 답하는 한국어 350~550자, 2~4개 문단"
}
`;

        const followupPrompt = `
[사주 요약]
${JSON.stringify(saju_summary || {}, null, 2)}

[사용자 상황]
${JSON.stringify(user_context || {}, null, 2)}

[규칙 기반 사전 분석]
${JSON.stringify(questionAssessment, null, 2)}

[추가 질문]
${q}
`;

        const rawAnswer = await callGemini(env, {
          systemInstruction: followupSystem,
          prompt: followupPrompt,
        });

        const parsedAnswer = parseFollowUpModelResponse(rawAnswer);
        if (!parsedAnswer) {
          return new Response(JSON.stringify({
            code: "FOLLOWUP_INVALID_RESPONSE",
            error: "답변 형식을 확인하지 못했습니다. 질문권은 사용되지 않았으니 다시 시도해 주세요.",
          }), {
            status: 502,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // 성공한 뒤에만 사용 처리 (실패 시 기회를 태우지 않는다)
        if (env.SAJU_KV) {
          await env.SAJU_KV.put(usageKey, new Date().toISOString());

          // 추가 질문 저장
          const followupsKey = `followups:${unlock_token}`;
          let followups = [];
          const existingText = await env.SAJU_KV.get(followupsKey);
          if (existingText) {
            try { followups = JSON.parse(existingText); } catch (e) {}
          }
          followups.push({
            question: q,
            answer: parsedAnswer,
            answeredAt: generatedAt,
          });
          const ttl = 60 * 60 * 24 * 90; // 90일
          await env.SAJU_KV.put(followupsKey, JSON.stringify(followups), { expirationTtl: ttl });
        }

        return new Response(JSON.stringify(parsedAnswer), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 3] 이메일 기반 해금 리포트 조회 API ---
      if (url.pathname === "/api/lookup") {
        const { email } = await request.json();
        const rawEmail = String(email || '').toLowerCase().trim();

        if (!rawEmail || !rawEmail.includes('@')) {
          return new Response(JSON.stringify({ error: "올바른 이메일 주소를 입력해 주세요." }), {
            status: 400,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        if (!env.SAJU_KV) {
          return new Response(JSON.stringify({ error: "조회 기능은 KV 저장소 매핑 후 이용 가능합니다." }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const history = parseEmailHistory(await env.SAJU_KV.get(`email:${rawEmail}`));
        if (history.length === 0) {
          return new Response(JSON.stringify({ error: "해당 이메일로 구매된 해금 리포트 내역이 없습니다." }), {
            status: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // 이메일 주소만 아는 제3자가 곧바로 리포트를 열람하지 못하도록, 여기서는 내용을 반환하지 않고
        // 해당 이메일로만 열람 링크를 발송한다. 링크(secret unlock_token)를 손에 넣어야 열람이 가능하다 —
        // 즉 "그 메일함을 열 수 있는 사람"만 다시보기가 가능하다.
        if (!env.RESEND_API_KEY && !env.EMAIL_WEBHOOK_URL) {
          return new Response(JSON.stringify({ error: "이메일 발송 설정이 아직 준비되지 않았습니다. 운영자에게 문의해 주세요." }), {
            status: 503,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const origin = request.headers.get("origin") || (request.headers.get("referer") ? new URL(request.headers.get("referer")).origin : undefined);
        await sendLookupEmail(env, { email: rawEmail, history, origin });

        return new Response(JSON.stringify({
          status: "sent",
          message: "입력하신 이메일로 리포트 열람 링크를 보내드렸습니다. 메일함(스팸함 포함)을 확인해 주세요.",
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      // --- [경로 2] AI 상세 리포트 해석 API (보안 프록시) ---
      if (url.pathname === "/api/interpret") {
        const { user_context, saju_data, unlock_token } = await request.json();

        // 해금 토큰 유효성 검증
        const isAuthorized = await verifyUnlockToken(env, unlock_token);
        if (!isAuthorized) {
          return new Response(JSON.stringify({ error: "상세 리포트 해금 토큰이 유효하지 않습니다." }), {
            status: 403,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // 1. 이미 생성된 리포트가 KV에 저장되어 있다면 Gemini 호출 없이 바로 반환 (비용 0원)
        if (env.SAJU_KV) {
          const cachedReport = await env.SAJU_KV.get(reportCacheKey(unlock_token));
          if (cachedReport) {
            return new Response(cachedReport, {
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            });
          }
        }

        // Gemini API 호출 설정 (Gemini 2.5 Flash 모델 활용)
        const GEMINI_API_KEY = env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
          return new Response(JSON.stringify({ error: "서버 AI API Key 설정 오류" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        // 이직 고민에 특화된 프리미엄 커리어 상담 리포트 프롬프트
        const generatedAt = formatSeoulDate();
        const systemInstruction = `
당신은 한국 직장인의 이직, 잔류, 연봉 협상을 오랫동안 상담해 온 시니어 커리어 상담사입니다.
사주 명리 정보는 사용자의 성향과 시기를 해석하는 참고 근거로 사용하되, 퇴사나 이직을 운명처럼 단정하지 않습니다.
사용자가 제공한 현재 직무, 경력 목표, 핵심 고민을 현실적인 노동 조건과 함께 분석해 구체적인 선택 기준과 행동 계획을 제공합니다.
말투는 차분하고 따뜻한 존댓말을 사용하며, 과장된 신비주의 표현이나 공포를 유발하는 표현은 사용하지 않습니다.
기준 시간대는 Asia/Seoul이며 생성 기준일은 ${generatedAt}입니다.

[작성 원칙 - 필수]
1. 사용자가 작성한 구체적 고민은 분석 맥락으로 보존하되 personal_answer.question에는 의미를 유지해 정제한 질문 제목을 짧은 명사형으로 작성하십시오. 구어체 원문을 그대로 제목에 복사하지 마십시오.
1-1. 리포트를 쓰기 전에 모든 답변을 다시 읽고 사용자가 실제로 결정하려는 것, 목표 역할, 해석에 필요한 전제를 intent_summary에 먼저 정리하십시오.
1-2. CSO, CRO, COO처럼 여러 의미가 있거나 범위가 겹치는 약어를 하나의 직함으로 합치지 마십시오. 실제 업무 설명으로 구분할 수 있을 때만 정식 명칭을 확정하고, 근거가 부족하면 needs_clarification을 true로 두고 가능한 직함을 각각 설명하십시오.
1-3. intent_summary는 상담사가 마주 앉아 말하듯 자연스러운 문장으로 쓰십시오. "~를 의미하며", "~로도 쓰이지만", "~로 확정하여 해석합니다"처럼 사전적 정의를 나열하고 판단 근거를 설명하는 방식(AI가 추론 과정을 그대로 드러내는 문체)은 금지합니다. 약어의 뜻이 분명하면 풀이 없이 바로 그 역할을 전제로 이야기를 시작하고, 정말 모호할 때(needs_clarification=true)만 후보를 대화하듯 한 문장으로 짧게 언급하십시오. "사용자는 ~습니다"처럼 3인칭 보고서 문체도 쓰지 말고, 리포트의 다른 문단과 같은 상담사의 목소리를 유지하십시오.
2. 오행, 십성, 대운, 세운 등 명리학 용어를 사용할 때마다 바로 뒤에 직장인이 이해할 수 있는 쉬운 설명을 붙이십시오. 예: "식상, 즉 내 실력을 결과물과 말로 드러내는 힘".
3. 점수만 반복하지 말고 점수가 의미하는 기회, 조건, 위험을 분리해 설명하십시오. 이직·잔류·협상 각각을 공정하게 비교하십시오.
4. 연봉, 직책, 업무 범위, 평가 기준, 재택과 야근, 직속 리더, 재무 여유 등 현실 조건을 반드시 함께 검토하게 하십시오.
5. 특정 직무를 제안할 때는 사용자가 입력한 경력과 목표에서 합리적으로 이어지는 직무만 제시하십시오. 입력에 근거가 없다면 억지로 IT 직무명을 만들지 마십시오.
6. 전체 리포트는 한국어 3,500~4,500자 수준으로 작성하되 같은 내용을 반복해 분량을 늘리지 마십시오. 각 content는 2~3개의 짧은 문단으로 나누고 문단 사이에 줄바꿈을 넣으십시오.
7. 건강, 법률, 투자에 관한 단정적 조언을 하지 말고, 사주는 결정을 돕는 참고 자료임을 closing_advice에서 자연스럽게 알리십시오.
8. 반드시 아래 JSON 구조를 지킨 유효한 JSON만 반환하십시오. 마크다운 코드 펜스나 JSON 밖의 문장은 출력하지 마십시오.
9. "귀하", "긍정적인 흐름", "절호의 기회", "현실적으로 볼 필요가 있습니다", "단순히 A가 아니라 B입니다", "무엇보다 중요합니다" 같은 생성형 AI 상투어를 사용하지 마십시오.
9-1. 사용자가 입력한 직무·연차·목표·고민의 의미를 적어도 세 개 이상의 섹션에 자연스럽게 반영하십시오. 짧거나 구어적인 표현을 반복 인용하지 마십시오.
9-2. "3곳 이상 비교하세요", "조건을 3가지로 나누세요", "장단점을 표로 정리하세요"처럼 누구에게나 통하는 체크리스트형 조언은 이 사용자의 사주 근거(십성·점수 등급·세운·신강신약)와 연결해 왜 지금 이 사람에게 필요한지 설명할 수 있을 때만 쓰십시오. 근거 없이 쓸 수 없다면 그 조언을 빼십시오.
10. 문단마다 교훈을 붙이지 마십시오. 짧은 관찰, 구체적인 근거, 다음 행동을 자연스럽게 섞고 문장 길이를 다양하게 하십시오.
11. 입력에 없는 경력, 성과, 회사 사정을 만들어내지 마십시오. 확인되지 않은 내용은 "입력만으로는 알 수 없습니다"라고 분명히 쓰십시오.
12. 사용자의 질문에서 결정을 바꾸는 현실 조건을 한 가지 이상 추출해 decision_factors에 정리하십시오. 재무 여유, 출퇴근, 재택, 서면 약속, 실제 권한, 역할 전환처럼 조건이 달라지면 recommendation과 checks도 반드시 달라져야 합니다. 질문을 그대로 반복하는 것으로 대신하지 마십시오.
13. 행동 시점을 제안할 때 생성 기준일 이전 날짜나 달을 미래 계획으로 추천하지 마십시오. 과거 시기를 언급해야 한다면 이미 지난 시점임을 밝히고 실제 행동 계획은 기준일 이후로 다시 제시하십시오.
14. 리포트는 한국어 중심으로 작성하고 필요한 영문 직함·약어 외의 다른 문자권 단어를 섞지 마십시오. "정차", "높음 협상운", "커리어 골인", "몸값", "서류를 뿌리다", "진짜 CEO" 같은 오류·과장·가벼운 표현을 사용하지 마십시오.
15. 불합격 원인, 합격 가능성, 승진 가능성, CEO 가능성을 사실처럼 확정하지 마십시오. 가능한 원인에는 확인 방법을 붙이고, 특정 업종·직무는 사용자 입력에서 근거가 이어질 때만 제시하십시오.
16. 연봉 범위는 사주 점수로 정당화하지 마십시오. 시장 연봉, 총보상, 직무 범위, 기업의 보상 밴드를 먼저 확인하도록 안내하십시오.
17. one_line_conclusion, three_paths, decision_factors.recommendation, closing_advice는 하나의 결론선 위에 있어야 합니다. 세 점수 중 가장 높은 점수의 경로를 one_line_conclusion에서 우선순위로 제시했다면, closing_advice나 decision_factors.recommendation에서 그 경로를 부정하거나 "무리한 OO보다"처럼 깎아내리지 마십시오. 점수가 가장 높은 경로를 권하지 않을 것이라면 one_line_conclusion 자체에 그 이유(예: 대상이 현재 회사가 아니라 이직처라는 점)를 명시하십시오.
18. three_paths의 "협상한다면" 항목은 협상 대상이 현재 회사인지, 이직할 곳인지를 content 첫 문장에서 분명히 밝히십시오. 대상을 밝히지 않은 채 "협상운이 높다"고만 쓰지 마십시오.
19. action_plan.do 3가지는 모두 오늘부터 7일 안에 시작할 수 있는 행동이어야 합니다. "다음 달", "3주차"처럼 이번 주 범위를 벗어나는 일정을 나열하지 마십시오. 더 먼 미래의 일정은 action_plan이 아니라 다른 섹션에서 다루십시오.
`;

        const userPrompt = `
[사용자 커리어 컨텍스트]
- 생성 기준일: ${generatedAt}
- 기준 시간대: Asia/Seoul
- 성별: ${user_context.gender || '기재 안 함'}
- 현재 상황: ${user_context.current_status || '기재 안 함'}
- 핵심 고민: ${(Array.isArray(user_context.main_concern) ? user_context.main_concern.join(', ') : user_context.main_concern) || '기재 안 함'}
- 현재 직무 및 연차: ${user_context.current_job || '기재 안 함'}
- 최종 커리어 목표: ${user_context.career_goal || '기재 안 함'}
- 구체적 정황이나 고민: ${user_context.desired_answer || '기재 안 함'}

[사주 원국 및 점수 데이터]
- 년주: ${saju_data.pillars.year}
- 월주: ${saju_data.pillars.month}
- 일주: ${saju_data.pillars.day}
- 시주: ${saju_data.pillars.hour}
- 일간(본원): ${saju_data.day_gan}
- 오행 분포 (목/화/토/금/수): wood(${saju_data.elements.wood}), fire(${saju_data.elements.fire}), earth(${saju_data.elements.earth}), metal(${saju_data.elements.metal}), water(${saju_data.elements.water})
- 3대 커리어 점수: 이직운(${saju_data.scores.job_change}점), 잔류운(${saju_data.scores.stay}점), 협상운(${saju_data.scores.negotiation}점)
- 신강/신약: ${saju_data.body_strength || '미상'} (신강이면 스스로 밀어붙이는 힘이 강하고, 신약이면 환경과 사람의 도움을 받을 때 성과가 납니다)
- 현재 대운: ${saju_data.daewun}
- ${saju_data.seewun_year || ''}년 세운: ${saju_data.seewun_ganzhi || saju_data.seewun_2026 || ''}

위 정보를 바탕으로 사용자의 현실적인 고민에 직접 답하는 프리미엄 커리어 리포트를 작성하십시오.
한 줄 결론은 짧게 유지하되, 아래 상세 섹션 전체를 빠짐없이 채우십시오.

{
  "intent_summary": {
    "primary_question": "사용자가 이번 리포트에서 실제로 알고 싶은 한 가지",
    "role_interpretation": "이 사람이 지금 어떤 역할·단계에 있는지 상담사가 짚어주는 자연스러운 문장 1~2개. 사전적 정의나 판단 근거 나열 금지",
    "assumptions": ["이 해석의 전제를 자연스러운 문장으로", "전제 2"],
    "needs_clarification": false
  },
  "decision_factors": {
    "summary": "사용자 입력에서 추출한 핵심 현실 조건과 이 조건이 중요한 이유",
    "recommendation": "해당 조건에 맞춘 구체적인 판단 방향. 입력을 반복하지 말고 조건의 영향까지 설명",
    "checks": ["결정 전에 확인할 사실 1", "확인할 사실 2", "확인할 사실 3"]
  },
  "one_line_conclusion": "이직·잔류·협상 중 현재 우선순위를 담은 한 줄 결론",
  "main_concern_report": {
    "title": "선택한 고민 핵심 분석",
    "content": "현재 고민이 생긴 배경과 사주 흐름을 연결한 700~900자 분석"
  },
  "current_dilemma": {
    "title": "왜 지금 마음이 흔들리는가",
    "content": "사용자의 현재 직무와 상황을 직접 언급하는 600~800자 분석"
  },
  "career_nature": {
    "title": "타고난 업무 방식과 성장 조건",
    "content": "오행과 십성을 쉬운 말로 해설한 600~800자 분석",
    "strengths": ["구체적 강점 1", "구체적 강점 2", "구체적 강점 3"],
    "cautions": ["주의할 업무 패턴 1", "주의할 업무 패턴 2"]
  },
  "career_aspects": [
    { "area": "이동 및 변화 (이직)", "content": "이직 기회와 전제 조건을 설명하는 400~600자 분석" },
    { "area": "현 조직 내 적응 (잔류)", "content": "잔류가 유리해지는 조건을 설명하는 400~600자 분석" },
    { "area": "조직 내 협상과 관계", "content": "협상 전략과 관계 위험을 설명하는 400~600자 분석" }
  ],
  "three_paths": [
    { "key": "change", "title": "이직한다면", "score": 0, "content": "구체적인 기회·위험·확인 조건" },
    { "key": "stay", "title": "남는다면", "score": 0, "content": "구체적인 기회·위험·확인 조건" },
    { "key": "negotiate", "title": "협상한다면", "score": 0, "content": "구체적인 기회·위험·확인 조건" }
  ],
  "ideal_environment": {
    "title": "잘 맞는 회사와 역할의 조건",
    "content": "사용자 경력 목표에 맞춘 조직·리더·역할 분석 600~800자",
    "checklist": ["면접에서 확인할 조건 1", "조건 2", "조건 3", "조건 4"]
  },
  "dos": [
    "구체적인 추천 행동 1", "구체적인 추천 행동 2", "구체적인 추천 행동 3"
  ],
  "donts": [
    "피해야 할 행동 1", "피해야 할 행동 2", "피해야 할 행동 3"
  ],
  "action_plan": {
    "do": ["이번 주에 실행할 일 1", "실행할 일 2", "실행할 일 3"],
    "avoid": ["피할 일 1", "피할 일 2", "피할 일 3"]
  },
  "personal_answer": {
    "question": "사용자의 의도를 보존해 정제한 짧은 명사형 질문 제목",
    "content": "질문에 직접 답하고 현실적인 판단 기준을 제시하는 700~900자 답변"
  },
  "closing_advice": "사용자가 다음 행동을 시작하도록 돕는 250~350자 마무리 조언"
}
`;

        // Gemini API JSON 모드로 통신 호출
        let rawJsonText = await callGemini(env, {
          systemInstruction,
          prompt: userPrompt,
        });

        let validatedReport = parseAndValidatePremiumReport(rawJsonText);
        if (!validatedReport.ok) {
          rawJsonText = await callGemini(env, {
            systemInstruction,
            prompt: userPrompt + buildRepairInstruction(validatedReport.reasons),
          });
          validatedReport = parseAndValidatePremiumReport(rawJsonText);
        }

        if (!validatedReport.ok) {
          return new Response(JSON.stringify({
            code: 'REPORT_INVALID_RESPONSE',
            error: '리포트 문장 품질을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          }), {
            status: 502,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }

        const validatedReportText = JSON.stringify(validatedReport.report);

        // 생성 결과를 KV 저장소에 90일간 보관하여 중복 호출 시 Gemini 비용 0원 처리
        const rawEmail = String(user_context?.email || '').toLowerCase().trim();
        if (env.SAJU_KV) {
          const ttl = 60 * 60 * 24 * 90; // 90일
          await env.SAJU_KV.put(reportCacheKey(unlock_token), validatedReportText, { expirationTtl: ttl });

          // 사용자 이메일이 전달되었다면 이메일 -> 리포트 구매 이력 목록(최신순)에 추가
          if (rawEmail && rawEmail.includes('@')) {
            const emailKey = `email:${rawEmail}`;
            const history = parseEmailHistory(await env.SAJU_KV.get(emailKey));
            const withoutCurrent = history.filter((entry) => entry.token !== unlock_token);
            withoutCurrent.unshift({
              token: unlock_token,
              createdAt: new Date().toISOString(),
              label: buildReportLabel(user_context),
            });
            await env.SAJU_KV.put(emailKey, JSON.stringify(withoutCurrent.slice(0, EMAIL_HISTORY_LIMIT)), { expirationTtl: ttl });
            await env.SAJU_KV.put(`meta:${unlock_token}`, JSON.stringify({ user_context, saju_data }), { expirationTtl: ttl });
          }
        }

        // 이메일 알림 전송 (비동기 트리거) — Response를 반환한 뒤에도 완료될 수 있도록
        // ctx.waitUntil로 등록한다. waitUntil 없이 fire-and-forget하면 Workers 런타임이
        // 응답 반환 직후 나머지 실행을 중단시켜 메일이 발송되지 않을 수 있다.
        if (rawEmail && rawEmail.includes('@')) {
          const origin = request.headers.get("origin") || request.headers.get("referer") ? new URL(request.headers.get("origin") || request.headers.get("referer")).origin : undefined;
          ctx.waitUntil(
            sendReportNotificationEmail(env, {
              email: rawEmail,
              unlockToken: unlock_token,
              sajuData: saju_data,
              origin,
            }).catch(e => console.error('Email send error:', e))
          );
        }

        return new Response(validatedReportText, {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }
};
