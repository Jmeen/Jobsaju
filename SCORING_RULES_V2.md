# 잡사주 월별 3축 Score 산출 원칙 및 Highlight 선정 규칙 (V2)

> **이 문서는 V2 설계 기록입니다. 현재 엔진이 따르는 규칙은 [SCORING_RULES.md](SCORING_RULES.md) (V3.2)입니다.**
> Semantic Signal Layer를 도입한 배경을 남겨두려고 보관합니다.
> 계산식이나 기대값을 확인할 때는 이 문서가 아니라 V3.2 문서를 보세요.

이 문서는 AI가 커리어 타이밍을 해석할 수 있도록, 백엔드에서 사주 명리 데이터를 `job_change`, `negotiation`, `stay` 3가지 행동 축의 점수(0~100)로 변환하는 산출 원칙입니다.

V2에서는 명리 데이터를 직접 3축으로 변환하지 않고, 중간에 **Semantic Signal Layer**를 두어 "이직 욕구(Mobility Pressure)"와 "실제 기회(Opportunity Support)"를 분리하여 보다 현실적인 커리어 상황을 모델링합니다.

---

## 1. 중간 계층: Semantic Signal Layer

명리 지표(천간 십성, 지지 관계)는 다음 6가지의 Semantic Signal(의미적 신호) 점수로 1차 변환됩니다.

*   **Mobility (이동성/욕구):** 환경을 바꾸고 탈출하려는 충동이나 외부의 강제적 변화. (이직 '욕구')
*   **Opportunity (기회/지지):** 외부의 제안, 계약의 성사, 안정적 도움. (이직/협상 '성공률')
*   **Reward (보상/결과):** 연봉, 성과급, 금전적 가치 획득.
*   **Expression (표현/주장):** 자신의 권리를 요구하고 목소리를 내는 힘.
*   **Stability (안정/유지):** 현재 상태에 머무르거나 소속감을 느끼는 힘.
*   **Risk (위험/스트레스):** 사내 정치, 마찰, 계약 파기 등 스트레스 요인.

---

## 2. 명리 데이터 → Semantic Signal 변환 규칙

### 2-1. 지지(Zhi) 관계 매핑 (환경적 요인)
해당 월의 지지가 원국(Base)의 지지와 맺는 관계입니다. 관계가 맺어지는 자리에 따라 가중치(Multiplier)가 붙습니다.
*(월지: x1.5 / 일지: x1.2 / 년지: x0.8 / 시지: x0.5)*

*   **충 (沖):** `Mobility +10`, `Risk +10`, `Stability -10` (안정이 깨지고 강한 이동 압박 발생)
*   **합 (合):** `Stability +10`, `Opportunity +5`, `Mobility -5` (안정적 계약 성사, 발이 묶임)
*   **형 (刑):** `Risk +8`, `Mobility +3`, `Stability -5` (지속적 마찰과 피로 누적으로 인한 이직 고민)
*   **파 (破):** `Risk +5`, `Stability -3` (내부 결속에 금이 감)
*   **해 (害):** `Risk +5`, `Opportunity -3` (인간적 오해, 외부 기회 차단)

### 2-2. 천간(Gan) 십성 매핑 (심리/명분적 요인)
해당 월의 천간이 일간과 맺는 십성(ShiShen)입니다. (가중치: 일괄 x1.0)

*   **식신/상관:** `Expression +10`, `Mobility +5`, `Stability -5` (불만 표출, 아웃풋 지향)
*   **정재/편재:** `Reward +10`, `Opportunity +5` (보상과 현실적 이득에 집중)
*   **정관:** `Stability +10`, `Opportunity +5` (조직 내 인정, 안정감)
*   **편관:** `Risk +5`, `Mobility +5` (과도한 책임으로 인한 스트레스와 도피성 이동 욕구)
*   **정인:** `Stability +10`, `Opportunity +5` (인내심 증가, 문서/자격 취득 유리)
*   **편인:** `Risk +3`, `Stability +5` (불안하지만 엉덩이는 무거움)
*   **비견/겁재:** `Expression +5`, `Mobility +3` (독립심 고취)

---

## 3. Semantic Signal → 3축 Score 변환 공식

6가지 Signal을 조합하여 각 행동 축의 **Raw Score**를 산출합니다.

*   **Job Change (이직운):** 이동 욕구가 있고 기회가 받쳐줘야 하며, 안정이 깨질 때 극대화됨.
    *   `Raw = (Mobility * 1.0) + (Opportunity * 0.5) - (Stability * 0.5) - (Risk * 0.5)`
*   **Negotiation (협상운):** 자신을 어필하고 보상을 요구해야 하며, 위험 요소가 없어야 함.
    *   `Raw = (Expression * 1.0) + (Reward * 1.0) + (Opportunity * 0.5) - (Risk * 0.5)`
*   **Stay (잔류운):** 안정을 추구하고 이동 욕구와 스트레스가 없어야 함.
    *   `Raw = (Stability * 1.5) + (Opportunity * 0.5) - (Mobility * 1.0) - (Risk * 1.0)`

### 3-1. 정규화 (Normalization)
극단적인 쏠림(0점 이하, 100점 이상)을 방지하고 점수대를 10~90점으로 부드럽게 맵핑하기 위해 Tanh(Hyperbolic Tangent) 곡선을 사용합니다. 
*(Spread 인위적 확대 보정은 사용하지 않습니다.)*

*   **최종 점수 = 50 + 40 × tanh(Raw / 25)**

---

## 4. Precomputed Highlights 선정 규칙

1.  **`best_job_change_month`**:
    *   `Job Change` 점수가 가장 높은 월. (동점 시 `Opportunity`가 가장 높은 월)
