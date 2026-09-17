# 잡사주 PostHog 운영 안내

## 적용 범위와 상태

React 19/Vite SPA에는 공식 `posthog-js`, Cloudflare API에는 공식 `posthog-node`를 사용한다.
기존 자체 Guardian 분석과 결제/쿠폰/해금/리포트 생성 로직은 유지한다.
Key/Host가 없으면 분석은 비활성화되며 기존 서비스를 막지 않는다.
코드는 Key/Host 미등록 상태에서도 배포할 수 있다. 실 PostHog 프로젝트 연결과 Cloudflare 환경변수 등록, 등록 후 재빌드/재배포 및 실제 PG E2E 검증은 별도다.

## 환경변수

| 이름 | 위치 | 설정 |
|---|---|---|
| `VITE_POSTHOG_KEY` | Vite/Cloudflare Pages Build | PostHog Project API Key (`phc_...`) |
| `VITE_POSTHOG_HOST` | Vite/Cloudflare Pages Build | 프로젝트 설치 화면의 ingestion host. US: `https://us.i.posthog.com`, EU: `https://eu.i.posthog.com` |
| `VITE_POSTHOG_DEBUG` | 개발용 Vite | 기본 `false`, localhost 실제 SDK 테스트만 `true` |
| `POSTHOG_KEY` | Cloudflare Pages 런타임 | 브라우저와 같은 프로젝트의 Project API Key |
| `POSTHOG_HOST` | Cloudflare Pages 런타임 | 브라우저와 같은 ingestion host |

Personal API Key나 관리자 인증키를 넣지 않는다. VITE 변수는 공개 번들에 포함된다.
Build 변수 변경 후에는 반드시 새로 빌드/배포한다. Production과 Preview를 구분하고 개발용 별도 PostHog 프로젝트를 권장한다.
PostHog 프로젝트 설정에서 Session Replay를 켜고 필요한 샘플링/보존기간을 설정한다. SDK는 서버의 Replay 활성화 설정을 따른다.

## 이벤트 발생 지점

| 이벤트 | 실제 지점 | 중복 방지 |
|---|---|---|
| `landing_view` | LandingScreen 최초 마운트 | 탭 세션 1회 |
| `start_click` | 랜딩의 내 수호신 찾기 버튼 | 800ms 연타 방지 |
| `profile_complete` | BirthScreen 유효한 입력 후 수호신 깨우기 | 800ms 연타 방지, 입력 원문 없음 |
| `career_input_complete` | submitPersonalization에서 결제 토큰을 확인한 뒤 요청 시작 | 해금 건별 1회, `input_mode=provided/skipped` |
| `report_generated` | 소환 단계 무료 서버 결과 또는 클라이언트 fallback 계산이 실제 성공 | 새 report UUID별 1회, 저장 결과 복원은 제외 |
| `report_view` | lazy GuardianResultScreen의 결과 DOM 마운트, 탭 visible | 탭 세션/report별 1회 |
| `report_scroll_50` | 무료 결과 컴포넌트의 실제 스크롤 이동 범위 50% | 탭 세션/report별 1회 |
| `report_scroll_90` | 같은 범위 90% | 탭 세션/report별 1회 |
| `detail_report_click` | 무료 결과의 유료 상세 CTA → paywall | 800ms 연타 방지 |
| `checkout_view` | ManualPayModal 실제 마운트. PG 진입은 같은 scope의 보완 지점 | 탭 세션/report별 1회 |
| `purchase_complete` | `/api/payment/validate`에서 PortOne PAID/서버 금액 검증 → 원자적 결제 소비 → 토큰 저장 성공 직후 | 기존 결제 재사용 거부 + deterministic event UUID |
| `share_click` | 카카오/링크 복사 공유 핸들러, 기존 Web Share 핸들러 | 채널/report별 800ms 연타 방지 |
| `second_report_generated` | 공유 보상을 받은 사용자의 두 번째 추가 질문 답변 요청 성공 | 해금 건별 1회, `report_type=followup_bonus` |

현재 공유 보상은 새 전체 리포트가 아니라 추가 질문권이다. 권한 지급/공유 클릭 자체로 second_report_generated를 만들지 않는다.
전액 할인 쿠폰은 서버 소비 성공 후 `purchase_complete`, `price=0`으로 분리된다. sandbox 해금은 purchase로 잡히지 않는다.
결제 capture는 ctx.waitUntil에서 수행한다. SDK shutdown으로 flush하며 분석 장애는 결제 응답을 바꾸지 않는다.
네트워크/광고 차단/수집 실패에는 결제 자체가 성공해도 분석이 누락될 수 있다. 분석은 회계 원장이 아니다.
SDK가 준비되지 않았거나 opt-out이면 서버 purchase 분석은 생략해 익명 ID 불일치/추적 거부 위반을 막는다.

## 페이지/세션 분석

