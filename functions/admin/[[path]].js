/**
 * Cloudflare Pages Functions 어댑터 (관리자 페이지용).
 *
 * /admin/* 요청을 기존 Workers 로직(workers/index.js)으로 넘긴다.
 * functions/api/[[path]].js와 동일한 이유로 별도 파일이 필요하다 — Pages Functions는
 * 파일 경로가 곧 라우팅 규칙이라, /api/*만 처리하는 파일로는 /admin/*이 안 잡히고
 * 정적 자산(즉 SPA의 index.html)으로 새어나간다.
 */
import worker from '../../workers/index.js';

export const onRequest = (context) =>
  worker.fetch(context.request, context.env, context);
