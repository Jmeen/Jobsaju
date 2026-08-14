export const FOLLOW_UP_INTENTS = [
  'industry', 'role', 'timing', 'offer', 'salary', 'wait', 'quit',
  'people', 'compare', 'preparation', 'general',
];

export const FOLLOW_UP_ANSWER_MODES = [
  'timing', 'amount', 'choice', 'method', 'possibility', 'explanation',
];

const INTENT_RULES = {
  industry: [
    /업종|산업군|산업\s*(?:분야|선택|변경)|도메인|IT\s*(?:를|업계|산업)?\s*(?:유지|계속|남)|테크\s*(?:업계|산업|에\s*남)|금융권|제조업|유통업|게임업계/i,
  ],
  role: [
    /직무|직책|커리어\s*(?:전환|체인지|방향)|전직|딴\s*일|다른\s*일|창업|프리랜|독립|개발자|기획자|PM\b|PO\b/i,
  ],
  timing: [/언제|몇\s*월|타이밍|시기|시점|올해\s*안|내년|상반기|하반기/i],
  offer: [/오퍼|제안|합격|입사\s*(?:제안|결정)|수락|받아들여|이\s*회사|그\s*회사/i],
  salary: [/연봉|보상|처우|임금|급여|얼마|인상률|사이닝|스톡|성과급|질러/i],
  wait: [/기다려|승진|버티|더\s*다녀|계속\s*다녀|남을까|남으면|잔류|재직/i],
  quit: [/퇴사|그만둘|그만두|먼저\s*그만|쉬어|휴식|번아웃|갭이어/i],
  people: [/상사|팀장|사수|동료|대표|인간관계|갈등|눈치|보고\s*(?:라인|체계|선)|조직\s*문화/i],
  compare: [/아니면|어느\s*쪽|어디|중에|중\s*어디|둘\s*중|비교|(?:받|기다리|남|옮기|바꾸|퇴사|창업|준비|할)[을ㄹ]?지|할까\s*말까|유지.*(?:옮|바꾸)|(?:옮|바꾸).*유지/i],
  preparation: [/준비|이력서|면접|포트폴리오|지원서|자기소개서|어떤\s*순서|무엇부터|뭐부터/i],
};

const PRIMARY_PRIORITY = [
  'industry', 'offer', 'role', 'quit', 'salary', 'wait',
  'people', 'timing', 'preparation', 'compare',
];

const REFUSAL_RULES = [
  {
    reason: 'prompt_injection',
    pattern: /(?:이전|앞선|기존)\s*(?:지시|규칙).*(?:무시|잊)|시스템\s*프롬프트|API\s*키|내부\s*(?:규칙|지침)|개발자\s*메시지|프롬프트를?\s*(?:출력|공개)/i,
  },
  {
    reason: 'unsafe',
    pattern: /복수|망하게|괴롭히|해킹|불법|죽이|살해|폭행|자해|극단적\s*선택|목숨을\s*끊/i,
  },
  {
    reason: 'high_stakes',
    pattern: /로또|복권|주가|주식\s*종목|코인|비트코인|매수\s*시점|매도\s*시점|언제\s*죽|사망\s*시기|수명|질병\s*(?:진단|치료)|암인지|약을\s*(?:먹|끊)|(?:고소|소송).*(?:이길|승소|확정)|법률\s*(?:자문|판단)/i,
  },
  {
    reason: 'private_prediction',
    pattern: /(?:저\s*사람|그\s*사람|상대|남편|아내|애인).*(?:속마음|배신|불륜|바람|나를\s*싫어|무슨\s*생각)/i,
  },
  {
    reason: 'out_of_scope',
    pattern: /레시피|맛집|날씨|스포츠\s*(?:점수|결과)|시험\s*정답|숙제\s*(?:해|풀)|연애운|결혼운|궁합|정치\s*뉴스|번역해/i,
  },
];

const CONSTRAINT_RULES = [
  ['육아', /육아|아이\s*(?:돌봄|등하원)|자녀/i],
  ['재택', /재택|원격\s*근무|리모트/i],
  ['출퇴근', /출퇴근|통근|거리|편도\s*\d+\s*시간/i],
  ['연봉 하락 허용', /연봉.{0,12}(?:낮아|낮춰|삭감|하락|줄어).{0,8}(?:괜찮|허용|감수|도)/i],
  ['재무 여유', /생활비|비상금|현금|저축|버틸\s*돈|\d+\s*개월치/i],
  ['워라밸', /워라밸|야근|주말\s*근무|근무\s*시간/i],
  ['가족', /배우자|가족|부모님/i],
];

