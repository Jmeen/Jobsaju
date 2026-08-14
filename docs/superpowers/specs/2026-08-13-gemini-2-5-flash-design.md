# Gemini 2.5 Flash 모델 설정 설계

## 목표

직장인 이직사주의 AI 리포트 모델을 현재 사용 불가능한 `gemini-1.5-flash`에서 진단 API로 사용 가능함이 확인된 `gemini-2.5-flash`로 변경한다.

## 설정 방식

- `workers/index.js`의 기본 모델을 `gemini-2.5-flash`로 변경한다.
- `wrangler.jsonc`의 일반 환경변수 `GEMINI_MODEL`도 `gemini-2.5-flash`로 선언한다.
- Worker의 기존 우선순위인 `env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL`은 유지한다.
- 404 모델 오류 시 다른 Flash 모델을 시도하는 기존 대체 동작은 유지하되, `gemini-2.5-flash`를 첫 번째 후보로 둔다.

## 오류 처리

- 명시된 모델을 사용할 수 없으면 기존 순차 대체 로직이 동작한다.
- `/api/diag`는 설정 모델과 사용 가능 여부를 그대로 노출한다.
- 배포 후 `configured_model`이 `gemini-2.5-flash`, `configured_model_available`이 `true`인지 확인한다.

## 테스트 및 검증

- 설정 테스트에서 `wrangler.jsonc`의 `vars.GEMINI_MODEL` 값을 검증한다.
- 모델 설정 테스트에서 Worker 기본값과 첫 번째 대체 후보를 검증한다.
- 전체 Node 테스트와 프로덕션 빌드를 실행한다.
- 재배포 후 운영 `/api/diag`를 호출해 실제 반영을 확인한다.

## 범위 제외

- Gemini API 키 변경
- 프롬프트 및 리포트 형식 변경
- R2/KV/결제 설정 변경
- 이번 작업 중 Cloudflare 운영 배포 실행
