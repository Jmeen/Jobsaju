# 잡사주 월별 3축 Score 산출 원칙 및 Highlight 선정 규칙 (V3.2)

이 문서는 백엔드에서 계산된 사주 명리 데이터를 `job_change`, `negotiation`, `stay` 3가지 커리어 행동 축의 상대 점수(0~100)로 변환하기 위한 **Jobsaju 전용 MVP Score Model**입니다.

이 점수는 정통 명리 전체를 수치화한 절대적인 길흉 점수가 아닙니다.

특히 V3.2 MVP에서는 다음을 직접 Score에 반영하지 않습니다.

* 용신/희신
* 격국
* 신강/신약에 따른 복합 보정
* 대운과 월운의 다층 상호작용
* 세운과 월운 사이의 별도 합·충·형·파·해
* 모든 고전 명리 해석 규칙

대신 다음 흐름에 집중합니다.

**원국 × 월운 관계 → Semantic Signal → Career Action Score → Precomputed Highlight**

따라서 82점이라는 숫자는:

> “이직 성공 확률이 82%다.”

라는 뜻이 아니라,

> **“향후 12개월 중 이직 행동에 상대적으로 힘을 싣기 좋은 정도가 높다.”**

라는 Jobsaju 내부 상대 지표입니다.

---

# 1. 3축 Career Score 정의

## 1-1. Job Change

외부 이동, 직무 전환, 새로운 조직 탐색, 창업 등 **현재 환경 밖으로 이동하는 행동의 상대적 적합도**입니다.

다음 두 개념을 반드시 구분합니다.

* `Mobility` = 현재 환경을 떠나고 싶은 압력
* `Opportunity` = 실제 외부 기회가 받쳐주는 정도

따라서:

> **이직하고 싶은 달 ≠ 이직하기 좋은 달**

입니다.

---

## 1-2. Negotiation

다음과 같은 조건 조정 행동의 상대적 적합도입니다.

* 연봉 협상
* 직급 협상
* 역할 범위 조정
* 오퍼 레터 협의
* 근무조건 변경
* 내부 보상 협상

단순한 재물운이 아니라 다음 신호의 결합을 봅니다.

**Expression + Reward + Opportunity - Risk**

---

## 1-3. Stay

현재 조직에서 다음 행동에 힘을 싣는 상대적 적합도입니다.

* 잔류
* 내부 성과 축적
* 역할 정착
* 내부 이동
* 역량 개발
* 관망 및 준비
* 현재 기반 강화

`Stay`는 개인의 심리적 안정감이나 삶 전체의 안정성을 의미하지 않습니다.

---

# 2. Semantic Signal Layer

명리 관계를 곧바로 3축 Score에 연결하지 않습니다.

먼저 다음 6가지 의미적 신호로 변환합니다.

## Mobility

**변화·이동 압력**

현재 상태를 벗어나고 싶거나 외부 변화가 강하게 발생하는 정도입니다.

---

## Opportunity

**기회 지원도**

외부 제안, 연결, 계약, 인정 등 행동을 실제 결과로 연결하기 쉬운 정도입니다.

외부 기회만 의미하지 않습니다. 조직 내부에서의 인정이나 유효한 연결 역시 Opportunity로 작용할 수 있습니다.

---

## Reward

**보상·시장가치**

금전, 성과, 보상, 시장에서의 가치 교환과 관련된 정도입니다.

---

## Expression

**표현·주장**

자신의 요구, 의견, 성과, 가치를 밖으로 드러내는 힘입니다.

---

## Stability

**유지·정착**

현재 구조와 관계를 유지하고 내부에 기반을 만드는 정도입니다.

---

## Risk

**갈등·불확실성**

마찰, 오해, 관계 균열, 계약 리스크, 변동성 등 추가적인 검증이 필요한 정도입니다.

---

# 3. 분석 데이터 범위

## 3-1. 원국

다음을 사용합니다.

* 년주
* 월주
* 일주
* 시주(알려진 경우)

원국의 각 지지는 월운 지지와의 관계를 계산하는 기준으로 사용합니다.

---

## 3-2. 세운

세운 정보는 유지하지만, **V3.2 MVP Score 계산에서는 세운과 월운 간의 별도 관계를 직접 Score에 반영하지 않습니다.**

즉 다음 계산은 하지 않습니다.

```text
fortuneMonth × annualFortune
```

현재 Score의 핵심 계산 범위는:

```text
fortuneMonth × natalChart
```

