# ⚙️ 잡사주 (Jobsaju) API 명세서 및 개발 티켓 초안

기획 의도(비용 통제 및 심리 흐름)를 완벽하게 반영하기 위해, **무료 API(정적 DB 반환)와 유료 API(AI 호출)를 물리적으로 완전히 분리**합니다.

---

## 1. 백엔드 API 명세서 (Core Endpoints)

### API 1: 무료 결과 조회 (Free Engine)
- **Endpoint:** `POST /api/v1/saju/free-result`
- **Description:** 사용자의 사주 정보를 바탕으로 명식을 계산하고, 60갑자 정적 DB에서 캐릭터 정보를 즉시 반환합니다. AI 호출 비용이 발생하지 않습니다.
- **Request Body:**
  ```json
  {
    "birth_date": "1992-08-15",
    "birth_time": "14:30",     // 모름일 경우 null
    "is_lunar": false,
    "gender": "F",
    "job_category": "개발/IT",
    "worry_text": "이직 타이밍이 고민입니다."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "session_id": "sess_abc123", // 유료 결제 시 상태 유지를 위한 임시 키
    "character": {
      "id": "甲寅",
      "name": "🐯 푸른 호랑이",
      "core_type": "🌳 개척하는 큰 나무",
      "keywords": ["주도성", "성장", "전진성", "독립성"],
      "summary_og": "계획이 80%만 서도 일단 시작하고 보는 타입.",
      "identity": "스스로 방향을 정하고...",
      "strength": "새로운 일을 시작하거나...",
      "blind_spot": "방향이 맞다고 확신하면...",
      "best_environment": "재량권이 있고 새로운..."
    }
  }
  ```

### API 2: 유료 리포트 생성 (Paid AI Engine)
- **Endpoint:** `POST /api/v1/saju/paid-report`
- **Description:** 결제 성공 후 호출되며, `session_id`에 저장된 사주 명식과 사용자 고민(worry_text)을 LLM(AI) 프롬프트에 주입하여 12개월 운세와 맞춤 조언을 동적으로 생성합니다.
- **Request Body:**
  ```json
  {
    "session_id": "sess_abc123",
    "payment_tx_id": "tx_pay_98765" // 결제 검증 영수증
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "report_id": "rep_xyz789",
    "status": "completed",
    "report_data": {
      "timing_highlights": {
        "best_job_change_month": 10,
        "best_negotiation_month": 12,
        "caution_month": 8
      },
      "timeline_12_months": [
        { "month": 8, "score": 60, "keyword": "관망", "summary": "잠시 멈춰서 상황을..." },
        { "month": 9, "score": 85, "keyword": "기회", "summary": "새로운 제안이 들어오는..." }
        // ... (12개월)
      ],
      "personalized_advice": "입력하신 '이직 타이밍' 고민에 대해..."
    }
  }
  ```

---

## 2. 개발 스프린트 티켓 (Jira / Linear)

### [BE-1] 사주 명식 계산 및 무료 캐릭터 매핑 로직 구현
- **목표:** 만세력 라이브러리 연동 및 일주(Day Pillar) 계산 모듈 개발.
- **작업 내용:**
  - 사용자 생년월일시 입력 시 60갑자 사주 명식 도출.
  - 도출된 일주(ID)를 기준으로 `free_engine_characters.json`에서 데이터 매핑.
  - `POST /api/v1/saju/free-result` 엔드포인트 구현 (Redis 등을 활용해 세션 저장).

### [BE-2] 결제 검증 및 AI(LLM) 동적 리포트 생성 파이프라인
- **목표:** 결제 완료 시 AI 프롬프트를 조립하여 유료 리포트를 생성.
- **작업 내용:**
  - 결제 모듈(토스페이먼츠 등) Webhook/서버 검증 로직 구현.
  - 사주 명식 + 사용자 고민을 바탕으로 한 System Prompt 설계 및 LLM API 연동.
  - AI 응답 결과를 JSON 파싱 후 DB 저장 및 반환 `POST /api/v1/saju/paid-report`.

### [FE-1] 무료 캐릭터 결과 페이지 및 바이럴 CTA 구현
- **목표:** 전달받은 와이어프레임 Section 1~2 렌더링.
- **작업 내용:**
  - `GET` 해온 무료 캐릭터 데이터 바인딩 및 애니메이션(로딩 효과 포함) 적용.
  - **공유하기 버튼 (Native Share API):** 모바일에서 OS 기본 공유창 띄우기 (카카오톡, 링크 복사 등). OG 태그 동적 세팅 (한줄 요약 반영).

### [FE-2] 페이월(Curiosity Gap) 및 Sticky 결제 CTA 구현
- **목표:** 잠긴 타이밍 힌트로 결제를 유도하는 화면 구현.
- **작업 내용:**
  - 하드코딩된 Locked Preview Component 렌더링 (CSS 블러가 아닌 더미 아이콘 🔒 사용).
  - 스크롤을 감지하여 Section 3(티저) 진입 시 하단에 **[내 커리어 타이밍 확인하기 · 8,900원]** Sticky CTA 노출 (Intersection Observer 활용).
  - 결제 연동 및 완료 시 유료 리포트 페이지로 라우팅 처리.
