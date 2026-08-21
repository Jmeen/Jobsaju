기본 베이지 카드와 390px 모바일 화면 셸.

```jsx
<ScreenShell element={guardian.element}>
  <Card>일반 정보 박스</Card>
  <Card tone="brand-soft">오행 강조 박스</Card>
</ScreenShell>
```

`ScreenShell`의 `element`가 바뀌면 그 화면 안의 모든 오행 액센트(버튼 테두리, 강조 카드, 질문 선택 상태)가 함께 바뀐다 — 사용자 일간마다 화면 전체 톤을 한 번에 맞추는 용도.