입니다.

이것은 누락이 아니라 **의도적인 MVP 범위 제한**입니다.

세운은:

* 리포트 metadata
* 향후 Score Model 고도화
* 유료 해석 Context

용도로 보존합니다.

---

## 3-3. 월운

향후 12개월 Score 변화의 핵심 입력값입니다.

각 월마다 다음을 계산합니다.

```text
fortuneStem
fortuneBranch
```

---

## 3-4. 대운

V3.2 MVP의 월별 Score delta에는 직접 반영하지 않습니다.

대운이 계산되어 있는 경우 metadata로 보존하고 향후 확장에 사용합니다.

---

## 3-5. 시주 미상

출생시간이 없는 경우:

* `natalHourBranch` 관계 계산을 생략합니다.
* 시주를 추정하지 않습니다.
* 나머지 position weight를 재분배하지 않습니다.
* 다른 Signal을 인위적으로 증폭하지 않습니다.

---

# 4. 지지 관계 계산

월운의 `fortuneBranch`와 원국 지지를 비교합니다.

코드와 문서에서는 다음 이름을 사용합니다.

```text
fortuneBranch

natalYearBranch
natalMonthBranch
natalDayBranch
natalHourBranch
```

`월지`라는 단어만 사용해 운세 월지와 원국 월지를 혼용하지 않습니다.

---

# 4-1. 원국 Position Weight

| 원국 위치              | Weight | 의미        |
| ------------------ | -----: | --------- |
| `natalMonthBranch` |    1.5 | 사회·직장 환경  |
| `natalDayBranch`   |    1.2 | 개인의 직접 체감 |
| `natalYearBranch`  |    0.8 | 외부·거시 환경  |
| `natalHourBranch`  |    0.5 | 미래·내부 계획  |

출생시간이 없으면 `natalHourBranch`만 제외합니다.

---

# 4-2. Relation Type

relation metadata는 최소 다음 타입을 구분합니다.

```text
CHONG

LIUHE

SANHE
SANHE_HALF

FANGHE
FANGHE_PARTIAL

XING
PO
HAI
```

모든 합 관계를 하나의 `HE`로 뭉뚱그리지 않습니다.

---

# 4-3. 2자 관계 Weight

다음처럼 `fortuneBranch`와 원국 지지 하나가 관계를 맺는 경우:

```text
fortuneBranch ↔ natalDayBranch
```

해당 원국 지지의 position weight를 적용합니다.

예:

```text
fortuneBranch = 卯
natalDayBranch = 酉

CHONG
weight = 1.2
```

---

# 4-4. 삼합·방합의 Multi-Position Weight

`SANHE` 또는 `FANGHE`처럼 `fortuneBranch`와 **원국 지지 2개 이상**이 함께 완전 관계를 만드는 경우, 참여한 원국 position weight의 **산술평균**을 사용합니다.

공식:

```text
relationWeight
=
sum(participatingNatalWeights)
/
numberOfParticipatingNatalBranches
```

예:

```text
fortuneBranch = 丑

natalMonthBranch = 巳  // 1.5
natalDayBranch = 酉    // 1.2

巳酉丑 SANHE
```

relation weight:

```text
(1.5 + 1.2) / 2
= 1.35
```

fortuneBranch 자체에는 별도 weight를 부여하지 않습니다.

weight는 **원국의 어느 영역과 연결되었는가**를 나타내는 값입니다.

---

# 4-5. Partial → Complete 승격 및 중복 방지

완전한 `SANHE` 또는 `FANGHE`가 성립하면 이를 구성하는 partial relation을 Score에 중복 반영하지 않습니다.

예:

```text
巳 + 酉 + 丑
```

이 완전 `SANHE`를 형성했다면:

```text
巳酉 SANHE_HALF
酉丑 SANHE_HALF
巳酉丑 SANHE
```

세 개를 모두 Score에 넣지 않습니다.

Score에는:

```text
SANHE 1건
```

만 반영합니다.

동일 원칙을 `FANGHE`에도 적용합니다.

### 원칙

**Complete relation supersedes its constituent partial relations.**

relation metadata에는 필요하면 partial detection 기록을 debug 용도로 남길 수 있지만 Career Score 합산에는 포함하지 않습니다.

---

# 5. 지지 Relation → Semantic Signal

아래 수치는 Jobsaju MVP 초기 제품 가중치입니다.

정통 명리학의 절대 공식이 아닙니다.

