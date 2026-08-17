# 수호신 궁합·공유 바이럴 루프 설계

## 목표

기존 `내 수호신` 결과 페이지 안에 찰떡 수호신 1종, 티격태격 수호신 1종, 단일 공유 CTA를 추가한다. 공유받은 사용자는 별도 초대 페이지가 아니라 기존 입력 화면으로 진입하되 보낸 수호신의 문맥을 이어받는다.

이번 기능의 질문은 공유 클릭이 늘어나는지가 아니라, 공유받은 사용자가 실제로 자신의 수호신 결과까지 완료하는지다. 전체 사용자에게 적용하며 별도 실험군은 두지 않는다.

## 성공 지표

### Primary: Share Inbound Completion Rate

```text
DISTINCT visitorSessionId
where guardian_result_complete_from_share
/
DISTINCT visitorSessionId
where guardian_share_landing_view
```

### Secondary: Share Rate

```text
DISTINCT resultSessionId
with guardian_share_click
/
DISTINCT resultSessionId
with guardian_result_view
```

### Growth: Completed Guardians per Activated Share

확인 가능한 공유와 공유창 실행을 섞지 않고 두 지표로 나눈다.

```text
Confirmed Share Growth
= complete_from_share visitor sessions
/ confirmed shareIds
```

```text
Share Attempt Growth
= complete_from_share visitor sessions
/ share-sheet-opened shareIds
```

### Guardrail: Paid Conversion Rate

```text
DISTINCT resultSessionId
with paid_conversion
/
DISTINCT resultSessionId
with guardian_result_view
```

배포 시각을 분석 기준점으로 기록하고 배포 전후의 동일 기간과 유입원을 비교한다. 기본 비교 단위는 7일이며 트래픽이 적으면 충분한 표본이 모일 때까지 기간을 늘린다. 현재 동일 이벤트의 과거 기준선이 없으므로 아래의 전면 적용 순서를 따른다.

```text
1단계: UI 변경 없이 분석 이벤트만 전체 배포해 기준선 수집
2단계: 최소 7일 또는 사전에 정한 최소 표본을 모은 뒤 기능을 전체 사용자에게 배포
```

이는 사용자 비율을 나누는 A/B 실험이 아니다. 두 단계 모두 대상은 전체 사용자이며, 기능 효과와 유료 전환 가드레일을 같은 이벤트 정의로 비교하기 위한 계측 선행 배포다.

## 채택한 제품 접근

기존 공유 UI에 새 CTA를 덧붙이지 않고 궁합 블록을 결과 화면의 유일한 공유 허브로 만든다.

- 제거: 무료 결과의 `내 캐릭터 공유하기` 텍스트 링크
- 제거: 결제 영역의 `결과 공유하고 할인받기` 블록
- 제거: 구매 결과 하단의 큰 바이럴 공유 카드
- 유지·재사용: 기존 Canvas 생성, R2 업로드, 카카오 SDK, Web Share, 파일 공유와 다운로드 폴백
- 추가: 궁합 블록 안의 `친구에게 물어보기` 단일 CTA

친구별 초대 페이지, 두 사람의 상세 궁합 페이지, 친구 목록, 궁합 저장, 랭킹과 결제 확장은 만들지 않는다.

## 결과 화면 UX

화면 순서는 다음과 같다.

```text
내 수호신
→ 짧은 성향 공감
→ 함께 일하면? [찰떡 + 티격태격]
→ 친구에게 물어보기
→ 상세 리포트 CTA
```

궁합 영역은 두 개의 큰 카드가 아니라 하나의 압축된 박스다.

```text
함께 일하면?

찰떡
달빛토끼
서로의 빈틈을 채우는 조합
직장 케미 92점

티격태격
불꽃원숭이
둘 다 자기 방식이 확실한 조합
직장 케미 28점

내 수호신은 새싹호랑이.
너는?

[친구에게 물어보기]
```

내 수호신이 화면의 주인공이다. 관계 캐릭터는 더 작은 이미지, 낮은 채도와 약한 테두리를 사용한다. `%` 대신 `직장 케미 N점`으로 표현하며 명리학적 단정이나 `최악`, `상극`, `피해야 할 사람` 같은 표현은 사용하지 않는다.

