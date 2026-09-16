# PostHog 분석 코드 검토 결과

검토일: 2026-09-16. 로컬 React StrictMode 앱, 공식 posthog-js SDK와 loopback 수집기, Node 회귀 테스트로 검증했다. 아래 결과는 배포 전 로컬 검토 기록이며, 실제 PostHog 프로젝트/PG/production 배포를 사용하지 않았다.

## 테스트 결과

| 항목 | 결과 | 검증 내용 |
| --- | --- | --- |
| 1. 새로고침·리렌더 중복 | 통과 | 랜딩 새로고침 후 landing_view 1회. 리포트별 generated/view/50/90 각 1회, 왕복 스크롤·공유 상태 리렌더 후 증가 없음. SDK 준비 전 큐, StrictMode 반복 호출, 동일 저장소로 새 runtime 생성도 테스트. 실제 새로고침의 새 $pageview는 정상 집계한다. |
| 2. 실제 성공 시점 | 통과 | 생성 전 generated 0회, 계산 성공 후 generated 1회, 만나기 전 view 0회. 서버 결제 라우트는 mock PortOne PAID+금액 검증+원자적 소비+토큰 저장 이후 capture 1회. 중복 409, FAILED/READY/CANCELLED/금액 변조 400, 토큰 저장 실패 500에서는 추가 purchase 없음. |
| 3. 최초 UTM 보존 | 통과 | instagram/profile/guardian 유입 후 URL을 /로 바꾸고 새로고침·재입력·유료 CTA·모달까지 이동. checkout_view의 UTM 3개와 acquisition_channel=instagram_profile 유지. 결제 컨텍스트의 익명 ID/UTM도 단위 테스트. 7개 채널 분류 테스트 유지. |
| 4. 이벤트 개인정보 | 통과 | allowlist 테스트와 실제 수집 payload 검색. 합성 생년월일/날짜 echo/이메일/자유서술/URL 검사값/개인화 결과 문장 없음. $set/$set_once 및 원문 객체 제외. 가격·프로모는 서버 검증 값으로 덮어쓴다. |
| 5. Session Replay masking | 통과 | 별도 추가한 로컬 QA input/textarea의 rrweb input 이벤트에서 서로 다른 노드의 text가 *로만 기록됨. 실제 생년월일 폼은 ph-no-capture, 결과·이메일 모달은 ph-mask. 유료 미리보기도 ph-mask로 보강 후 새 Replay payload 8개에서 월별 개인화 문구 미노출 확인. |
| 6. 모바일 스크롤 | 뷰포트 검증 통과 | 브라우저를 390×844, 360×640으로 설정. 두 리포트 각각 50/90 각 1회. 360px 테스트에서 첫 이동은 50만, 다음 이동은 90 발생. visualViewport의 높이/offset, 짧은 결과, 임계점 직전·끝으로 점프도 단위 테스트. 실제 휴대폰/모바일 UA·터치·주소창 변화는 별도 확인 필요. |
| 7. 차단·수집 실패 격리 | 통과 | SDK 예외·opt-out·storage 거부 회귀 테스트. 로컬 수집/설정/Replay 스크립트 요청을 503으로 실패시켜도 새 입력·무료 생성·결과 CTA 정상. 합계 실패 요청 58회(재시도 포함), 미해독 payload 0개. 실제 결제 서버 라우트의 PostHog fetch가 실패해도 200+해금 토큰 반환. 실제 광고차단 확장 테스트는 아님. |
| 8. 초기 SDK 성능 | 구조 보강, 실측 미완료 | SDK를 첫 paint 기회 뒤 idle에 import하도록 변경(숨긴 탭/idle 지연은 2초 fallback). 지연 중 이벤트는 원래 행동 시각과 함께 큐에 보존. production HTML에 SDK의 초기 modulepreload 없음. SDK 별도 chunk gzip 95.30KB, main gzip 105.36KB. Chrome DevTools MCP가 없어 LCP/INP·저성능 기기 실측은 수행하지 못함. |

검증 명령: `npm.cmd run test` **398/398 통과**, `npm.cmd run lint` **오류 없음/기존 경고 유지**, `npm.cmd run build` **성공**, `git diff --check` **통과**. Wrangler 4.123.0 Pages Functions 로컬 컴파일 **성공**(nodejs_compat, 기존 compatibility date 유지). 배포/커밋/푸시 없음.

