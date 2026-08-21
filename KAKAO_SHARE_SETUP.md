# 카카오톡 결과 카드 공유 설정

1. Cloudflare R2에서 `job-saju-share-cards` 버킷을 생성합니다.
2. Pages 프로젝트 Settings → Bindings에서 버킷을 `SHARE_CARDS`로 연결합니다. Preview와 Production을 각각 확인합니다.
3. R2 Lifecycle Rule에 `share-cards/` 접두사의 객체를 30일 뒤 삭제하도록 설정합니다.
4. 빌드 환경 변수 `VITE_KAKAO_JS_KEY`에 Kakao Developers의 JavaScript 키를 설정합니다. Admin 키는 사용하지 않습니다.
5. `VITE_PUBLIC_SERVICE_URL`에는 `https://jobsaju.kr`을 입력합니다.
5-1. `VITE_KAKAO_GUARDIAN_TEMPLATE_ID`에 수호신 공유용 사용자 정의 템플릿 ID를 설정합니다(아래 절 참고).
6. Kakao Developers → 앱 → 플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인에 `https://jobsaju.kr` (및 필요 시 `https://job-saju-eo3.pages.dev`, `http://localhost:5173`)을 등록합니다.
7. 다시 빌드·배포한 뒤 `/api/share-card/<uuid>.png`가 `Content-Type: image/png`로 열리는지 확인합니다.

R2나 Kakao 설정이 없는 로컬 환경에서는 이미지 파일 공유를 시도하고, 지원하지 않는 브라우저에서는 PNG 다운로드와 서비스 주소 복사로 대체됩니다.

## 수호신 공유 — 사용자 정의 템플릿 (필수 설정)

무료 수호신 결과 화면의 공유는 `Kakao.Share.sendCustom()`으로 **사용자 정의 템플릿 한 개**를 씁니다.
수호신 카드가 800×800 정사각형이라, 기본 피드(`sendDefault`) 레이아웃에서는 캐릭터가 잘립니다.
60마리마다 템플릿을 만들지 않습니다 — 템플릿 하나가 아래 사용자 인자로 60마리를 모두 그립니다.

### 콘솔에서 직접 해야 하는 일

1. Kakao Developers → 도구 → **메시지 템플릿** → 새 템플릿 → **피드 A** 유형으로 만듭니다.
2. 템플릿의 각 자리에 아래 사용자 인자를 바인딩합니다.

   | 자리 | 바인딩할 인자 | 예시 |
   | --- | --- | --- |
   | 이미지 | `${GUARDIAN_IMAGE}` | `https://jobsaju.kr/api/share-card/<uuid>.png` |
   | 제목 | `${SHARE_TITLE}` | `내 수호신은 새싹호랑이래 🐯` |
   | 설명 | `${SHARE_QUESTION}` | `너의 수호신은 누구일까?` |
   | 버튼 | `${SHARE_BUTTON}` | `내 수호신 확인하기` |
   | 링크 | 등록 도메인 + `${SHARE_QUERY}` | `?fromGuardian=...&utm_medium=kakao&shareSessionId=...` |

   링크는 두 가지 인자를 다 보냅니다. 편집기에서 전체 URL을 넣을 수 있으면 `${SHARE_URL}`을,
   등록 도메인이 고정돼 쿼리만 넣을 수 있으면 `${SHARE_QUERY}`를 쓰면 됩니다.
   **둘 중 무엇을 쓰든 쿼리가 통째로 살아 있어야 합니다** — 이 값이 유입 귀속의 전부입니다.
   부가로 `${GUARDIAN_NAME}`, `${GUARDIAN_DESCRIPTION}`(성향 한 줄), `${GUARDIAN_ID}`,
   `${SHARE_SESSION_ID}`도 함께 전달되므로 문구 배치를 바꿀 때 쓸 수 있습니다.

3. 템플릿의 **전달 허용**을 켭니다. A→B에서 끝나지 않고 B가 다른 방으로 넘기는 2차 확산을 위해서입니다.
   (전달된 메시지가 원본 `shareSessionId`를 유지하는지는 실제 카카오톡에서 확인이 필요합니다.)
