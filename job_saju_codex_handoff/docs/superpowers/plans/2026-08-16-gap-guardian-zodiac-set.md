# 갑목 십이지 수호 캐릭터 10종 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 갑자·갑진 2D 캐릭터와 어울리는 투명 배경 갑목 십이지 캐릭터 10종을 완성한다.

**Architecture:** 기존 두 이미지를 매 생성 요청의 스타일 참조로 사용하되 동물마다 별도 이미지를 생성한다. 생성 결과는 지정 파일명으로 `assets/baby-guardians/2d/`에 저장하고, 각 파일의 시각적 일관성과 PNG 알파 채널을 개별 검수한다.

**Tech Stack:** Codex 내장 ImageGen, PNG RGBA, 로컬 이미지 시각 검수

## Global Constraints

- 포근한 동화책 수채화 질감, 둥근 아기 동물 비율, 연한 하늘색 몸, 큰 청록색 눈, 분홍 볼, 크림색 강조색을 유지한다.
- 초록색 새싹 문양 복주머니와 금색 매듭·방울을 공통 복식으로 사용한다.
- 단독 전신 캐릭터를 정사각형 캔버스 중앙에 배치한다.
- 실제 알파 채널이 있는 완전 투명 배경을 사용하고, 바닥 그림자와 캐릭터 밖 장식을 넣지 않는다.
- 글자, 로고, 워터마크, 3D 렌더링을 넣지 않는다.
- 기존 `gapja-blue-mouse.png`와 `gapjin-blue-dragon.png`는 변경하지 않는다.

---

### Task 1: 소·호랑이 캐릭터

**Files:**
- Create: `assets/baby-guardians/2d/gapchuk-blue-ox.png`
- Create: `assets/baby-guardians/2d/gapin-blue-tiger-2d.png`

- [ ] **Step 1: 갑축 소 생성**

기존 갑자·갑진을 스타일 참조로 지정하고 Global Constraints를 모두 포함해, 작은 둥근 뿔과 넓은 귀가 잘 보이는 온순한 아기 소 전신을 생성한다.

- [ ] **Step 2: 갑인 호랑이 생성**

같은 참조와 제약을 사용해, 둥근 귀·짙은 청색 줄무늬·길게 휘어진 꼬리가 선명한 씩씩한 아기 호랑이 전신을 생성한다.

- [ ] **Step 3: 저장 및 검수**

각 결과를 지정 파일명으로 저장하고 동물 식별성, 전신, 복주머니, 투명 배경을 확인한다.

### Task 2: 토끼·뱀 캐릭터

**Files:**
- Create: `assets/baby-guardians/2d/gapmyo-blue-rabbit.png`
- Create: `assets/baby-guardians/2d/gapsa-blue-snake.png`

- [ ] **Step 1: 갑묘 토끼 생성**

Global Constraints에 맞춰 긴 귀와 작은 솜방울 꼬리가 잘 보이는 수줍은 아기 토끼 전신을 생성한다.

- [ ] **Step 2: 갑사 뱀 생성**

Global Constraints에 맞춰 짧고 통통한 몸을 부드러운 S자로 세우고 복주머니를 앞쪽에 맨 호기심 많은 아기 뱀 전신을 생성한다. 팔다리는 만들지 않는다.

- [ ] **Step 3: 저장 및 검수**

각 결과를 지정 파일명으로 저장하고 토끼의 귀·꼬리, 뱀의 무지형 몸, 투명 배경을 확인한다.

### Task 3: 말·양 캐릭터

**Files:**
- Create: `assets/baby-guardians/2d/gapo-blue-horse.png`
- Create: `assets/baby-guardians/2d/gapmi-blue-sheep.png`

- [ ] **Step 1: 갑오 말 생성**

Global Constraints에 맞춰 짙은 청록색 갈기와 꼬리, 네 발굽이 자연스러운 활기찬 아기 말 전신을 생성한다.

- [ ] **Step 2: 갑미 양 생성**

Global Constraints에 맞춰 하늘색 곱슬 양털과 작은 크림색 뿔, 검푸른 얼굴이 조화로운 포근한 아기 양 전신을 생성한다.

- [ ] **Step 3: 저장 및 검수**

각 결과를 지정 파일명으로 저장하고 말의 다리·발굽, 양의 뿔·양털, 투명 배경을 확인한다.

### Task 4: 원숭이·닭 캐릭터

**Files:**
- Create: `assets/baby-guardians/2d/gapsin-blue-monkey.png`
- Create: `assets/baby-guardians/2d/gapyu-blue-rooster.png`

- [ ] **Step 1: 갑신 원숭이 생성**

Global Constraints에 맞춰 크림색 얼굴과 귀, 길게 말린 꼬리, 장난기 있는 표정의 아기 원숭이 전신을 생성한다.

- [ ] **Step 2: 갑유 닭 생성**

Global Constraints에 맞춰 작은 붉은 볏, 하늘색 깃털, 짙은 청록색 꼬리깃, 두 다리가 자연스러운 당찬 아기 수탉 전신을 생성한다.

- [ ] **Step 3: 저장 및 검수**

각 결과를 지정 파일명으로 저장하고 원숭이의 손발·꼬리, 닭의 볏·날개·다리, 투명 배경을 확인한다.

### Task 5: 개·돼지 캐릭터와 세트 최종 검수

**Files:**
- Create: `assets/baby-guardians/2d/gapsul-blue-dog.png`
- Create: `assets/baby-guardians/2d/gaphae-blue-pig.png`
- Verify: `assets/baby-guardians/2d/*.png`

- [ ] **Step 1: 갑술 개 생성**

Global Constraints에 맞춰 늘어진 귀와 둥근 주둥이, 위로 말린 꼬리가 잘 보이는 충직한 아기 개 전신을 생성한다.

- [ ] **Step 2: 갑해 돼지 생성**

Global Constraints에 맞춰 둥근 분홍 코, 늘어진 귀, 짧게 말린 꼬리가 잘 보이는 낙천적인 아기 돼지 전신을 생성한다.

- [ ] **Step 3: 저장 및 개별 검수**

각 결과를 지정 파일명으로 저장하고 개·돼지의 종 식별 특징, 전신, 복주머니, 투명 배경을 확인한다.

- [ ] **Step 4: 10종 세트 검수**

10개 파일을 함께 비교해 몸색, 눈, 수채화 질감, 캐릭터 비율, 복주머니 크기, 캔버스 여백이 기존 갑자·갑진과 어울리는지 확인한다. PNG 파일 모드에 알파 채널이 있고 네 모서리 픽셀의 알파 값이 0인지 검사한다.

- [ ] **Step 5: 결과 기록**

최종 파일 경로와 사용한 공통 프롬프트, 동물별 차별화 문구, 검수 결과를 사용자에게 전달한다.