공유용 Canvas는 결과 화면에 크게 노출하지 않고 백그라운드에서 생성한다. 공유 카드는 내 수호신 이미지, 이름, 짧은 성향 한 줄, `너는 어떤 수호신일까?`만 포함한다. 찰떡·티격태격 상대와 생년월일 등 개인정보는 포함하지 않는다.

공유는 반복할 수 있다. 추가 질문 보상은 기존 정책대로 최초 한 번만 지급한다.

## 공유 유입 UX

공유 URL은 다음 형태다.

```text
/?fromGuardian=甲寅&utm_source=guardian_share&shareId=<UUID>
```

`fromGuardian`이 허용된 60갑자 ID일 때만 기존 입력 화면 위에 작은 문맥 배너를 노출한다.

```text
새싹호랑이가
당신의 수호신을 궁금해해요.

당신은 어떤 수호신일까요?
```

해당 수호신의 실제 이미지를 사용하고 이미지 로드 실패 시 기존 이모지로 대체한다. 잘못되거나 누락된 ID는 오류를 표시하지 않고 일반 랜딩을 보여준다. 기존 생년월일 입력과 결과 계산 흐름은 변경하지 않는다.

공유 귀속값은 입력 단계를 지나 결과 완료까지 세션에 보존한다. 공유받은 사용자가 다시 공유하면 자신의 새 `resultSessionId`와 새 `shareId`를 사용하며 이전 공유의 `shareId`를 전파하지 않는다.

## Guardian 데이터 모델

기존 60갑자 한자 ID를 단일 원천으로 사용한다. 천간, 지지, 오행, 음양과 한글 표기는 ID와 고정 매핑에서 파생하며 60개 레코드에 중복 저장하지 않는다.

```ts
type GuardianId = /* 허용된 60개 ID의 union */;

function isGuardianId(value: string): value is GuardianId;

function parseGuardianId(id: GuardianId) {
  return {
    stem: id.slice(0, 1),
    branch: id.slice(1, 2),
  };
}
```

외부 쿼리의 `fromGuardian`은 `isGuardianId`를 통과한 뒤에만 파싱한다. 문자열 인덱싱을 화면과 계산 코드에 흩뿌리지 않는다.

실제 60종 이미지는 `GuardianId → public 이미지 경로` 레지스트리로 연결한다. 모든 ID에 이미지가 하나씩 존재하는지를 자동 검증하며 화면에서는 이 레지스트리를 통해서만 자산을 조회한다.

## 대칭 궁합 계산

궁합은 두 사람의 방향성 해석이 아니라 수호신 쌍의 직장 케미다. 따라서 모든 입력에서 다음 불변조건을 보장한다.

```ts
calculateGuardianChemistry(a, b).score
  === calculateGuardianChemistry(b, a).score;
```

MVP 점수 규칙은 다음 다섯 관계만 사용한다.

```text
기준점             50
천간합            +18
지지 육합         +25
지지 충           -25
오행 상생 존재     +8
오행 상극 존재     -8
최종 범위         0~100
```

오행 상생과 상극은 양방향을 모두 검사하고 관계 존재 여부를 한 번만 반영한다.

```ts
if (generates(a.element, b.element) || generates(b.element, a.element)) {
  score += 8;
}

if (controls(a.element, b.element) || controls(b.element, a.element)) {
  score -= 8;
}
```

동일 오행에는 별도 가점을 주지 않지만 대표 관계와 카피 선택에 사용할 수 있다. 형·해·파·삼합이나 별도의 천간 부정관계는 명확한 제품 규칙이 생기기 전까지 점수에 추가하지 않는다.

계산 엔진은 사용자 문구를 반환하지 않는다.

```ts
interface ChemistryResult {
  score: number;
  positiveReasons: ChemistryReason[];
  negativeReasons: ChemistryReason[];
  dominantRelation: DominantRelation;
}
```

카피는 관계 유형별 맵에서 별도로 관리한다.

## 대표 관계와 혼합 관계

긍정 대표 관계 우선순위는 다음과 같다.

```text
육합 → 천간합 → 상생 → 동일 오행 → neutral
```

부정 대표 관계 우선순위는 다음과 같다.