---

## 5-1. CHONG

```text
Mobility  +10
Risk      +10
Stability -10
```

의미:

* 환경 변화 압력 증가
* 현재 구조와의 충돌 증가
* 잔류 안정성 감소

충 자체를 “좋은 이직운”으로 처리하지 않습니다.

---

## 5-2. LIUHE

```text
Stability   +10
Opportunity +5
Mobility    -5
```

의미:

* 연결
* 결속
* 합의
* 관계 유지

---

## 5-3. SANHE

```text
Opportunity +8
Stability   +6
Mobility    -2
```

여러 요소가 하나의 방향으로 모이며 연결성이 강화되는 Signal로 취급합니다.

---

## 5-4. SANHE_HALF

```text
Opportunity +4
Stability   +3
Mobility    -1
```

완전 삼합보다 약하게 반영합니다.

---

## 5-5. FANGHE

```text
Stability   +8
Opportunity +5
Mobility    -3
```

같은 방향성과 환경적 결속이 강화되는 Signal로 봅니다.

---

## 5-6. FANGHE_PARTIAL

```text
Stability   +3
Opportunity +2
```

강한 완전 결속으로 과대평가하지 않습니다.

---

## 5-7. XING

```text
Risk      +8
Mobility  +3
Stability -5
```

지속적인 마찰과 피로의 Signal입니다.

---

## 5-8. PO

```text
Risk      +5
Stability -3
```

기존 약속이나 구조에 균열이 생기는 Signal입니다.

---

## 5-9. HAI

```text
Risk        +5
Opportunity -3
```

관계 오해와 간접 마찰로 기회의 연결성이 약해질 수 있는 Signal입니다.

---

# 6. 월간 십성 → Semantic Signal

월운의 `fortuneStem`이 일간과 맺는 십성을 사용합니다.

---

## 식신 / 상관

```text
Expression +10
Mobility   +5
Stability  -5
```

---

## 정재 / 편재

```text
Reward      +10
Opportunity +5
```

---

## 정관

```text
Stability   +10
Opportunity +5
```

---

## 편관

```text
Risk     +5
Mobility +5
```

---

## 정인

```text
Stability   +10
Opportunity +5
```

---

## 편인

```text
Risk      +3
Stability +5
```

---

## 비견 / 겁재

```text
Expression +5
Mobility   +3
```

---

# 7. Semantic Signal 누적

한 달에 발생하는 모든 유효 relation을 독립적으로 계산합니다.

2자 relation:

```text
signalDelta
=
relationBaseSignal × natalPositionWeight
```

완전 SANHE/FANGHE:

```text
signalDelta
=
relationBaseSignal × multiPositionAverageWeight
```

십성 signal:

```text
× 1.0
```

---

# 7-1. Signal 상쇄

같은 Signal에 양수와 음수가 모두 있으면 그대로 합산합니다.

예:

```text
Mobility +12
Mobility -5

= Mobility +7
```

별도 Volatility Bonus는 사용하지 않습니다.

Risk 자체가 변동성과 마찰을 표현하기 때문입니다.

---

# 8. Semantic Signal → Career Raw Score

## 8-1. Job Change

```text
RawJobChange =
    Mobility
  + Opportunity * 0.5
  - Stability * 0.5
  - Risk * 0.5
```

### 해석 원칙

높은 Mobility만으로 최고 이직 월이 되지 않습니다.

Risk가 높고 Opportunity가 낮다면 점수가 제한됩니다.

---

## 8-2. Negotiation

```text
RawNegotiation =
    Expression
  + Reward
  + Opportunity * 0.5
  - Risk * 0.5
```

---

## 8-3. Stay

```text
RawStay =
    Stability * 1.5
  + Opportunity * 0.5
  - Mobility * 0.7
  - Risk * 0.7
```

V3.2에서는 CHONG/XING 등이 Stability 감소 + Mobility 증가 + Risk 증가를 동시에 발생시켜 Stay에 동일한 사건이 과도하게 중복 패널티 되는 현상을 완화하기 위해 Mobility와 Risk의 계수를 1.0에서 0.7로 완화했습니다.

다만 구조적으로 Job Change와 Stay가 음의 상관을 가질 가능성이 높으므로 분포 테스트에서 이를 별도로 관찰합니다.

---

# 9. Normalization

각 Raw Score는 다음 공식으로 10~90 범위에 부드럽게 수렴시킵니다.