이 앱은 화면 전환에도 URL `/`가 유지되므로 수동 `$pageview`의 `screen`을 사용한다.
`landing`, `birth`, `summon`, `result_free`, `paywall`, `checkout`, `personalize`, `result_paid`로 구분한다.
자동 페이지뷰/자동 클릭 수집은 꺼서 수동 이벤트와 겹치지 않는다. Strict Mode effect 재실행은 모듈 및 sessionStorage 가드로 막는다.
실제 재방문 페이지뷰는 허용하고, landing/report/scroll funnel 이벤트는 세션/report 기준으로 제한한다.
SDK의 `$session_id`, anonymous `distinct_id`, browser/OS/device/viewport 메타데이터를 유지한다.
로그인 체계가 없으므로 identify/실명 프로필/이메일 식별은 만들지 않는다.

## 최초 유입 UTM

최초 UTM/referrer를 `sessionStorage.jobsaju_attribution_v1`에 저장한다. 결제 리디렉션과 URL 정리, 새로고침에도 같은 탭에서 유지한다.
referrer는 개인정보가 섞일 수 있는 path/query/hash를 제거한 origin만 수집한다.
없는 UTM/referrer/가격/쿠폰은 생략한다. 유입이 없을 때만 파생 채널 `direct`로 분류한다.

| 채널 | 예시 UTM |
|---|---|
| instagram_profile | `utm_source=instagram&utm_medium=profile&utm_campaign=guardian` |
| instagram_post | `utm_source=instagram&utm_medium=post&utm_campaign=guardian` |
| instagram_reels | `utm_source=instagram&utm_medium=reels&utm_campaign=guardian` |
| threads | `utm_source=threads&utm_medium=social&utm_campaign=guardian` |
| blog | `utm_source=blog&utm_medium=article&utm_campaign=guardian` |
| manychat | `utm_source=manychat&utm_medium=dm&utm_campaign=guardian` |
| direct | UTM과 외부 referrer가 없는 방문 |

UTM은 이름/이메일/고민 등을 넣는 칸이 아니다. 캠페인 태그는 영문/숫자/하이픈/밑줄만 허용한다.
UTM 없는 Instagram 방문은 profile/post/reels를 확정할 수 없어 `other`로 남긴다. 게시 위치별 링크 태깅이 필요하다.
같은 탭 세션의 최초 touch를 유지하므로 새 캠페인을 시험할 때 새 독립 브라우저 세션을 사용한다.

## 개인정보/Replay

- 이벤트는 속성 allowlist만 통과한다. 이름, 생년월일/시간, 연락처, 이메일, 회사/직무 원문, 고민/목표/질문/사주/리포트 원문 객체를 보내지 않는다.
- URL query/hash, 알 수 없는 개인화 경로, SDK 자동 person properties를 제거한다.
- 모든 input/textarea/select는 maskAllInputs=true. 값/제목/aria-label/data-value 속성도 제거한다.
- 출생 입력 카드(날짜 echo/시간 선택/성별 상태 포함)는 ph-no-capture로 완전히 차단한다.
- 무료/유료 결과, 오류 및 조회/결제 모달의 텍스트는 ph-mask로 마스킹한다. 입력한 이름/고민이 AI 결과에 다시 등장해도 녹화되지 않는다.
- 무료 화면 간지 원문, canvas 공유카드, iframe/PG 화면은 녹화에서 차단한다. 공개 캐릭터 이미지와 페이지 레이아웃/클릭/스크롤은 분석 가능하다.
- Console log 및 네트워크 header/body/performance 캡처는 비활성화한다. Replay URL도 query/hash를 제거한다.
- Replay 원격 masking 설정이나 opt-out 설정을 임의로 약화하지 않는다. 실제 전송 payload와 Replay 플레이어를 배포 후 함께 확인한다.

## 만들 Funnel

현재 실제 무료 흐름에는 직무 입력 단계가 없고, 결제 뒤에 personalization을 받는다. 아래 순서로 만든다:

`landing_view → start_click → profile_complete → report_generated → report_view → detail_report_click → checkout_view → purchase_complete`

별도 결제 후 퍼널: `purchase_complete → career_input_complete`.
공유 퍼널: `report_view → share_click`, 유료 보상 퍼널: `share_click → second_report_generated`.
요청의 career_input_complete를 무료 생성 앞에 둔 9단계 퍼널은 현행 UX에서 성립하지 않는다.
Breakdown은 `acquisition_channel`, `utm_campaign`, `device_type`; 유료 결제 지표는 `price > 0`, 쿠폰 해금은 `price = 0`으로 분리한다.
사용자 기준 전환과 세션 기준 전환을 구분한다. 세션 기준은 `$session_id`를 동일 조건으로 묶는다.
Paths에는 `$pageview`의 screen을 이용한 화면별 Action을 만들어 URL이 모두 `/`인 문제를 피한다.