4. 발급된 **템플릿 ID(숫자)** 를 빌드 환경 변수 `VITE_KAKAO_GUARDIAN_TEMPLATE_ID`에 넣습니다.

### 설정하지 않으면

`VITE_KAKAO_GUARDIAN_TEMPLATE_ID`가 비어 있으면 공유 버튼이 죽지 않도록 기본 피드로 임시 발송합니다.
동작은 하지만 이미지가 카카오 레이아웃에 맞춰 크롭되므로, 운영에서는 반드시 템플릿 ID를 채워야 합니다.

### 공유 링크 구조

카카오톡과 링크 복사는 같은 귀속 구조를 쓰고 `utm_medium`으로만 갈라집니다.

```
https://jobsaju.kr/?fromGuardian=<60갑자>&utm_source=guardian_share&utm_medium=kakao|copy&shareSessionId=<UUID>
```

`shareSessionId`는 익명 UUID입니다. 이름·이메일·생년월일·전화번호·카카오 계정과 연결하지 않습니다.
받는 사람의 브라우저는 이 값을 sessionStorage에 담아 자기 결과 완료 이벤트까지 들고 갑니다.
D1 컬럼과 분석 이벤트 필드에서는 같은 값을 `share_id`로 부릅니다(이미 쌓인 데이터와 이름을 맞추기 위함).

### 수집 이벤트

| 이벤트 | 언제 |
| --- | --- |
| `guardian_share_click` (`share_channel`=`kakao`/`copy`) | 공유 버튼을 눌렀을 때 |
| `guardian_share_sheet_opened` (`kakao`) | 카카오 공유창이 실제로 열렸을 때 |
| `guardian_share_link_copy` (`copy`) | 링크 복사에 **성공**했을 때 |
| `guardian_share_confirmed` (`kakao`) | 카카오 웹훅이 실제 발송을 알려줬을 때 |
| `guardian_share_landing_view` | 공유 링크로 누군가 들어왔을 때 |
| `guardian_result_complete_from_share` | 그 사람이 자기 수호신 결과까지 완료했을 때 |

`guardian_share_click`(공유 버튼 클릭)과 `guardian_share_confirmed`(실제 카카오톡 발송)는 서로 다른 이벤트입니다.
`Completed Guardians Generated per Sharer`는 `guardian_result_complete_from_share` ÷ `DISTINCT share_id`로 계산합니다.

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

카카오가 실제 전송 성공 콜백을 보낼 때마다 `guardian_share_confirmed` 분석 이벤트를 기록합니다. 카카오가 필수 헤더로 보내는 `X-Kakao-Resource-ID`를 익명 결정적 이벤트 ID로 변환하므로, 같은 웹훅의 네트워크 재시도는 D1에서 한 행으로 중복 제거되고 서로 다른 실제 전송 콜백은 같은 `share_id`여도 각각 남습니다. KPI에서는 `DISTINCT share_id`로 공유 흐름을 다시 중복 제거합니다. 보너스는 `share-bonus:<unlock_token>` 상태를 기준으로 한 번만 사용할 수 있습니다.

콜백의 분석 식별자 또는 `X-Kakao-Resource-ID`가 없거나 유효하지 않으면 분석 이벤트를 기록하지 않고 보너스 처리만 계속합니다. 분석 D1 기록은 Workers의 `waitUntil`에서 응답 이후 처리되며, 기록이 실패해도 카카오 웹훅은 성공 상태(`200 OK`)를 반환해야 합니다. 분석 장애가 공유 보너스나 제품 응답을 막지 않습니다. 반대로 인증 헤더가 올바르지 않은 요청은 카카오 콜백으로 처리하지 않고 `401`을 반환합니다.

카카오 콜백을 지원하지 않는 링크·파일 공유는 `guardian_share_confirmed`가 아니라 `guardian_share_sheet_opened`/채널별 공유 시도 이벤트로 측정합니다.