```text
FinalScore =
50 + 40 * tanh(RawScore / 25)
```

정수 반올림:

```text
Math.round(FinalScore)
```

---

# 9-1. 금지되는 보정

다음을 하지 않습니다.

* 그래프 가독성을 위한 점수 증폭
* 최고 월을 강제로 90점 이상으로 만들기
* 최저 월을 강제로 40점 이하로 만들기
* 월별 평균 강제 조정
* 캐릭터별 Score 보정
* LLM Score 수정

Flat Timeline은 그대로 둡니다.

예:

```text
54
57
56
59
55
```

이 경우:

> 뚜렷한 변곡점보다는 비교적 완만한 흐름입니다.

라고 해석합니다.

---

# 10. Precomputed Highlights

Highlight는 백엔드가 결정합니다.

이 문서가 Highlight 계산의 **유일한 Source of Truth**입니다.

System Prompt나 LLM은 tie-break 규칙을 복제하거나 다시 판단하지 않습니다.

---

# 10-1. best_job_change_month

기본:

```text
job_change 최고 Score 월
```

동점:

1. Opportunity가 높은 월
2. Risk가 낮은 월
3. Mobility가 높은 월
4. `analysis_date`에서 가까운 월

Opportunity를 Mobility보다 먼저 비교합니다.

목적:

> “나가고 싶은 시기”보다 “실제 이동 기회가 받쳐주는 시기”를 우선

---

# 10-2. best_negotiation_month

기본:

```text
negotiation 최고 Score 월
```

동점:

1. Reward가 높은 월
2. Expression이 높은 월
3. Risk가 낮은 월
4. 기준일에 가까운 월

---

# 10-3. caution_month

`caution_month`의 정의:

> **향후 12개월 중 검증과 리스크 관리가 가장 필요한 달**

“나쁜 달”, “아무것도 하면 안 되는 달”, “무조건 관망해야 하는 달”이 아닙니다.

기본:

```text
Risk Signal 최고 월
```

동점:

1. Opportunity가 낮은 월
2. Stability가 낮은 월
3. Mobility가 높은 월
4. 기준일에 가까운 월

---

# 10-4. Highlight 중복 허용

다음과 같은 중복은 정상입니다.

```text
best_job_change_month
==
caution_month
```

예:

```text
Job Change 높음
Opportunity 높음
Risk 최고
```

이 경우 의미는:

> **움직일 기회는 크지만 검증 역시 가장 중요한 시기**

입니다.

Highlight를 억지로 다른 월로 분산하지 않습니다.

System Prompt는 `precomputed_highlights` 값을 그대로 사용해야 합니다.

---

# 11. Sample A — 이동 압력과 Risk가 모두 높은 달

가정:

```text
natalDayBranch = 酉
natalMonthBranch = 子

fortuneBranch = 卯
fortuneStem = 상관
```

relation:

```text
卯 ↔ 酉 = CHONG
卯 ↔ 子 = XING
```

Signal:

```text
상관:
Expression +10
Mobility +5
Stability -5

CHONG × 1.2:
Mobility +12
Risk +12
Stability -12

XING × 1.5:
Mobility +4.5
Risk +12
Stability -7.5
```

합계:

```text
Mobility 21.5
Opportunity 0
Reward 0
Expression 10
Stability -24.5
Risk 24
```

Raw:

```text
Job Change
= 21.5 + 0 - (-24.5×0.5) - (24×0.5)
= 21.75

Negotiation
= 10 - 12
= -2

Stay
= (-24.5×1.5) - (21.5×0.7) - (24×0.7)
= -36.75 - 15.05 - 16.8
= -68.6
```

Final:

```text
Job Change ≈ 78
Negotiation ≈ 47
Stay ≈ 10
```

---

# 12. Sample B — 정착성이 높은 달

```text
fortuneBranch = 辰
fortuneStem = 정인

辰 ↔ 酉 = LIUHE
```

Signal:

```text
정인:
Stability +10
Opportunity +5

LIUHE ×1.2:
Stability +12
Opportunity +6
Mobility -6
```

합계:

```text
Mobility -6
Opportunity 11
Reward 0
Expression 0
Stability 22
Risk 0
```

Raw:

```text
Job Change
= -6 + 5.5 - 11
= -11.5

Negotiation
= 5.5

Stay
= 33 + 5.5 - (-6×0.7)
= 33 + 5.5 + 4.2
= 42.7
```

Final:

```text
Job Change ≈ 33
Negotiation ≈ 59
Stay ≈ 87
```

