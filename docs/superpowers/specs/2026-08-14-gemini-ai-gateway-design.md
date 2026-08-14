# Gemini AI Gateway 지역 제한 대응 설계

## 목표

`jobsaju.kr`의 기존 Gemini 기반 전체 풀이와 추가 질문 기능을 유지하면서, Cloudflare Pages Function에서 Google AI Studio를 직접 호출할 때 발생하는 `User location is not supported for the API use.` 오류를 우회한다.

사용자에게 반환하는 리포트 JSON 구조, 프롬프트, KV 캐시 및 사용권 처리 방식은 바꾸지 않는다. 운영 검증 중 기존 모델이 신규 사용자에게 종료된 사실이 확인되어 모델만 `gemini-3.5-flash`로 올린다.

## 확인된 원인

- `GET /api/diag`는 `GEMINI_API_KEY`와 `SAJU_KV`가 모두 설정됐다고 응답한다.
- Gemini 모델 목록 조회는 지역 미지원 오류를 반환한다.
- Gemini를 호출하지 않는 쿠폰 API는 Pages Function에서 JSON으로 응답한다.

따라서 프런트엔드, 사용자 도메인, Pages Function 라우팅 또는 KV 연결 문제가 아니라 Pages Function에서 Google AI Studio로 나가는 요청 경로가 실패 지점이다.

## 선택한 접근

Cloudflare AI Gateway의 Google AI Studio 공급자 경로를 Gemini 요청의 기본 전송 계층으로 사용한다.

```text
Browser
  -> jobsaju.kr/api/*
  -> Cloudflare Pages Function
  -> Cloudflare AI Gateway
  -> Google AI Studio / Gemini 3.5 Flash
```

공식 엔드포인트 형식은 다음과 같다.

```text
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/google-ai-studio/v1/models/{model}:generateContent
```

기존 `GEMINI_API_KEY`는 URL 쿼리 문자열에 넣지 않고 `x-goog-api-key` 헤더로 전달한다. Gateway 인증을 활성화하고 `CF_AIG_TOKEN`을 `cf-aig-authorization: Bearer ...` 헤더로 전달한다.

Gateway ID는 `jobsaju-gemini`로 고정한다. 개인 커리어 고민과 생성 리포트가 Gateway에 중복 저장되지 않도록 Gateway 캐시와 프롬프트·응답 로그는 비활성화한다. 기존 KV 리포트 캐시는 그대로 유지한다.

## 설정

Cloudflare Production 환경에 다음 값을 둔다.

- `GEMINI_API_KEY`: 기존 Google AI Studio 키
- `GEMINI_MODEL`: 기본값 `gemini-3.5-flash`
- `CF_AIG_ACCOUNT_ID`: Cloudflare 계정 ID
- `CF_AIG_GATEWAY_ID`: `jobsaju-gemini`
- `CF_AIG_TOKEN`: 인증된 Gateway 실행에 사용하는 암호화 Secret

소스와 `wrangler.jsonc`에는 키나 토큰을 기록하지 않는다. 계정 ID와 Gateway ID는 비밀 값이 아니지만 환경별 구성을 분리하기 위해 Pages 환경변수로 관리한다.

## 코드 경계

Gemini 전송 URL과 헤더 생성을 별도 모듈로 분리한다.

- 입력: 환경 설정, 모델명
- 출력: 요청 URL과 인증 헤더
- Gateway 계정 ID와 ID가 모두 있으면 AI Gateway URL을 사용한다.
- 둘 중 하나만 설정된 불완전한 구성은 명시적인 설정 오류로 처리한다.
- 둘 다 없으면 로컬 테스트와 이전 환경의 호환성을 위해 기존 Google AI Studio 직접 URL을 사용한다.

`callGemini`는 기존 프롬프트와 JSON 응답 파싱을 그대로 유지하며 이 모듈이 만든 URL과 헤더만 사용한다. 전체 풀이와 추가 질문이 같은 호출 경로를 공유하므로 두 기능에 동시에 적용된다.

## 진단과 오류 처리

`GET /api/diag`는 비밀 값을 노출하지 않고 다음을 추가로 반환한다.

- `ai_transport`: `cloudflare-ai-gateway` 또는 `google-ai-studio-direct`
- `gateway_configured`: Boolean
- 기존 `has_api_key`, `has_kv`, `configured_model`

진단용 모델 조회도 실제 생성 요청과 같은 전송 계층과 Google API `v1` 경로를 사용한다. Gateway가 지역 오류를 해결하지 못하면 운영 검증은 실패로 간주하며, 직접 Google API 재시도로 요청 시간을 늘리지 않는다.

사용자 응답에는 API 키, Gateway 토큰, 계정 ID 또는 원문 URL을 포함하지 않는다. 서버 로그에는 상태 코드, 공급자 오류 코드, 선택된 전송 계층만 구조화해서 남긴다.

## 테스트

자동 테스트는 다음을 보장한다.

1. Gateway 설정 시 Google AI Studio Gateway URL과 `x-goog-api-key` 헤더를 사용한다.
2. Gateway 인증 토큰이 있으면 `cf-aig-authorization` 헤더를 추가한다.
3. Gateway 설정이 전혀 없으면 기존 직접 호출 URL을 사용한다.
4. Gateway 설정이 절반만 있으면 외부 요청 전에 설정 오류를 낸다.
5. 전체 풀이와 추가 질문의 기존 JSON 검증 및 사용권 소비 규칙이 유지된다.
6. `/api/diag`가 선택된 전송 계층을 비밀 값 없이 보고한다.

## 배포와 성공 기준

1. `jobsaju-gemini` AI Gateway를 인증 활성화, 캐시 비활성화, 프롬프트·응답 로그 비활성화 상태로 만든다.
2. Preview 환경변수에 Gateway 설정을 등록한다.
3. Preview 배포 후 `/api/diag`가 `cloudflare-ai-gateway`를 보고하고 지역 오류를 반환하지 않는지 확인한다.
4. 실제 테스트 토큰으로 `/api/interpret`가 유효한 리포트 JSON을 반환하는지 확인한다.
5. 같은 배포에서 `/api/followup`이 유효한 답변 JSON을 반환하는지 확인한다.
6. 검증 성공 후 동일 설정을 Production에 적용하고 `jobsaju.kr`에서 다시 확인한다.

성공 기준은 단순 HTTP 200이 아니라 Gemini가 생성한 응답이 기존 품질 검증을 통과하고 KV에 저장되는 것이다.

## 실패 시 다음 단계

AI Gateway 경유 후에도 동일한 지역 오류가 재현되면 Gateway 방식에 추가 우회를 쌓지 않는다. Google Cloud의 지원 지역에 Vertex AI 엔드포인트를 만들고 동일한 내부 호출 인터페이스의 구현체만 교체하는 별도 설계로 전환한다.

## 범위 밖

- Gemini를 Workers AI나 다른 모델로 교체
- 프롬프트 또는 리포트 JSON 스키마 변경
- 결제 및 쿠폰 정책 변경
- 대규모 `workers/index.js` 모듈화
- Vertex AI 서비스 계정과 지역 인프라 구축
