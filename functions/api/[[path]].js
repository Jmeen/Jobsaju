/**
 * Cloudflare Pages Functions 어댑터.
 *
 * /api/* 요청을 기존 Workers 로직(workers/index.js)으로 넘긴다.
 * 이렇게 하면 프론트엔드와 API가 같은 도메인에서 서빙되어
 * 별도 Worker 배포·라우팅 설정 없이 `wrangler pages deploy` 한 번으로 끝난다.
 *
 * 환경 변수(Pages 프로젝트 설정에서 등록):
 * - GEMINI_API_KEY: 미설정 시 프론트가 규칙 기반 폴백으로 동작 (테스트 배포는 없어도 됨)
 * - SAJU_KV (KV 바인딩): 해금 토큰·추가질문 1회 강제용. 실결제 전 필수.
 */
import worker from '../../workers/index.js';

export const onRequest = (context) =>
  worker.fetch(context.request, context.env, context);