---

# 13. Sample C — 이동 압력은 있으나 Risk가 높은 달

```text
fortuneBranch = 卯
fortuneStem = 정관

卯 ↔ 酉 = CHONG
卯 ↔ 子 = XING
```

합계:

```text
Mobility 16.5
Opportunity 5
Reward 0
Expression 0
Stability -9.5
Risk 24
```

Raw:

```text
Job Change
= 16.5 + 2.5 + 4.75 - 12
= 11.75

Negotiation
= 2.5 - 12
= -9.5

Stay
= -14.25 + 2.5 - (16.5×0.7) - (24×0.7)
= -14.25 + 2.5 - 11.55 - 16.8
= -40.1
```

Final:

```text
Job Change ≈ 68
Negotiation ≈ 35
Stay ≈ 13
```

---

# 14. Sample D — 보상 신호와 변동성이 함께 존재

```text
fortuneBranch = 午
fortuneStem = 편재

午 ↔ 酉 = PO
午 ↔ 子 = CHONG
```

합계:

```text
Mobility 15
Opportunity 5
Reward 10
Expression 0
Stability -18.6
Risk 21
```

Raw:

```text
Job Change
= 15 + 2.5 + 9.3 - 10.5
= 16.3

Negotiation
= 10 + 2.5 - 10.5
= 2

Stay
= -27.9 + 2.5 - (15×0.7) - (21×0.7)
= -27.9 + 2.5 - 10.5 - 14.7
= -50.6
```

Final:

```text
Job Change ≈ 73
Negotiation ≈ 53
Stay ≈ 11
```

---

# 15. Sample E — 보상과 정착이 함께 강한 달

```text
fortuneStem = 정재
fortuneBranch와 natalDayBranch가 SANHE_HALF
```

정재:

```text
Reward +10
Opportunity +5
```

SANHE_HALF ×1.2:

```text
Opportunity +4.8
Stability +3.6
Mobility -1.2
```

합계:

```text
Mobility -1.2
Opportunity 9.8
Reward 10
Expression 0
Stability 3.6
Risk 0
```

Raw:

```text
Job Change
= -1.2 + 4.9 - 1.8
= 1.9

Negotiation
= 10 + 4.9
= 14.9

Stay
= 5.4 + 4.9 - (-1.2×0.7)
= 5.4 + 4.9 + 0.84
= 11.14
```

Final:

```text
Job Change ≈ 53
Negotiation ≈ 71
Stay ≈ 67
```

---

# 16. Sample F — 완전 SANHE Multi-Position Weight

가정:

```text
fortuneBranch = 丑

natalMonthBranch = 巳 // weight 1.5
natalDayBranch = 酉   // weight 1.2
```

관계:

```text
巳酉丑 = SANHE
```

Multi-position weight:

```text
(1.5 + 1.2) / 2
= 1.35
```

SANHE 기본 Signal:

```text
Opportunity +8
Stability +6
Mobility -2
```

Weight 적용:

```text
Opportunity
= 8 × 1.35
= 10.8

Stability
= 6 × 1.35
= 8.1

Mobility
= -2 × 1.35
= -2.7
```

이 경우 `巳酉 SANHE_HALF`, `酉丑 SANHE_HALF` 등을 추가로 Score에 반영하지 않습니다.

`SANHE` 1건만 계산합니다.

---

# 17. Determinism

동일 입력에 대해 항상 동일한 결과를 반환해야 합니다.

```text
same natal chart
+ same analysis_date
+ same scoring_rule_version
=
same scores
+ same precomputed_highlights
```

LLM은 Score 및 Highlight 계산에 관여하지 않습니다.

---

# 18. Versioning

모든 Score 결과에는 version을 저장합니다.

```json
{
  "scoring_rule_version": "v3.2"
}
```

향후 가중치가 변경되더라도 과거 결과의 계산 기준을 추적할 수 있어야 합니다.

---

# 19. Debug Metadata

운영 사용자에게 노출하지 않아도 다음 정보는 내부적으로 추적 가능해야 합니다.

```json
{
  "semantic_signals": {
    "mobility": 21.5,
    "opportunity": 0,
    "reward": 0,
    "expression": 10,
    "stability": -24.5,
    "risk": 24
  },

  "relations": [
    {
      "fortune_branch": "卯",
      "targets": [
        "natalDayBranch"
      ],
      "relation": "CHONG",
      "weight": 1.2
    }
  ]
}
```