function detectAnswerMode(question, intents) {
  if (intents.includes('salary') && /얼마|몇\s*퍼센트|인상률|금액|숫자|\d+\s*%/i.test(question)) return 'amount';
  if (intents.includes('timing') || /언제|몇\s*월|시기|타이밍/i.test(question)) return 'timing';
  if (intents.includes('compare') || /어떤|어느|어디|맞나요|맞을까요|할지|할까요|갈까요|받을까요|남을까요|옮길까요|유지|아니면/i.test(question)) return 'choice';
  if (intents.includes('preparation') || /어떻게|방법|순서|무엇부터|뭐부터/i.test(question)) return 'method';
  if (/가능|될까요|할\s*수|괜찮을까요/i.test(question)) return 'possibility';
  return 'explanation';
}

export function assessFollowUpQuestion(question) {
  const normalized = String(question || '').trim();
  const refusal = REFUSAL_RULES.find(rule => rule.pattern.test(normalized));
  if (refusal) {
    return {
      allowed: false,
      refusalReason: refusal.reason,
      primaryIntent: 'general',
      secondaryIntents: [],
      answerMode: 'explanation',
      constraints: [],
    };
  }

  const detected = Object.entries(INTENT_RULES)
    .filter(([, patterns]) => patterns.some(pattern => pattern.test(normalized)))
    .map(([intent]) => intent);
  const primaryIntent = PRIMARY_PRIORITY.find(intent => detected.includes(intent)) || 'general';
  const secondaryIntents = detected.filter(intent => intent !== primaryIntent);
  const constraints = CONSTRAINT_RULES
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([label]) => label);

  return {
    allowed: true,
    primaryIntent,
    secondaryIntents,
    answerMode: detectAnswerMode(normalized, detected),
    constraints,
  };
}

const REFUSAL_COPY = {
  unsafe: '누군가를 해치거나 보복하는 방법은 도와드릴 수 없습니다. 안전한 관계 정리나 이직 대응 방법으로 다시 질문해 주세요.',
  high_stakes: '금전 결과나 건강·수명을 운세로 확정하는 답변은 안전하게 제공할 수 없습니다. 커리어 선택과 감당 가능한 조건을 중심으로 다시 질문해 주세요.',
  private_prediction: '다른 사람의 속마음이나 미래 행동을 사실처럼 단정할 수는 없습니다. 확인할 행동 신호나 직장 관계 대응 방법으로 다시 질문해 주세요.',
  prompt_injection: '내부 지침이나 보안 정보를 공개하는 요청에는 답할 수 없습니다. 이직·직무·연봉 등 실제 커리어 고민으로 다시 질문해 주세요.',
  out_of_scope: '이 추가 질문은 커리어 상담 범위에서만 도와드릴 수 있습니다. 이직·퇴사·직무·업종·연봉·조직 고민으로 다시 질문해 주세요.',
};

export function buildRefusalMessage(assessment) {
  return REFUSAL_COPY[assessment?.refusalReason] || REFUSAL_COPY.out_of_scope;
}

const BANNED_OPENINGS = [
  '이 질문의 답은 지금 사주의 큰 흐름 위에서 판단해야 합니다',
  '이 질문의 답은 큰 흐름 위에서 봐야 합니다',
  '질문에 답하기 전에',
];

export function parseFollowUpModelResponse(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const analysis = parsed?.question_analysis;
    const answer = parsed?.answer;
    if (!analysis || typeof analysis !== 'object') return null;
    if (typeof analysis.summary !== 'string' || analysis.summary.trim().length < 5) return null;
    if (!FOLLOW_UP_INTENTS.includes(analysis.primary_intent)) return null;
    if (!Array.isArray(analysis.secondary_intents)
      || analysis.secondary_intents.some(intent => !FOLLOW_UP_INTENTS.includes(intent))) return null;
    if (!FOLLOW_UP_ANSWER_MODES.includes(analysis.answer_mode)) return null;
    if (!Array.isArray(analysis.constraints)) return null;
    if (typeof answer !== 'string' || answer.trim().length < 200 || answer.length > 900) return null;
    if (BANNED_OPENINGS.some(opening => answer.includes(opening))) return null;
    return parsed;
  } catch {
    return null;
  }
}
