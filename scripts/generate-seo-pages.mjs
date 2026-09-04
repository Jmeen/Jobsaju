import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import GUARDIAN_CHARACTERS from '../free_engine_characters.js';

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const JOBBTI_DIR = join(PUBLIC_DIR, 'jobbti');
const SITE_URL = 'https://jobsaju.kr';
const PROFILE_SOURCE = join(ROOT_DIR, 'src', 'utils', 'guardianProfiles.ts');

const PROFILE_PATTERN = /\{\s*sequence:\s*(\d+),\s*ganzhiKo:\s*'([^']*)',\s*animal:\s*'([^']*)',\s*animalEmoji:\s*'([^']*)',\s*nickname:\s*'([^']*)',\s*copy:\s*'([^']*)'\s*\}/g;
const ELEMENTS = [
  { key: 'wood', label: '목(木)', name: '성장과 개척' },
  { key: 'fire', label: '화(火)', name: '표현과 추진' },
  { key: 'earth', label: '토(土)', name: '안정과 운영' },
  { key: 'metal', label: '금(金)', name: '판단과 완성' },
  { key: 'water', label: '수(水)', name: '탐색과 연결' },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function sequencePath(sequence) {
  return String(sequence).padStart(2, '0');
}

function guardianIdBySequence(sequence) {
  const gan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const zhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const index = sequence - 1;
  return gan[index % gan.length] + zhi[index % zhi.length];
}

function guardianElement(sequence) {
  const ganIndex = (sequence - 1) % 10;
  return ELEMENTS[Math.floor(ganIndex / 2)];
}

async function loadProfiles() {
  const source = await readFile(PROFILE_SOURCE, 'utf8');
  const profiles = [...source.matchAll(PROFILE_PATTERN)].map(match => ({
    sequence: Number(match[1]),
    ganzhiKo: match[2],
    animal: match[3],
    animalEmoji: match[4],
    nickname: match[5],
    copy: match[6],
  }));

  if (profiles.length !== 60) {
    throw new Error(`guardianProfiles.ts에서 60개 프로필을 읽어야 하지만 ${profiles.length}개를 찾았습니다.`);
  }
  return profiles;
}

function pageHead({ title, description, canonical, image, structuredData }) {
  return `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="stylesheet" href="/jobbti/jobbti.css" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="잡사주" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <script type="application/ld+json">${jsonLd(structuredData)}</script>`;
}

function siteHeader() {
  return `<header class="site-header">
    <a class="brand" href="/">잡사주 <span>내 수호신</span></a>
    <nav aria-label="주요 메뉴">
      <a href="/jobbti/" aria-current="page">잡BTI 유형</a>
      <a class="header-cta" href="/?utm_source=organic&amp;utm_medium=seo&amp;utm_campaign=jobbti">내 수호신 찾기</a>
    </nav>
  </header>`;
}

function siteFooter() {
  return `<footer class="seo-footer">
    <p><strong>잡사주 · 잡BTI</strong></p>
    <p>잡BTI는 생년월일의 일주를 바탕으로 직장생활 성향을 풀어보는 자기이해 콘텐츠입니다. 채용·퇴사·투자 등 중요한 결정을 대신하지 않습니다.</p>
    <p><a href="/">내 수호신 찾기</a> · <a href="mailto:admin@jobsaju.kr">문의하기</a></p>
  </footer>`;
}

function typeCard(profile, character) {
  const path = sequencePath(profile.sequence);
  return `<li class="type-card">
    <a href="/jobbti/types/${path}/">
      <img src="/guardians/thumb/${path}.webp" width="112" height="112" loading="lazy" alt="${escapeHtml(profile.nickname)} ${escapeHtml(profile.animal)} 수호신" />
      <span class="type-number">JOBBTI ${path}</span>
      <strong>${escapeHtml(profile.nickname)}</strong>
      <small>${escapeHtml(character.summary_og)}</small>
    </a>
  </li>`;
}

function renderHub(profiles, charactersById) {
  const canonical = `${SITE_URL}/jobbti/`;
  const title = '직장인 성향 테스트 잡BTI | 60가지 직장생활 수호신';
  const description = '60가지 직장생활 수호신으로 알아보는 잡BTI. 나의 일하는 방식, 강점, 주의할 점과 잘 맞는 업무 환경을 확인해보세요.';
  const items = profiles.map(profile => {
    const character = charactersById.get(guardianIdBySequence(profile.sequence));
    return typeCard(profile, character);
  }).join('\n');
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonical,
        url: canonical,
        name: title,
        description,
        inLanguage: 'ko-KR',
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '잡사주', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: '잡BTI 60가지 유형', item: canonical },
        ],
      },
      {
        '@type': 'ItemList',
        name: '잡BTI 60가지 수호신 유형',
        numberOfItems: 60,
        itemListElement: profiles.map(profile => ({
          '@type': 'ListItem',
          position: profile.sequence,
          name: profile.nickname,
          url: `${SITE_URL}/jobbti/types/${sequencePath(profile.sequence)}/`,
        })),
      },
    ],
  };

  return `<!doctype html>
<html lang="ko">
<head>${pageHead({ title, description, canonical, image: `${SITE_URL}/og-guardian-share.png`, structuredData })}
</head>
<body>
  ${siteHeader()}
  <main>
    <nav class="breadcrumbs" aria-label="현재 위치"><a href="/">잡사주</a><span>›</span><span>잡BTI</span></nav>
    <section class="hub-hero">
      <div>
        <p class="eyebrow">직장인 성향 테스트 · JOBBTI</p>
        <h1>일할 때 진짜 내 모습,<br /><em>60가지 수호신</em> 중 누구일까?</h1>
        <p class="hero-copy">잡BTI는 태어난 날의 기운을 직장생활 언어로 바꿔, 내가 일을 시작하고 사람과 협업하고 결정을 내리는 방식을 보여줍니다.</p>
        <a class="primary-cta" href="/?utm_source=organic&amp;utm_medium=seo&amp;utm_campaign=jobbti_hub">무료로 내 잡BTI 찾기</a>
        <small class="cta-note">생년월일 입력 후 바로 확인 · 무료</small>
      </div>
      <div class="hero-characters" aria-hidden="true">
        <img src="/guardians/01.webp" alt="" width="240" height="240" />
        <img src="/guardians/51.webp" alt="" width="180" height="180" loading="lazy" />
      </div>
    </section>

    <section class="explain-section" aria-labelledby="what-is-jobbti">
      <p class="eyebrow">잡BTI란?</p>
      <h2 id="what-is-jobbti">성격을 단정하는 네 글자 대신,<br />직장에서 반복되는 행동을 봅니다</h2>
      <div class="feature-grid">
        <article><span>01</span><h3>나의 일하는 방식</h3><p>일을 시작하고 우선순위를 정할 때 자연스럽게 나오는 패턴을 설명합니다.</p></article>
        <article><span>02</span><h3>강점과 맹점</h3><p>성과로 이어지는 장점과, 같은 성향이 과해졌을 때 생길 수 있는 빈틈을 함께 봅니다.</p></article>
        <article><span>03</span><h3>잘 맞는 환경</h3><p>속도, 자율성, 협업, 안정성 중 어떤 조건에서 강점이 더 잘 살아나는지 확인합니다.</p></article>
      </div>
    </section>

    <section class="types-section" aria-labelledby="all-types">
      <p class="eyebrow">ALL 60 TYPES</p>
      <h2 id="all-types">잡BTI 60가지 유형</h2>
      <p class="section-lead">궁금한 수호신을 눌러 직장생활 강점과 주의할 점을 먼저 살펴보세요.</p>
      <ol class="type-grid">${items}</ol>
    </section>

    <section class="faq-section" aria-labelledby="jobbti-faq">
      <p class="eyebrow">알아두면 좋아요</p>
      <h2 id="jobbti-faq">잡BTI를 보는 방법</h2>
      <details open><summary>잡BTI는 일반적인 MBTI 검사인가요?</summary><p>아닙니다. 잡BTI는 생년월일의 일주를 바탕으로 직장생활 성향을 해석한 잡사주의 자체 콘텐츠입니다. 의학적·심리학적 진단 도구가 아닙니다.</p></details>
      <details><summary>같은 수호신이면 직장생활도 똑같나요?</summary><p>같은 유형은 비슷한 출발점을 설명할 뿐입니다. 경력, 직무, 조직 환경과 개인 경험에 따라 실제 행동과 선택은 달라질 수 있습니다.</p></details>
      <details><summary>이직이나 퇴사 결정을 잡BTI로 내려도 되나요?</summary><p>잡BTI는 생각을 정리하는 보조 도구입니다. 보상, 성장 가능성, 생활 여건과 실제 채용 조건을 함께 확인한 뒤 결정하세요.</p></details>
    </section>
  </main>
  ${siteFooter()}
</body>
</html>`;
}

