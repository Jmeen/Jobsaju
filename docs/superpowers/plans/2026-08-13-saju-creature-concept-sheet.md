# Gap Wood Character Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 갑목 사용자에게 하나의 캐릭터와 자연 배경, 랭킹·강점을 함께 보여주는 독자적인 공유 카드를 만든다.

**Architecture:** 이전 시안의 갑목 기본형 실루엣만 계승하고, 카드 전체를 자연 도감 형태로 새로 생성한다. 생성 결과는 육안 검수 후 디자인 자산 폴더에 비파괴 저장한다.

**Tech Stack:** OpenAI built-in image generation, raster image inspection

## Global Constraints

- 한 카드에는 갑목 캐릭터 하나만 표시한다.
- 특정 카드게임의 고유 UI와 캐릭터 문법을 복제하지 않는다.
- 이미지 내부에는 언어와 관계없이 어떠한 글자도 넣지 않는다.

---

### Task 1: Gap Wood field-guide card

**Files:**
- Create: `design-assets/creature-concepts/gap-wood-field-card-v1.png`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-13-saju-creature-art-direction-design.md`
- Produces: 결과 화면 및 공유 디자인 검토용 정사각형 카드

- [ ] **Step 1: Generate one square card**

  이전 시안의 왼쪽 캐릭터를 계승하고 거목 숲과 영어 정보 패널을 결합한다.

- [ ] **Step 2: Inspect the result**

  캐릭터 수, 텍스트, 실루엣, 자연 배경, 금지된 카드게임 문법을 육안 검토한다.

- [ ] **Step 3: Save the preview**

  최종 시안을 `design-assets/creature-concepts/gap-wood-field-card-v1.png`에 저장한다.
