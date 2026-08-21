점수를 %로 보여주지 않는다는 브랜드 규칙을 담은 그리드.

```jsx
<ScoreGrid items={[
  { icon:'🚪', label:'이직', value:'82점', locked:true },
  { icon:'💰', label:'협상', value:'74점', locked:true },
  { icon:'🪑', label:'잔류', value:'55점', locked:true },
]} />
```

무료 결과 화면은 숫자를 아예 보여주지 않고, 페이월 미리보기에서만 `locked`로 블러 처리해 궁금증을 남긴다.