## 이번 검토에서 수정한 내용

- SDK import를 첫 화면 paint 기회 뒤 idle로 미루고, 초기화/캡처/식별 조회 예외를 서비스 흐름과 격리했다. 큐는 100건 상한이며 준비 후 한 번만 비운다.
- 큐 이벤트는 SDK가 준비된 시간이 아니라 실제 행동 시각을 보존한다.
- 화면 중복 키에 report_id를 포함해 새로운 리포트의 정상 페이지뷰를 누락하지 않는다.
- 취소된 생성 작업은 PostHog generated 이벤트를 만들지 않는다. 기존 계산/결제 서비스 로직은 변경하지 않았다.
- purchase capture는 확정된 유한한 비음수 금액과 내부 주문 식별자가 모두 있어야 한다. 기존 서버 성공 조건과 안정된 이벤트 UUID를 유지했다.
- 모바일 visualViewport 및 resize 대응, passive scroll, requestAnimationFrame 병합 및 cleanup을 추가했다.
- Replay에서 value/title/alt/ARIA 값/placeholder/srcdoc/data-* 속성을 제거하고, 개인화 유료 미리보기 텍스트도 마스킹했다. 불필요한 heatmap 수집도 명시적으로 비활성화했다.
- 로컬 QA 수집기에 base64 beacon 해독, 합성 input/textarea, 요청 실패 모드를 추가했다. 이 fixture는 QA 서버에서만 주입되며 production 빌드에는 포함되지 않는다.

## 이번 검토의 수정/추가 파일

- src/utils/posthogAnalytics.ts
- src/utils/analyticsRuntime.ts (추가)
- src/utils/analyticsRuntime.test.ts (추가)
- src/utils/posthogPrivacy.ts (추가)
- src/utils/reportScrollAnalytics.ts (추가)
- src/components/FreeReportAnalytics.tsx
- src/components/screens/PaywallScreen.tsx
- src/contexts/AppContext.tsx
- workers/posthogAnalytics.js
- workers/posthogAnalytics.test.js
- scripts/posthog-local-qa.mjs
- docs/posthog-review.md (추가)
- docs/posthog-analytics.md

## 남은 확인 및 한계

1. 실제 VITE_POSTHOG_KEY/HOST 및 서버 POSTHOG_KEY/HOST 등록 후 배포, PostHog Live Events/Replay/Funnel에서 확인해야 한다. 로컬 가짜 key는 환경 파일에 저장하지 않는다.
2. PC 실제 PG 및 모바일 리디렉션 결제, iOS Safari/Android Chrome의 터치·주소창 변화는 아직 미검증이다. 실제 금전 거래는 승인된 테스트 결제로 별도 수행한다.
3. 성능 트레이스에는 Chrome DevTools MCP 연결이 필요하다. 번들 분리와 지연 로딩 검증을 실제 Core Web Vitals 개선 수치로 해석하면 안 된다.
4. 브라우저 저장소가 완전히 차단되면 현재 문서에서는 메모리로 중복 방지/UTM을 유지하지만, 새로고침을 넘어서 보존할 수 없다.
5. 분석은 best-effort다. 차단/장기 장애 때 이벤트가 누락될 수 있으나, 분석을 기다리느라 서비스 기능을 실패시키지 않는다. SDK가 아직 준비되지 않았거나 opt-out인 결제는 식별 컨텍스트를 보내지 않는다. 서버 전송도 durable outbox를 두지 않아 장애 시 정확히 한 번 전달까지 보장하는 구조는 아니다.
6. 기존 '지난 수호신 다시 보기' 클릭 인자 오류는 분석 코드와 무관한 기존 문제여서 이번 범위에서 수정하지 않았다. 동일 report 새로고침 중복 방지의 핵심은 저장소/runtime 회귀 테스트로 검증했다.

운영 이벤트/퍼널/환경변수 안내는 [posthog-analytics.md](posthog-analytics.md)를 참고한다. 마스킹은 [PostHog 공식 privacy 문서](https://posthog.com/docs/session-replay/privacy), SDK 설정은 [공식 configuration 문서](https://posthog.com/docs/libraries/js/config), 서버 background 작업은 [Cloudflare context 문서](https://developers.cloudflare.com/workers/runtime-apis/context/)를 기준으로 검토했다.
