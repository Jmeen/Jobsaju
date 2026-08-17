# 카카오톡 결과 카드 공유 설정

1. Cloudflare R2에서 `job-saju-share-cards` 버킷을 생성합니다.
2. Pages 프로젝트 Settings → Bindings에서 버킷을 `SHARE_CARDS`로 연결합니다. Preview와 Production을 각각 확인합니다.
3. R2 Lifecycle Rule에 `share-cards/` 접두사의 객체를 30일 뒤 삭제하도록 설정합니다.
4. 빌드 환경 변수 `VITE_KAKAO_JS_KEY`에 Kakao Developers의 JavaScript 키를 설정합니다. Admin 키는 사용하지 않습니다.
5. `VITE_PUBLIC_SERVICE_URL`에는 `https://jobsaju.kr`을 입력합니다.
6. Kakao Developers → 앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인에 `https://jobsaju.kr` (및 필요 시 `https://job-saju-eo3.pages.dev`, `http://localhost:5173`)을 등록합니다.
7. 다시 빌드·배포한 뒤 `/api/share-card/<uuid>.png`가 `Content-Type: image/png`로 열리는지 확인합니다.

R2나 Kakao 설정이 없는 로컬 환경에서는 이미지 파일 공유를 시도하고, 지원하지 않는 브라우저에서는 PNG 다운로드와 서비스 주소 복사로 대체됩니다.

## 공유 보너스 질문 — 실제 전송 확인(웹훅)

"친구에게 공유하면 질문 1회 추가" 보너스는 카카오톡 공유일 경우 클릭 자체가 아니라, 사용자가 실제로 채팅방에서
"보내기"를 눌러 카카오 서버가 보내주는 웹훅으로만 지급됩니다(링크·파일 공유는 확인 수단이 없어 클릭을 그대로 신뢰합니다).

1. Kakao Developers 콘솔 → 앱 → **웹훅 → 카카오톡 공유 웹훅**에 `https://<서비스 도메인>/api/kakao-share-webhook`을 등록합니다.
2. 빌드 환경 변수(Secret)에 `KAKAO_ADMIN_KEY`를 설정합니다. Kakao Developers → 앱 → 플랫폼 키 → **Admin 키**입니다(JavaScript 키와는 다른 값이며, 절대 프론트엔드 코드에 넣지 않습니다).
3. `Kakao.Share.sendDefault` 호출 시 `serverCallbackArgs: { unlock_token }`를 함께 보내면(코드에 이미 반영됨), 실제 전송 성공 시 카카오 서버가 이 값을 그대로 웹훅으로 돌려줍니다.
4. `/api/kakao-share-webhook`은 `Authorization: KakaoAK ${KAKAO_ADMIN_KEY}` 헤더로 카카오 서버가 보낸 요청인지 검증한 뒤 `share-bonus:<unlock_token>`을 KV에 기록합니다.
5. 프론트엔드는 카카오 공유를 시도한 뒤 `/api/share-bonus/status?unlock_token=...`를 몇 초 간격으로 폴링하다가, 웹훅이 도착해 `granted: true`가 되면 보너스 질문을 열어줍니다.

`KAKAO_ADMIN_KEY`가 없으면 웹훅 요청은 항상 401로 거부되고, 카카오톡 공유로는 보너스가 지급되지 않습니다(링크·파일 공유 경로는 영향 없음).

## 분석 콜백 인자와 중복 처리 규칙

`serverCallbackArgs`에는 다음 이름을 사용합니다.

- `unlock_token`: 카카오 공유 보너스 상태를 조회하고 해금하는 비밀 토큰입니다. 보너스 지급의 키로만 사용하며 프론트 분석 식별자로 사용하지 않습니다.
- `share_id`: 결과 화면에서 최초 공유 흐름을 만들 때 생성한 익명 UUID입니다. 같은 결과에서 다시 공유해도 재사용합니다.
- `result_session_id`: 하나의 수호신 결과 흐름을 식별하는 익명 UUID입니다.
- `visitor_session_id`: 브라우저 방문 세션을 식별하는 익명 UUID입니다.
- `guardian_id`: 공유한 사용자의 60갑자 수호신 ID(예: `甲寅`)입니다.

카카오가 실제 전송 성공 콜백을 보낼 때마다 `guardian_share_confirmed` 분석 이벤트를 기록합니다. 정상적인 재공유 콜백도 이벤트 로그에는 남기며, KPI에서는 `DISTINCT share_id`로 공유 흐름을 중복 제거합니다. 보너스는 `share-bonus:<unlock_token>` 상태를 기준으로 한 번만 사용할 수 있습니다.

콜백의 분석 식별자가 없거나 유효하지 않으면 분석 이벤트를 기록하지 않고 보너스 처리만 계속합니다. 분석 D1 기록이 실패해도 카카오 웹훅은 성공 상태(`200 OK`)를 반환해야 하며, 분석 장애가 공유 보너스나 제품 응답을 막지 않습니다. 반대로 인증 헤더가 올바르지 않은 요청은 카카오 콜백으로 처리하지 않고 `401`을 반환합니다.

카카오 콜백을 지원하지 않는 링크·파일 공유는 `guardian_share_confirmed`가 아니라 `guardian_share_sheet_opened`/채널별 공유 시도 이벤트로 측정합니다.
