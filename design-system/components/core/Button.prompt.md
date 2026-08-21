한 화면에 최대 하나의 주 CTA만 두는 초록 버튼 3종. 결과·유료 전환 화면 모두 이 버튼 하나로 통일한다.

```jsx
<Button variant="primary" onClick={go}>내 수호신 뽑아보기</Button>
<Button variant="guardian" element="wood">{guardian.nickname}에게 고민 물어보기 →</Button>
<TextLink onClick={skip}>다른 고민 먼저 보기</TextLink>
```

- `variant="guardian"`은 현재 수호신의 오행 색(`element`)을 테두리·배경에 반영한다 — 화면마다 딱 하나, 결과 확인 직후 CTA에만 쓴다.
- `disabled`면 로딩 카피("공유 카드를 만드는 중…")로 라벨만 바꿔서 재사용한다.