```text
충 → 상극 → 천간 부정관계 → neutral
```

전체 `dominantRelation`은 코드에서 하나의 우선순위로 고정한다.

```text
충
→ 육합
→ 천간합
→ 상극
→ 상생
→ 동일 오행
→ neutral
```

따라서 `천간합 + 지지충`처럼 긍정과 부정이 공존하면 점수에는 둘 다 반영하지만 대표 관계와 MVP 카피는 `충`이 된다. 혼합 관계 전용 카피는 이번 범위에 포함하지 않는다.

## BEST와 WORST 선택

현재 수호신을 제외한 59개 모두를 평가한다. 점수 비교 후 관계 의미가 더 명확한 후보를 우선하고 마지막에만 ID를 사용한다.

```text
BEST
score 내림차순
→ 육합 존재
→ 천간합 존재
→ 상생 존재
→ 동일 오행
→ GuardianId 오름차순
```

```text
WORST
score 오름차순
→ 충 존재
→ 상극 존재
→ 천간 부정관계 존재
→ GuardianId 오름차순
```

현재 MVP에 천간 부정관계 점수 규칙은 없으므로 해당 비교값은 항상 거짓이다. 향후 명시적인 규칙이 승인되면 정렬 구조를 바꾸지 않고 활성화할 수 있다.

## 식별자와 귀속

모든 식별자는 임의 UUID이며 개인정보와 연결하지 않는다.

```text
eventId
→ 한 개의 이벤트 요청을 식별하고 네트워크 재시도를 dedupe

visitorSessionId
→ 현재 브라우저 방문을 식별

resultSessionId
→ 하나의 수호신 결과 흐름을 식별

shareId
→ 해당 결과에서 만들어진 익명 공유 흐름을 식별
```

`shareId`는 해당 결과 세션에서 최초 공유 시 한 번 생성한다. 같은 결과에서 재공유할 때는 같은 값을 사용한다. 공유 버튼 클릭마다 새 값을 만들지 않는다.

공유받은 사용자는 원본 `shareId`와 자신의 `visitorSessionId`를 함께 가진다. 결과 완료 이벤트에 두 값을 보내 한 공유 흐름에서 서로 다른 몇 명이 결과를 완료했는지 계산한다.

## 분석 이벤트

새 외부 분석 서비스를 도입하지 않고 기존 Cloudflare D1 바인딩에 최소 이벤트 테이블을 추가한다. 기존 `paid_reports` 데이터를 건드리거나 테이블을 다시 만들지 않는 추가 전용 migration을 사용한다. 프런트엔드는 `/api/analytics`에 다음 이벤트만 보낸다.

```text
guardian_result_view
guardian_match_section_view

guardian_share_click
guardian_share_sheet_opened
guardian_share_confirmed

guardian_share_landing_view
guardian_result_complete_from_share

paid_conversion
```

카카오 웹훅 등으로 실제 전송이 확인된 경우 `guardian_share_confirmed`를 기록한다. Web Share처럼 실제 전송 확인이 제한적인 방식은 `guardian_share_sheet_opened`로 분류한다.

정상적인 재공유는 매번 별도 `eventId`로 이벤트 로그에 남긴다. 동일 요청의 재전송만 `eventId`로 제거한다. 추가 질문 보상은 `resultSessionId` 또는 기존 해금 토큰 기준 최초 한 번만 지급한다. KPI 쿼리는 `COUNT(DISTINCT shareId)` 또는 `COUNT(DISTINCT visitorSessionId)`로 중복 행동을 정리한다.

이벤트 payload에는 다음 값만 허용한다.

- 허용 목록에 있는 이벤트명
- 이벤트 발생 시각
- `eventId`, `visitorSessionId`, `resultSessionId`, `shareId`
- 유효한 `guardianId`, `fromGuardianId`
- 허용된 공유 채널과 유입원

생년월일, 성별, 이름, 이메일, 사용자가 입력한 고민, 리포트 본문, 원본 사용자 에이전트와 IP 주소는 이벤트 데이터에 저장하지 않는다.

