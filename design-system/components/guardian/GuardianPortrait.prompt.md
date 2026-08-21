60갑자 수호신 이미지 + 이름을 함께 쓰는 짝 컴포넌트. `guardianData.js`의 `getGuardian(sequence)`가 만든 객체를 그대로 넘긴다.

```jsx
import { getGuardian } from './guardianData';
const guardian = getGuardian(51, '..'); // 갑인 · 새싹호랑이

<GuardianPortrait guardian={guardian} eager />
<GuardianNameplate guardian={guardian} />
```

- 이미지가 없거나 깨지면 `GuardianPortrait`가 자동으로 `animalEmoji`로 대체한다 — 60종 모두 이 폴백 하나로 커버된다.
- 이름은 항상 Display 폰트(Neo Dunggeunmo Pro), 간지/오행 캡션은 본문 고딕 — 두 폰트를 한 컴포넌트 안에서 명확히 구분해서 쓴다.