2.  **`best_negotiation_month`**:
    *   `Negotiation` 점수가 가장 높은 월. (동점 시 `Reward`가 가장 높은 월)
3.  **`caution_month` (리스크 관리의 달)**:
    *   **공식:** `Risk` Semantic Signal 누적값이 **가장 높은 월**. 
    *   단순히 점수가 낮은 달이 아니라, 사내 정치, 마찰, 계약 파기 등 실제 명리적 리스크(형충파해)가 가장 심하게 발생하여 관망이 필요한 달입니다.

---

## 5. 샘플 케이스 계산 시뮬레이션 (5 Cases)

*가정: 일지='유(酉, x1.2)', 월지='자(子, x1.5)', 년/시지 영향 없음.*

### Sample A. 강력한 도피성 이직운 (충/형 혼재)
*   **운세:** 묘(卯)월. 일지 묘유충(沖), 월지 자묘형(刑). 천간 상관.
*   **Signal 계산:**
    *   Gan(상관): Exp +10, Mob +5, Stab -5
    *   Day(충x1.2): Mob +12, Risk +12, Stab -12
    *   Mon(형x1.5): Risk +12, Mob +4.5, Stab -7.5
    *   **합계:** Mob(21.5), Opp(0), Rew(0), Exp(10), Stab(-24.5), Risk(24)
*   **Raw & Final:**
    *   `Raw_JobChange` = 21.5 + 0 - (-12.25) - 12 = 21.75 → **Final: 78점** (욕구와 탈출 명분이 압도적)
    *   `Raw_Nego` = 10 + 0 + 0 - 12 = -2.0 → **Final: 47점**
    *   `Raw_Stay` = -36.75 + 0 - 21.5 - 24 = -82.25 → **Final: 10점** (잔류 불가 수준)

### Sample B. 강력한 안착운 (합 발생)
*   **운세:** 진(辰)월. 일지 진유합(合), 천간 정인.
*   **Signal 계산:**
    *   Gan(정인): Stab +10, Opp +5
    *   Day(합x1.2): Stab +12, Opp +6, Mob -6
    *   Mon(자진합x1.5): Stab +15, Opp +7.5, Mob -7.5
    *   **합계:** Mob(-13.5), Opp(18.5), Rew(0), Exp(0), Stab(37), Risk(0)
*   **Raw & Final:**
    *   `Raw_JobChange` = -13.5 + 9.25 - 18.5 - 0 = -22.75 → **Final: 21점** (이동 불가)
    *   `Raw_Nego` = 0 + 0 + 9.25 - 0 = 9.25 → **Final: 64점**
    *   `Raw_Stay` = 55.5 + 9.25 - (-13.5) - 0 = 78.25 → **Final: 90점** (잔류 최적기)

### Sample C. 답답한 조정기 (형/충 혼재, Opportunity 부재)
*   **운세:** 묘(卯)월. 일지 묘유충(沖), 월지 자묘형(刑). 천간 정관. (Sample A와 지지는 같고 천간만 다름)
*   **Signal 계산:**
    *   Gan(정관): Stab +10, Opp +5
    *   **합계:** Mob(16.5), Opp(5), Rew(0), Exp(0), Stab(-9.5), Risk(24)
*   **Raw & Final:**
    *   `Raw_JobChange` = 16.5 + 2.5 - (-4.75) - 12 = 11.75 → **Final: 67점** (이동 욕구는 크나 A보단 낮음)
    *   `Raw_Nego` = 0 + 0 + 2.5 - 12 = -9.5 → **Final: 35점**
    *   `Raw_Stay` = -14.25 + 2.5 - 16.5 - 24 = -52.25 → **Final: 11점** (여전히 매우 불안정)

### Sample D. 복합 혼재기 (파/충 동시 발생)
*   **운세:** 오(午)월. 일지 오유파(破), 월지 자오충(沖). 천간 편재.
*   **Signal 계산:**
    *   Gan(편재): Rew +10, Opp +5
    *   Day(파x1.2): Risk +6, Stab -3.6
    *   Mon(충x1.5): Mob +15, Risk +15, Stab -15
    *   **합계:** Mob(15), Opp(5), Rew(10), Exp(0), Stab(-18.6), Risk(21)
*   **Raw & Final:**
    *   `Raw_JobChange` = 15 + 2.5 - (-9.3) - 10.5 = 16.3 → **Final: 73점**
    *   `Raw_Nego` = 0 + 10 + 2.5 - 10.5 = 2.0 → **Final: 53점**
    *   `Raw_Stay` = -27.9 + 2.5 - 15 - 21 = -61.4 → **Final: 10점**

### Sample E. 실력으로 승부하는 보상의 달 (식상생재의 흐름)
*   **운세:** 신(申)월. 일지 신유반합(合), 천간 정재. (월지도 원국과 충돌 없음 가정)
*   **Signal 계산:**
    *   Gan(정재): Rew +10, Opp +5
    *   Day(합x1.2): Stab +12, Opp +6, Mob -6
    *   **합계:** Mob(-6), Opp(11), Rew(10), Exp(0), Stab(12), Risk(0)
*   **Raw & Final:**
    *   `Raw_JobChange` = -6 + 5.5 - 6 - 0 = -6.5 → **Final: 40점**
    *   `Raw_Nego` = 0 + 10 + 5.5 - 0 = 15.5 → **Final: 72점** (이직보다 내부에서 강력하게 협상하기 좋은 타이밍)
    *   `Raw_Stay` = 18 + 5.5 - (-6) - 0 = 29.5 → **Final: 83점**