서버는 이벤트명, ID 형식, 수호신 ID, 채널, body 크기를 검증하고 prepared statement로 기록한다. `eventId`에는 unique constraint를 둔다. 분석 저장 실패는 사용자 기능 실패로 전파하지 않는다.

## 오류와 폴백

- `fromGuardian`이 없거나 잘못되면 일반 랜딩을 표시한다.
- 60종 이미지가 누락되거나 로드되지 않으면 기존 수호신 이모지를 표시한다.
- 분석 API 실패는 결과 계산, 공유, 결제와 보상 처리를 막지 않는다.
- 카카오 공유 실패 시 기존 Web Share 링크, 파일 공유, 다운로드·링크 복사 순서를 유지한다.
- 사용자가 공유를 취소하면 `guardian_share_confirmed`와 보상을 발생시키지 않는다. 이미 공유 UI가 열렸다면 클릭·공유창 실행 이벤트는 행동 로그로 남을 수 있다.
- 공유는 반복할 수 있지만 보상은 최초 한 번만 지급한다.
- 공유 URL에서 귀속값을 복원하지 못해도 일반 결과 흐름은 정상 완료한다.

분석 전송은 비차단 방식으로 호출하되 페이지 종료 시점의 유실을 줄일 수 있는 브라우저 전송 수단을 사용한다. 실패한 이벤트를 제품 동작 중에 무한 재시도하지 않는다.

## 구현 경계

기존 프로젝트 패턴에 맞춰 다음 책임을 분리한다.

- Guardian ID 검증·파싱과 속성 파생
- Guardian 이미지 레지스트리
- 순수 궁합 계산과 관계 테이블
- BEST/WORST 결정
- 관계 카피 맵
- 압축형 궁합·공유 UI
- 공유 URL과 유입 문맥 관리
- 분석 이벤트 클라이언트와 서버 저장

궁합 계산과 정렬 함수는 React, 브라우저 API, 네트워크와 독립된 순수 모듈로 만든다. 공유·분석 실패가 계산 결과에 영향을 주지 않게 한다.

## 검증

60개 수호신을 기준으로 다음을 자동 검증한다.

```text
3,540 directional evaluations
1,770 unique guardian pairs
```

- 1,770쌍 전체에서 양방향 점수와 근거가 동일하다.
- 모든 점수는 0~100 범위다.
- 모든 수호신에 BEST와 WORST가 정확히 하나씩 존재한다.
- 자기 자신이 BEST 또는 WORST로 선택되지 않는다.
- 반복 실행과 입력 순서 변경에도 결과가 같다.
- 동점에서 관계 우선순위와 GuardianId 순서가 지켜진다.
- 특정 수호신으로 BEST/WORST가 과도하게 몰리는지 전체 분포를 출력한다.
- 60개 GuardianId가 모두 파싱되고 실제 이미지 경로와 연결된다.
- 잘못된 `fromGuardian`은 배너를 만들지 않는다.
- 공유 귀속이 입력 단계에서 결과 완료까지 유지된다.
- 같은 결과의 재공유는 같은 `shareId`, 새 결과의 공유는 새 `shareId`를 쓴다.
- 이벤트 재시도는 같은 `eventId`로 중복 저장되지 않고 정상 재공유는 별도 이벤트로 저장된다.
- 공유 취소와 확인 완료가 구분되고 보상은 한 번만 지급된다.
- 모바일에서 궁합 영역이 기존 유료 CTA를 과도하게 밀어내지 않는다.
- 분석 API와 이미지가 실패해도 핵심 결과·공유 폴백이 작동한다.

## 완료 기준

- 모든 사용자에게 압축형 궁합 블록과 단일 공유 CTA가 노출된다.
- 기존의 중복 공유 UI는 제거된다.
- 공유 유입자는 유효한 `fromGuardian`에 해당하는 문맥 배너를 본다.
- 공유 링크 유입부터 수호신 결과 완료까지 익명 귀속이 유지된다.
- 계산 대칭성, 결정성, 이미지 완전성과 이벤트 중복 방지가 자동 테스트로 보장된다.
- 기존 카카오 공유, Web Share 폴백, 추가 질문 보상과 결제가 회귀 없이 동작한다.
- Primary, Secondary, Growth, Guardrail KPI를 D1 이벤트로 계산할 수 있다.