function relatedProfilesFor(sequence, profiles) {
  const sequences = [
    sequence === 1 ? 60 : sequence - 1,
    sequence === 60 ? 1 : sequence + 1,
    ((sequence + 11) % 60) + 1,
  ];
  return sequences.map(item => profiles[item - 1]);
}

function renderTypePage(profile, character, profiles, charactersById) {
  const path = sequencePath(profile.sequence);
  const canonical = `${SITE_URL}/jobbti/types/${path}/`;
  const title = `${profile.nickname} 잡BTI | 강점·맹점·잘 맞는 업무 환경`;
  const description = `${profile.nickname} 유형은 ${character.summary_og} 강점, 주의할 점과 잘 맞는 직장 환경을 확인해보세요.`;
  const element = guardianElement(profile.sequence);
  const related = relatedProfilesFor(profile.sequence, profiles).map(item => {
    const relatedCharacter = charactersById.get(guardianIdBySequence(item.sequence));
    return typeCard(item, relatedCharacter);
  }).join('\n');
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonical,
        url: canonical,
        name: title,
        description,
        inLanguage: 'ko-KR',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: {
          '@type': 'DefinedTerm',
          name: `${profile.nickname} 잡BTI`,
          description: character.summary_og,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '잡사주', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: '잡BTI 유형', item: `${SITE_URL}/jobbti/` },
          { '@type': 'ListItem', position: 3, name: profile.nickname, item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="ko">
<head>${pageHead({ title, description, canonical, image: `${SITE_URL}/guardians/${path}.webp`, structuredData })}
</head>
<body data-element="${element.key}">
  ${siteHeader()}
  <main>
    <nav class="breadcrumbs" aria-label="현재 위치"><a href="/">잡사주</a><span>›</span><a href="/jobbti/">잡BTI</a><span>›</span><span>${escapeHtml(profile.nickname)}</span></nav>

    <article class="type-detail">
      <header class="type-hero">
        <div class="type-portrait">
          <img src="/guardians/${path}.webp" width="360" height="360" alt="${escapeHtml(profile.nickname)} ${escapeHtml(profile.animal)} 수호신" />
        </div>
        <div class="type-intro">
          <p class="eyebrow">JOBBTI ${path} · ${escapeHtml(profile.ganzhiKo)} · ${element.label}</p>
          <h1>${escapeHtml(profile.nickname)}</h1>
          <p class="character-line">“${escapeHtml(profile.copy)}”</p>
          <p class="type-summary">${escapeHtml(character.summary_og)}</p>
          <ul class="keyword-list">${character.keywords.map(keyword => `<li>#${escapeHtml(keyword)}</li>`).join('')}</ul>
          <a class="primary-cta" href="/?utm_source=organic&amp;utm_medium=seo&amp;utm_campaign=jobbti_type&amp;utm_content=${path}">내 잡BTI도 무료로 찾기</a>
        </div>
      </header>

      <section class="answer-box" aria-labelledby="one-line-answer">
        <p class="eyebrow">결론부터</p>
        <h2 id="one-line-answer">${escapeHtml(profile.nickname)}는 어떤 직장인인가요?</h2>
        <p>${escapeHtml(character.identity)}</p>
      </section>

      <div class="insight-grid">
        <section class="insight-card strength">
          <p class="eyebrow">잘하는 것</p>
          <h2>성과로 이어지는 강점</h2>
          <p>${escapeHtml(character.strength)}</p>
        </section>
        <section class="insight-card blind-spot">
          <p class="eyebrow">놓치기 쉬운 것</p>
          <h2>강점이 과해질 때의 맹점</h2>
          <p>${escapeHtml(character.blind_spot)}</p>
        </section>
      </div>

      <section class="environment-section">
        <div>
          <p class="eyebrow">WORK ENVIRONMENT</p>
          <h2>${escapeHtml(profile.nickname)}의 강점이<br />잘 살아나는 환경</h2>
          <span class="element-chip">${element.label} · ${element.name}</span>
        </div>
        <p>${escapeHtml(character.best_environment)}</p>
      </section>

      <aside class="method-note">
        <strong>이 해석은 이렇게 활용하세요</strong>
        <p>잡BTI는 나를 한 가지 성격으로 단정하기보다, 직장에서 반복되는 선택을 돌아보기 위한 출발점입니다. 이직·협상·잔류를 결정할 때는 실제 조건과 경험을 함께 비교하세요.</p>
      </aside>
    </article>

    <section class="related-section" aria-labelledby="related-types">
      <p class="eyebrow">함께 보기</p>
      <h2 id="related-types">다른 잡BTI 유형</h2>
      <ol class="type-grid related-grid">${related}</ol>
      <a class="text-cta" href="/jobbti/">60가지 유형 모두 보기 →</a>
    </section>

    <section class="bottom-cta">
      <p class="eyebrow">60마리 중 내 수호신은?</p>
      <h2>남의 유형 말고,<br />이제 내 잡BTI를 확인해보세요</h2>
      <a class="primary-cta" href="/?utm_source=organic&amp;utm_medium=seo&amp;utm_campaign=jobbti_bottom&amp;utm_content=${path}">내 수호신 뽑아보기</a>
      <small class="cta-note">생년월일 입력 후 바로 확인 · 무료</small>
    </section>
  </main>
  ${siteFooter()}
</body>
</html>`;
}

const CSS = `:root {
  --page: #faf8f2;
  --paper: #fffdf8;
  --ink: #2f3732;
  --muted: #68716b;
  --line: #deddd5;
  --accent: #66866e;
  --accent-soft: #e9f0e8;
  --display: "Arial Rounded MT Bold", "Pretendard", "Apple SD Gothic Neo", sans-serif;
  --body: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; color: var(--ink); background: var(--page); font-family: var(--body); word-break: keep-all; }
body[data-element="fire"] { --accent: #bd6659; --accent-soft: #f7e8e3; }
body[data-element="earth"] { --accent: #a17b46; --accent-soft: #f3ead9; }
body[data-element="metal"] { --accent: #6e7885; --accent-soft: #e9edf1; }
body[data-element="water"] { --accent: #557c91; --accent-soft: #e4eef2; }
a { color: inherit; }
.site-header { min-height: 68px; padding: 0 28px; border-bottom: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between; background: rgba(250,248,242,.94); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); }
.brand { text-decoration: none; font-family: var(--display); font-weight: 900; letter-spacing: -.04em; }
.brand span { margin-left: 8px; color: var(--accent); font-size: 12px; letter-spacing: 0; }
.site-header nav { display: flex; gap: 18px; align-items: center; font-size: 14px; }
.site-header nav a { text-decoration: none; }
.header-cta { color: #fff; background: var(--ink); border-radius: 999px; padding: 10px 16px; font-weight: 800; }
main { max-width: 1120px; margin: 0 auto; padding: 0 28px 96px; }
.breadcrumbs { display: flex; gap: 8px; align-items: center; padding: 24px 0; color: var(--muted); font-size: 13px; }
.breadcrumbs a { text-underline-offset: 3px; }
.eyebrow { margin: 0 0 12px; color: var(--accent); font-weight: 900; font-size: 12px; letter-spacing: .09em; }
h1, h2, h3 { font-family: var(--display); letter-spacing: -.045em; }
h1 { font-size: clamp(42px, 6vw, 72px); line-height: 1.08; margin: 0; }
h2 { font-size: clamp(28px, 4vw, 42px); line-height: 1.2; margin: 0; }
h3 { font-size: 20px; margin: 12px 0 8px; }
p { line-height: 1.75; }
.hub-hero { min-height: 610px; display: grid; grid-template-columns: 1.2fr .8fr; align-items: center; gap: 36px; padding: 50px 0 86px; }
.hub-hero h1 em { color: var(--accent); font-style: normal; }
.hero-copy { max-width: 620px; margin: 24px 0 30px; color: var(--muted); font-size: 18px; }
.primary-cta { display: inline-flex; justify-content: center; align-items: center; min-height: 52px; padding: 0 24px; color: #fff; background: var(--accent); border-radius: 14px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 24px rgba(47,55,50,.12); }
.cta-note { display: block; margin-top: 12px; color: var(--muted); font-size: 12px; }
.hero-characters { min-height: 390px; position: relative; }
.hero-characters::before { content: ""; position: absolute; inset: 30px 10px; border-radius: 50%; background: var(--accent-soft); filter: blur(2px); }
.hero-characters img { position: absolute; object-fit: contain; filter: drop-shadow(0 22px 20px rgba(47,55,50,.15)); }
.hero-characters img:first-child { width: 76%; height: auto; right: 0; top: 0; }
.hero-characters img:last-child { width: 50%; height: auto; left: 0; bottom: 0; }
.explain-section, .types-section, .faq-section, .related-section { padding: 88px 0; border-top: 1px solid var(--line); }
.feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 42px; }
.feature-grid article { padding: 28px; background: var(--paper); border: 1px solid var(--line); border-radius: 22px; }
.feature-grid article > span { color: var(--accent); font-weight: 900; }
.feature-grid p, .section-lead { color: var(--muted); }
.type-grid { list-style: none; padding: 0; margin: 34px 0 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.type-card a { min-height: 270px; padding: 22px; display: flex; flex-direction: column; align-items: flex-start; background: var(--paper); border: 1px solid var(--line); border-radius: 20px; text-decoration: none; transition: transform .18s ease, border-color .18s ease; }
.type-card a:hover, .type-card a:focus-visible { transform: translateY(-3px); border-color: var(--accent); outline: none; }
.type-card img { align-self: center; object-fit: contain; margin-bottom: 8px; }
.type-number { color: var(--accent); font-size: 10px; font-weight: 900; letter-spacing: .08em; }
.type-card strong { margin-top: 5px; font-family: var(--display); font-size: 20px; letter-spacing: -.03em; }
.type-card small { display: block; margin-top: 8px; color: var(--muted); line-height: 1.5; }
.faq-section details { padding: 22px 0; border-bottom: 1px solid var(--line); }
.faq-section summary { cursor: pointer; font-size: 18px; font-weight: 800; }
.faq-section details p { color: var(--muted); max-width: 760px; }
.type-detail { padding-top: 18px; }
.type-hero { min-height: 520px; display: grid; grid-template-columns: .85fr 1.15fr; align-items: center; gap: 64px; padding: 32px 0 82px; }
.type-portrait { aspect-ratio: 1; display: grid; place-items: center; border-radius: 50%; background: var(--accent-soft); }
.type-portrait img { width: 92%; height: 92%; object-fit: contain; filter: drop-shadow(0 22px 18px rgba(47,55,50,.12)); }
.character-line { margin: 18px 0 0; color: var(--accent); font-size: 18px; font-weight: 800; }
.type-summary { max-width: 600px; margin: 18px 0 22px; color: var(--muted); font-size: 21px; font-weight: 700; }
.keyword-list { list-style: none; padding: 0; margin: 0 0 30px; display: flex; flex-wrap: wrap; gap: 8px; }
.keyword-list li, .element-chip { padding: 7px 11px; color: var(--accent); background: var(--accent-soft); border-radius: 999px; font-size: 13px; font-weight: 800; }
.answer-box { padding: 48px; background: var(--ink); color: #fff; border-radius: 28px; }
.answer-box .eyebrow { color: #c7dccb; }
.answer-box p:last-child { max-width: 850px; margin-bottom: 0; color: rgba(255,255,255,.78); font-size: 17px; }
.insight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 18px 0; }
.insight-card { padding: 42px; background: var(--paper); border: 1px solid var(--line); border-radius: 28px; }
.insight-card p:last-child { color: var(--muted); }
.blind-spot { background: #f5f1eb; }
.environment-section { display: grid; grid-template-columns: .8fr 1.2fr; gap: 60px; align-items: start; padding: 58px 48px; background: var(--accent-soft); border-radius: 28px; }
.environment-section > p { margin: 0; color: #49544d; font-size: 17px; }
.element-chip { display: inline-block; margin-top: 20px; background: rgba(255,255,255,.7); }
.method-note { margin: 22px 0 88px; padding: 24px 28px; border-left: 4px solid var(--accent); background: var(--paper); }
.method-note p { margin-bottom: 0; color: var(--muted); }
.related-grid { grid-template-columns: repeat(3, 1fr); }
.text-cta { display: inline-block; margin-top: 24px; color: var(--accent); font-weight: 900; text-underline-offset: 4px; }
.bottom-cta { margin-top: 30px; padding: 74px 28px; border-radius: 30px; background: var(--ink); color: #fff; text-align: center; }
.bottom-cta .primary-cta { margin-top: 28px; }
.bottom-cta .cta-note { color: rgba(255,255,255,.6); }
.seo-footer { padding: 42px max(28px, calc((100vw - 1064px) / 2)); background: #ece9df; color: var(--muted); font-size: 13px; }
.seo-footer p { max-width: 760px; margin: 5px 0; }
@media (max-width: 820px) {
  .site-header { padding: 0 18px; }
  .site-header nav > a:first-child { display: none; }
  main { padding: 0 18px 70px; }
  .hub-hero { min-height: auto; grid-template-columns: 1fr; padding: 32px 0 70px; }
  .hero-characters { min-height: 310px; order: -1; }
  .hero-characters img:first-child { width: 65%; }
  .hero-characters img:last-child { width: 42%; left: 8%; }
  .feature-grid, .insight-grid, .environment-section { grid-template-columns: 1fr; }
  .type-grid { grid-template-columns: repeat(2, 1fr); }
  .type-hero { grid-template-columns: 1fr; gap: 34px; padding-bottom: 58px; }
  .type-portrait { max-width: 380px; width: 100%; margin: 0 auto; }
  .answer-box, .insight-card, .environment-section { padding: 30px 24px; }
  .environment-section { gap: 28px; }
}
@media (max-width: 480px) {
  .brand span { display: none; }
  .header-cta { padding: 9px 12px; font-size: 12px; }
  h1 { font-size: 39px; }
  .hero-copy, .type-summary { font-size: 17px; }
  .type-grid, .related-grid { grid-template-columns: 1fr; }
  .type-card a { min-height: 190px; display: grid; grid-template-columns: 96px 1fr; grid-template-rows: auto auto 1fr; column-gap: 16px; align-items: center; }
  .type-card img { grid-row: 1 / 4; width: 96px; height: 96px; margin: 0; }
  .type-card small { margin-top: 3px; }
  .explain-section, .types-section, .faq-section, .related-section { padding: 66px 0; }
}`;

async function writeText(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function main() {
  const profiles = await loadProfiles();
  const charactersById = new Map(GUARDIAN_CHARACTERS.map(character => [character.id, character]));
  if (charactersById.size !== 60) {
    throw new Error(`free_engine_characters.js에서 60개 해설을 읽어야 하지만 ${charactersById.size}개를 찾았습니다.`);
  }

  for (const profile of profiles) {
    const id = guardianIdBySequence(profile.sequence);
    if (!charactersById.has(id)) throw new Error(`${profile.sequence}번 수호신 ${id}의 긴 해설이 없습니다.`);
  }

  await writeText(join(JOBBTI_DIR, 'jobbti.css'), CSS);
  await writeText(join(JOBBTI_DIR, 'index.html'), renderHub(profiles, charactersById));

  for (const profile of profiles) {
    const character = charactersById.get(guardianIdBySequence(profile.sequence));
    await writeText(
      join(JOBBTI_DIR, 'types', sequencePath(profile.sequence), 'index.html'),
      renderTypePage(profile, character, profiles, charactersById),
    );
  }

  const sitemapUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/jobbti/`,
    ...profiles.map(profile => `${SITE_URL}/jobbti/types/${sequencePath(profile.sequence)}/`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeText(join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
  await writeText(join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nAllow: /api/share-page/\nAllow: /api/share-card/\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`잡BTI 허브 1개와 유형 페이지 ${profiles.length}개를 생성했습니다.`);
}

await main();
