결과 화면에서 궁합과 공유를 하나로 압축한 박스. 59종 전체를 계산해 찰떡(best)·티격태격(worst) 한 쌍만 보여준다.

```jsx
<ChemistryBlock guardian={myGuardian} assetBase=".." isSharing={false} onShare={share} />
```

규칙 (반드시 지킬 것):
- 공유 CTA는 화면에 이 버튼 **하나만** — "내 수호신은 ○○. 너는?" → [친구에게 물어보기].
- 궁합은 %가 아니라 "직장 케미 92점"으로 표기.
- 찰떡·티격태격 두 줄만 보여주고 그 이상 늘리지 않는다 — 관계 캐릭터는 주인공이 아니므로 46px로 작게, 채도도 낮춰서 쓴다(`GuardianPortrait`의 기본 채도 그대로, 별도 CSS로 `saturate(.75)`를 얹어도 된다).