Multi-position relation:

```json
{
  "fortune_branch": "丑",
  "targets": [
    "natalMonthBranch",
    "natalDayBranch"
  ],
  "relation": "SANHE",
  "weight": 1.35
}
```

---

# 20. Score Engine 자동 검증

구현 후 다음을 자동 테스트합니다.

## Determinism

동일 입력을 반복 실행해 결과가 항상 동일한지 확인합니다.

## Boundary

모든 Final Score:

```text
10 <= score <= 90
```

## Missing Hour

시주 없이 정상 계산되는지 확인합니다.

## Relation Types

다음 타입이 구분되는지 확인합니다.

```text
CHONG
LIUHE
SANHE
SANHE_HALF
FANGHE
FANGHE_PARTIAL
XING
PO
HAI
```

## Complete Relation Deduplication

완전 SANHE/FANGHE가 성립한 경우 constituent partial relation이 Score에 중복 적용되지 않는지 확인합니다.

## Multi-Position Weight

삼합/방합에서 참여 원국 weight 평균이 정확히 적용되는지 확인합니다.

## Highlight

* best job change = 최고 Job Change Score + tie-break
* best negotiation = 최고 Negotiation Score + tie-break
* caution = 최고 Risk + tie-break

## Duplicate Highlights

같은 달이 best와 caution에 동시에 선정되어도 정상 처리합니다.

## Flat Timeline

월별 편차가 작아도 임의 확대하지 않습니다.

---

# 21. 분포 검증

Unit Test 후 여러 테스트 원국을 이용해 최소 수백~수천 개의 월 Score를 생성합니다.

다음을 확인합니다.

* Job Change 평균
* Negotiation 평균
* Stay 평균
* 각 축 표준편차
* 10~20점대 비율
* 80~90점대 비율
* 세 축 상관계수
* caution_month 분포
* relation type별 평균 영향도
* 특정 relation 또는 십성이 best month를 과도하게 독점하는지 여부

---

# 21-1. Job Change ↔ Stay 상관관계

현재 공식 구조상 두 Score에는 어느 정도 음의 상관이 발생하는 것이 자연스럽습니다.

특히:

```text
Mobility
```

가 Job Change에는 양수, Stay에는 음수로 작용합니다.

따라서 단순히 음의 상관이라는 이유만으로 오류로 보지 않습니다.

다만 실제 분포에서 거의 동일 축의 반전처럼 움직이는 경우에는 모델을 재검토합니다.

예:

```text
corr(job_change, stay)
≈ -1.0
```

수준에 지속적으로 근접한다면:

* Stay의 Mobility penalty
* Stay의 Risk penalty

계수를 완화하는 방안을 검토합니다.

계수는 데이터 확인 전 임의 변경하지 않습니다.

---

# 22. System Prompt와의 책임 분리

이 문서(`SCORING_RULES` V3.2)는 다음의 유일한 Source of Truth입니다.

* Signal 생성
* relation weight
* Score 계산
* normalization
* Highlight 선정
* tie-break

System Prompt에는 위 계산 규칙을 복제하지 않습니다.

System Prompt는 백엔드가 계산한:

```text
monthly_forecast
precomputed_highlights
```

를 그대로 신뢰합니다.

LLM의 책임은:

* reason 작성
* action 작성
* 월별 커리어 언어 해석
* personalized advice 생성

뿐입니다.

---

# 23. 최종 원칙

Jobsaju Score Engine은 미래 성공 확률을 예측하는 모델이 아닙니다.

다음 질문을 결정론적인 규칙으로 수치화합니다.

> **“이 사람의 향후 12개월 흐름에서 어떤 커리어 행동에 상대적으로 힘이 실리는가?”**

따라서 V3.2는 다음 원칙을 지킵니다.

**이직 욕구와 이직 기회를 구분한다.**

**갈등과 좋은 이동을 동일하게 취급하지 않는다.**

**명리 relation을 Career Score에 직접 연결하지 않는다.**

**완전 합과 부분 합을 중복 계산하지 않는다.**

**복수 원국 위치가 참여하는 관계의 Weight를 명시적으로 계산한다.**

**세운×월운 관계 미반영은 의도적인 MVP 범위 제한이다.**

**점수 차이를 인위적으로 확대하지 않는다.**

**같은 입력은 항상 같은 결과를 낸다.**

**왜 그 점수가 나왔는지 추적할 수 있어야 한다.**
