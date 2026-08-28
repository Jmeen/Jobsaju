# Cloudflare Pages 배포 체크리스트

## 전체 리포트 AI 설정

이 프로젝트의 `/api/interpret`와 `/api/followup`은 Pages Function에서 `GEMINI_API_KEY`를 읽습니다. Cloudflare AI Gateway를 사용할 때는 아래 Gateway 변수도 함께 읽습니다. API 키와 Gateway 인증 토큰은 소스나 `wrangler` 설정에 평문으로 넣지 않습니다.

Cloudflare 대시보드에서 다음과 같이 등록합니다.

1. **Workers & Pages → job-saju → Settings → Variables and Secrets → Add**로 이동합니다.
2. 이름은 정확히 `GEMINI_API_KEY`로 입력합니다.
3. 값에 Gemini API 키를 입력하고 **Encrypt**를 선택해 저장합니다.
4. 해시가 붙은 `*.pages.dev` 미리보기 주소를 테스트한다면 **Preview** 환경에 등록합니다.
5. 운영 주소에서도 사용할 예정이면 **Production** 환경에도 별도로 등록합니다.
6. 저장 후 새 배포를 실행합니다. 기존 배포에는 새 Secret이 자동 적용되지 않습니다.

### Cloudflare AI Gateway 설정

Google AI Studio의 지역 제한을 피하기 위해 인증이 켜진 AI Gateway `jobsaju-gemini`를 사용합니다. Gateway에서는 캐시, 요청/응답 로그, 속도 제한을 끕니다.

Pages의 **Variables and Secrets**에 다음 값을 Preview와 Production 환경별로 등록합니다.

| 이름 | 형식 | 값 |
| --- | --- | --- |
| `CF_AIG_ACCOUNT_ID` | 일반 변수 | Cloudflare 계정 ID |
| `CF_AIG_GATEWAY_ID` | 일반 변수 | `jobsaju-gemini` |
| `CF_AIG_TOKEN` | 암호화 Secret | Gateway Run 토큰 |

세 Gateway 변수는 전부 있거나 전부 없어야 합니다. 일부만 등록하면 `/api/diag`가 `configuration-error`를 반환하고 외부 AI 요청을 보내지 않습니다. 정상 연결 시 `/api/diag`의 `ai_transport`는 `cloudflare`, `gateway_configured`는 `true`입니다. 응답에는 계정 ID, API 키, Gateway 토큰이 포함되면 안 됩니다.

## 데모 해금 설정

`PAYMENT_SANDBOX_MODE=true`는 결제 ID 없이 호출한 개발용 요청만 통과시킵니다. 실제 포트원 결제 ID가 있으면 항상 포트원 V2 API로 결제 상태와 금액을 검증합니다.

브라우저용 `VITE_PORTONE_STORE_ID` 또는 `VITE_PORTONE_CHANNEL_KEY`가 없는 Preview 배포는 PortOne 창을 열지 않고 `/api/payment/validate`에 결제 ID 없이 요청합니다. 따라서 서버의 `PAYMENT_SANDBOX_MODE=true`인 Preview에서만 테스트 리포트로 진행되며, Production에서는 결제 설정 안내와 함께 거절됩니다. 이 동작은 설정 누락이 무료 해금으로 이어지지 않게 하기 위한 것입니다.

## PortOne V2 KCP 테스트 결제

- Pages 빌드 변수: `VITE_PORTONE_STORE_ID`, `VITE_PORTONE_CHANNEL_KEY`를 등록합니다. 둘은 브라우저에 공개되는 식별자입니다.
- Pages secret: `PORTONE_API_SECRET`을 등록합니다. 이 값은 포트원 V2 API Secret이며 KCP 인증서나 개인키가 아닙니다.
- KCP 테스트 채널은 포트원 콘솔에서 `T0000` 및 KCP 테스트 인증서/개인키로 먼저 완성해야 합니다. 앱에는 `T0000`을 넣지 않습니다.
- 결제 완료 뒤 Worker가 `GET https://api.portone.io/payments/{paymentId}`로 `PAID`와 결제금액(6,900원 또는 8,900원)을 확인한 뒤에만 해금 토큰을 발급합니다.

추가 질문 1회 제한과 해금 토큰 보존을 테스트하려면 Pages 프로젝트의 **Settings → Bindings**에서 KV namespace를 `SAJU_KV`라는 이름으로 연결합니다. Preview와 Production의 바인딩은 각각 확인합니다.

## 배포 후 확인

- 전체 리포트 버튼을 눌렀을 때 모달이 닫히고 `입력 내용을 이렇게 이해했어요` 섹션이 표시되는지 확인합니다.
- AI 설정이 빠졌다면 모의 리포트가 열리지 않고 모달 안에 설정 오류가 표시되어야 합니다.
- 브라우저 개발자 도구에서 `/api/payment/validate`가 200, `/api/interpret`가 200인지 확인합니다.
- API 키 자체는 브라우저 요청, 콘솔, 응답 본문 어디에도 나타나면 안 됩니다.
