# Business Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 잡사주의 모든 화면 하단에 사업자 정보와 고객지원 정보를 담은 비고정 공통 푸터를 추가한다.

**Architecture:** 독립적인 `BusinessFooter` 프레젠테이션 컴포넌트를 만들고 `App`의 최상위 컨테이너 마지막에 한 번 렌더링한다. 컴포넌트 스타일은 전역 UI 토큰을 사용하는 전용 CSS 클래스로 `index.css`에 추가한다.

**Tech Stack:** React 19, TypeScript, Vite, Node test runner, React DOM server rendering

## Global Constraints

- 푸터는 인트로, 입력, 로딩, 결과 화면에서 모두 렌더링한다.
- 푸터는 화면에 고정하지 않고 일반 문서 흐름에 둔다.
- 팝업과 모달 내부에는 푸터를 중복 표시하지 않는다.
- 고객지원 이메일만 `mailto:support@jobsaju.kr` 링크로 제공한다.
- `이용약관`, `개인정보처리방침`, `환불정책`은 링크가 아닌 비활성 텍스트로 표시한다.
- 실제 정책 페이지와 라우팅은 이번 작업에 포함하지 않는다.
- 기존에 준비된 사용자 변경은 수정하거나 되돌리지 않는다.

---

### Task 1: 공통 사업자 정보 푸터

**Files:**
- Create: `src/components/BusinessFooter.tsx`
- Create: `src/components/BusinessFooter.test.ts`
- Modify: `src/App.tsx`의 import 영역과 최상위 `.app-container` 닫기 직전
- Modify: `src/index.css`의 공통 레이아웃 스타일 영역

**Interfaces:**
- Consumes: 기존 `index.css`의 `--border-neon`, `--text-secondary`, `--text-muted`, `--accent-purple` 색상 토큰
- Produces: `BusinessFooter(): JSX.Element` React 컴포넌트

- [ ] **Step 1: 렌더링 계약을 검증하는 실패 테스트 작성**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('사업자 정보와 이메일 링크 및 비활성 정책명을 렌더링한다', async (t) => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  t.after(() => vite.close());

  const { BusinessFooter } = await vite.ssrLoadModule('/src/components/BusinessFooter.tsx');
  const html = renderToStaticMarkup(createElement(BusinessFooter));

  assert.match(html, /잡사주 \| 운영: 두리하나랩/);
  assert.match(html, /대표 임재민/);
  assert.match(html, /사업자등록번호 306-16-54574/);
  assert.match(html, /href="mailto:support@jobsaju\.kr"/);
  assert.match(html, /이용약관/);
  assert.match(html, /개인정보처리방침/);
  assert.match(html, /환불정책/);
  assert.doesNotMatch(html, /href="[^"]*">이용약관/);
  assert.doesNotMatch(html, /href="[^"]*">개인정보처리방침/);
  assert.doesNotMatch(html, /href="[^"]*">환불정책/);
});
```

- [ ] **Step 2: 테스트가 올바른 이유로 실패하는지 확인**

Run: `node --test src/components/BusinessFooter.test.ts`

Expected: `src/components/BusinessFooter.tsx` 모듈을 찾을 수 없어 FAIL

- [ ] **Step 3: 최소 푸터 컴포넌트 구현**

```tsx
export function BusinessFooter() {
  return (
    <footer className="business-footer" aria-label="사업자 정보">
      <p className="business-footer__brand">잡사주 <span aria-hidden="true">|</span> 운영: 두리하나랩</p>
      <p>대표 임재민 <span aria-hidden="true">·</span> 사업자등록번호 306-16-54574</p>
      <p>고객지원: <a href="mailto:support@jobsaju.kr">support@jobsaju.kr</a></p>
      <p className="business-footer__policies">
        <span>이용약관</span><span aria-hidden="true">·</span>
        <span>개인정보처리방침</span><span aria-hidden="true">·</span>
        <span>환불정책</span>
      </p>
    </footer>
  );
}
```

- [ ] **Step 4: 컴포넌트 테스트 통과 확인**

Run: `node --test src/components/BusinessFooter.test.ts`

Expected: 1 test PASS

- [ ] **Step 5: 앱 최상위에 공통 푸터 연결**

`src/App.tsx`에 다음 import를 추가한다.

```tsx
import { BusinessFooter } from './components/BusinessFooter';
```

최상위 `.app-container`의 모달 렌더링 뒤, 컨테이너를 닫기 직전에 다음을 추가한다.

```tsx
<BusinessFooter />
```

- [ ] **Step 6: 기존 테마와 모바일 폭에 맞는 스타일 추가**

`src/index.css`에 다음 스타일을 추가한다.

```css
.business-footer {
  margin-top: auto;
  padding: 28px 8px 4px;
  border-top: 1px solid var(--border-neon);
  color: var(--text-muted);
  text-align: center;
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.business-footer p { margin: 0; }
.business-footer__brand { color: var(--text-secondary); font-weight: 600; }
.business-footer a { color: var(--accent-purple); text-underline-offset: 3px; }
.business-footer a:focus-visible { outline: 2px solid var(--accent-purple); outline-offset: 3px; border-radius: 2px; }
.business-footer__policies { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 7px; margin-top: 4px; }
```

- [ ] **Step 7: 전체 검증 실행**

Run: `npm run test`

Expected: 모든 테스트 PASS

Run: `npm run lint`

Expected: 오류 없이 종료

Run: `npm run build`

Expected: TypeScript와 Vite 프로덕션 빌드 성공

- [ ] **Step 8: 시각 확인**

Run: `npm run dev`

인트로와 입력 단계에서 끝까지 스크롤해 푸터가 일반 문서 흐름의 마지막에 나타나고 화면에 고정되지 않는지 확인한다. 320px 안팎의 모바일 폭에서 가로 스크롤이 생기지 않고 정책명이 자연스럽게 줄바꿈되는지 확인한다.

- [ ] **Step 9: 커밋**

Git 작성자 이름과 이메일이 설정된 경우에만 다음을 실행한다.

```bash
git add src/components/BusinessFooter.tsx src/components/BusinessFooter.test.ts src/App.tsx src/index.css
git commit -m "feat: add business information footer"
```

작성자 정보가 없으면 커밋을 생략하고 변경 파일과 검증 결과를 사용자에게 전달한다.