## 직접 테스트할 체크리스트

1. 테스트 프로젝트 Key/Host + DEBUG=true로 localhost 실행. 기본 DEBUG=false일 때 PostHog 요청이 없는지도 확인.
2. 독립 브라우저에서 예시 UTM URL 방문 → 랜딩/시작/입력 완료 이벤트가 각각 한 번인지 Live Events 확인.
3. 입력 오류/미완료는 profile_complete 없음. 소환 중에는 report_view 없음, 성공 후 report_generated만 있음.
4. 수호신 만나기 클릭 → report_view 1회. 50/90% 스크롤과 왕복/재마운트/새로고침 후 threshold 중복 없음.
5. 공유/유료 CTA/결제 모달 이동 → 해당 이벤트, UTM/익명 distinct_id/$session_id 일관성 확인.
6. PC 정상 결제 및 모바일 리디렉션 결제: 서버 PAID+금액 검증 성공 후에만 purchase_complete. 금액/쿠폰은 서버 확정 값.
7. PG 취소/실패/금액 변조/동일 paymentId 재검증은 purchase_complete 없음. 전액 쿠폰은 price=0, sandbox는 없음.
8. 직무 입력 또는 건너뛰기 → career_input_complete 1회, 텍스트 원문 없음. 공유 보상 두 번째 질문 성공 때만 second_report_generated.
9. Replay에서 합성 입력/날짜 echo/간지/이메일/질문/AI 결과 텍스트가 보이지 않는지, UX 위치/스크롤은 보이는지 확인.
10. URL에 합성 email/token을 붙여 event payload/Replay URL에 query/hash가 남지 않는지 확인.
11. SDK 호스트를 차단해도 입력/결과/결제/해금 동작이 유지되는지 확인.
12. Production 빌드 변수와 런타임 변수를 등록/배포한 뒤 jobsaju.kr에서 같은 체크 반복.

계정 없이 로컬 공식 SDK를 검증하려면 `node scripts/posthog-local-qa.mjs`를 실행한다.
5177 포트에만 가짜 수집기를 열고 실제 analytics/PG를 사용하지 않는다. 이벤트/마스킹된 Replay payload는 메모리에만 보관하며 종료 시 사라진다.

## 수정/추가 파일

- 의존성/설정: package.json, package-lock.json, .env.example
- 설치/정책: src/main.tsx, src/utils/posthogAnalytics.ts, src/utils/analyticsPolicy.ts, src/utils/analyticsPolicy.test.ts
- 흐름/결제 연결: src/contexts/AppContext.tsx, src/utils/premiumApi.ts
- 화면 이벤트/Replay: src/App.tsx, src/components/FreeReportAnalytics.tsx, src/components/screens/LandingScreen.tsx, BirthScreen.tsx, GuardianResultScreen.tsx, ResultScreen.tsx, src/components/modals/ManualPayModal.tsx, LookupModal.tsx
- 서버: workers/index.js, workers/posthogAnalytics.js, workers/posthogAnalytics.test.js
- 재현/안내: scripts/posthog-local-qa.mjs, docs/posthog-analytics.md

공식 참고: https://posthog.com/docs/libraries/js, https://posthog.com/docs/libraries/node, https://posthog.com/docs/session-replay/privacy

## 이번 작업의 검증 결과 (2026-09-16)

후속 코드 검토/수정 결과(398개 테스트, 모바일 뷰포트, Replay, 장애 격리, 성능 검증 한계)는 [posthog-review.md](posthog-review.md)에 기록했다. 아래는 최초 도입 검증 기록이다.

- 전체 테스트 390/390 통과, lint 오류 없음(기존 경고 유지), production 빌드 성공.
- Wrangler Pages Functions 로컬 컴파일 성공. 실제 배포하지 않음.
- 실제 브라우저 + 공식 SDK + 로컬 collector: 무료 생성과 실제 열람 분리, 스크롤 threshold 왕복 중복 없음, 새 report scope 분리, 공유 클릭/상세 CTA/checkout_view 확인.
- URL에서 UTM 제거 후에도 checkout_view에 instagram/profile/guardian 및 instagram_profile 유지.
- 실제 Replay payload에서 합성 생년월일/날짜 echo/개인화 결과 문장 유출 없음 확인.
- npm audit의 기존 개발 도구 sharp/miniflare/wrangler 관련 high 3건은 이번 범위에서 변경하지 않음. PostHog 관련 취약점은 보고되지 않음.
- 별도 발견: 기존 LandingScreen의 onClick={restoreSavedSession}은 클릭 이벤트 객체를 targetStep 인자로 전달해 지난 수호신 다시 보기에서 잘못된 step이 생긴다. HEAD에도 동일 코드가 있어 분석 도입과 무관하다. 서비스 로직 변경 금지 요청에 따라 수정하지 않음.
