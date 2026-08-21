// 60갑자 수호신 공유 데이터 — 원본: job_saju_codex_handoff/src/utils/guardianProfiles.ts + guardianAssets.ts
const GAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ELEMENT_BY_GAN_INDEX = ['wood', 'fire', 'earth', 'metal', 'water'];
const ELEMENT_LABEL = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)'
};
function guardianIdBySequence(sequence) {
  const i = sequence - 1;
  return GAN_HANJA[i % GAN_HANJA.length] + ZHI_HANJA[i % ZHI_HANJA.length];
}
function guardianElement(id) {
  const ganIndex = GAN_HANJA.indexOf(id.charAt(0));
  if (ganIndex < 0) return 'wood';
  return ELEMENT_BY_GAN_INDEX[Math.floor(ganIndex / 2)];
}
const PROFILES = [
  { sequence: 1, ganzhiKo: '갑자', animal: '쥐', animalEmoji: '🐭', nickname: '저지르쥐', copy: '기회는 남들보다 먼저 채가는데, 뛰어가다 씨앗을 다 흘리고 온다.' },
  { sequence: 2, ganzhiKo: '을축', animal: '소', animalEmoji: '🐮', nickname: '조금늦소', copy: '매일 조금씩 자라긴 하는데, 출발만큼은 늘 남들보다 조금 늦소.' },
  { sequence: 3, ganzhiKo: '병인', animal: '호랑이', animalEmoji: '🐯', nickname: '센척호랑이', copy: '일단 크게 나서긴 하는데, 꼬리는 이미 방구석에 가고 싶어 한다.' },
  { sequence: 4, ganzhiKo: '정묘', animal: '토끼', animalEmoji: '🐰', nickname: '볼빨간토끼', copy: '분위기 하나는 확실히 띄우는데, 칭찬 한마디에 귀부터 새빨개진다.' },
  { sequence: 5, ganzhiKo: '무진', animal: '용', animalEmoji: '🐲', nickname: '일단크게용', copy: '작은 일 하나에도 일단 큰 그림부터 그려놓고 시작해용.' },
  { sequence: 6, ganzhiKo: '기사', animal: '뱀', animalEmoji: '🐍', nickname: '한번더뱀', copy: '확인했고 또 확인했는데, 그래도 혹시 몰라 한 번 더 본다.' },
  { sequence: 7, ganzhiKo: '경오', animal: '말', animalEmoji: '🐴', nickname: '앞만보는말', copy: '목표만 보이면 냅다 달리는데, 신나서 목적지를 지나쳐버릴 때도 있다.' },
  { sequence: 8, ganzhiKo: '신미', animal: '양', animalEmoji: '🐑', nickname: '결국양보양', copy: '협상은 기가 막히게 하는데, 마지막엔 결국 자기 몫을 양보한다.' },
  { sequence: 9, ganzhiKo: '임신', animal: '원숭이', animalEmoji: '🐵', nickname: '아이디어숭이', copy: '방법은 이미 열두 개나 생각했는데, 정작 뭘 하던 중인지는 까먹었다.' },
  { sequence: 10, ganzhiKo: '계유', animal: '닭', animalEmoji: '🐔', nickname: '퇴근알람닭', copy: '퇴근 시간만큼은 절대 안 놓치는데, 그걸 위한 알람이 무려 다섯 개다.' },
  { sequence: 11, ganzhiKo: '갑술', animal: '개', animalEmoji: '🐶', nickname: '앞장멍', copy: '주인을 이끌겠다고 먼저 뛰었는데, 신나서 너무 멀리 가버렸다.' },
  { sequence: 12, ganzhiKo: '을해', animal: '돼지', animalEmoji: '🐷', nickname: '낮잠돼지', copy: '천천히 키우면 된다면서, 새싹 옆에서 본인이 먼저 낮잠 든다.' },
  { sequence: 13, ganzhiKo: '병자', animal: '쥐', animalEmoji: '🐭', nickname: '무대체질이쥐', copy: '기회만 보이면 일단 무대 중앙으로 튀어나가고 본다.' },
  { sequence: 14, ganzhiKo: '정축', animal: '소', animalEmoji: '🐮', nickname: '부끄럽소', copy: '조용히 오래 빛나는 편인데, 칭찬 한마디에 뿔까지 새빨개졌소.' },
  { sequence: 15, ganzhiKo: '무인', animal: '호랑이', animalEmoji: '🐯', nickname: '허당호랑이', copy: '앞은 내가 막는다며 무서운 표정을 짓는데, 사실 하나도 안 무섭다.' },
  { sequence: 16, ganzhiKo: '기묘', animal: '토끼', animalEmoji: '🐰', nickname: '쿠션토끼', copy: '남들 쉬라고 쿠션까지 챙겨주다가, 정작 본인이 제일 먼저 지친다.' },
  { sequence: 17, ganzhiKo: '경진', animal: '용', animalEmoji: '🐲', nickname: '별잡이용', copy: '작은 성과 하나도 별처럼 번쩍 들어 올리고는 한참 뿌듯해한다.' },
  { sequence: 18, ganzhiKo: '신사', animal: '뱀', animalEmoji: '🐍', nickname: '싹둑뱀', copy: '필요 없는 건 확실히 잘라내는데, 결정하고도 세 번은 다시 본다.' },
  { sequence: 19, ganzhiKo: '임오', animal: '말', animalEmoji: '🐴', nickname: '왔다갔다말', copy: '길이 막히면 바로 방향을 트는데, 가끔 본인도 어디 가는지 모른다.' },
  { sequence: 20, ganzhiKo: '계미', animal: '양', animalEmoji: '🐑', nickname: '꾸벅양', copy: '주인을 쉬게 해주려다가, 정작 본인이 먼저 꾸벅 잠들었다.' },
  { sequence: 21, ganzhiKo: '갑신', animal: '원숭이', animalEmoji: '🐵', nickname: '실험숭이', copy: '새 방법은 일단 다 해보는데, 그 와중에 벌여놓은 일이 너무 많다.' },
  { sequence: 22, ganzhiKo: '을유', animal: '닭', animalEmoji: '🐔', nickname: '체크닭', copy: '하루 한 칸씩 야무지게 채우다가, 체크 하나 빠지면 하루 종일 신경 쓴다.' },
  { sequence: 23, ganzhiKo: '병술', animal: '개', animalEmoji: '🐶', nickname: '응원멍', copy: '주인 응원하러 왔다가, 정작 본인이 제일 신나버렸다.' },
  { sequence: 24, ganzhiKo: '정해', animal: '돼지', animalEmoji: '🐷', nickname: '금방친해돼지', copy: '금방 친해지는 건 좋은데, 거리 두는 법은 그새 또 잊어버렸다.' },
  { sequence: 25, ganzhiKo: '무자', animal: '쥐', animalEmoji: '🐭', nickname: '짐백개쥐', copy: '혹시 몰라 챙기고 또 챙기다, 결국 짐이 백 개가 되어버렸다.' },
  { sequence: 26, ganzhiKo: '기축', animal: '소', animalEmoji: '🐮', nickname: '조금만더소', copy: '쉴 시간이 됐는데도, 딱 이것만 하고 쉰다는 말을 벌써 세 번째 한다.' },
  { sequence: 27, ganzhiKo: '경인', animal: '호랑이', animalEmoji: '🐯', nickname: '쫄보호랑이', copy: '결정만 하면 누구보다 세게 밀어붙이는데, 결정 전엔 혼자 제일 쫀다.' },
  { sequence: 28, ganzhiKo: '신묘', animal: '토끼', animalEmoji: '🐰', nickname: '1mm토끼', copy: '남들은 절대 못 보는 1mm 차이를 기어이 발견하고, 결국 고치고야 만다.' },
  { sequence: 29, ganzhiKo: '임진', animal: '용', animalEmoji: '🐲', nickname: '저멀리보여용', copy: '흐름은 저 멀리까지 미리 다 읽는데, 정작 오늘 할 일은 깜빡해용.' },
  { sequence: 30, ganzhiKo: '계사', animal: '뱀', animalEmoji: '🐍', nickname: '슬쩍뱀', copy: '눈치껏 빠져나오는 건 천재급인데, 가끔 너무 잘 숨어서 아무도 못 찾는다.' },
  { sequence: 31, ganzhiKo: '갑오', animal: '말', animalEmoji: '🐴', nickname: '출발말', copy: '준비됐냐고 묻기도 전에, 이미 저 멀리 뛰어가고 있다.' },
  { sequence: 32, ganzhiKo: '을미', animal: '양', animalEmoji: '🐑', nickname: '같이양', copy: '모두 챙겨 함께 가려다가, 정작 자기 차례는 자꾸 까먹는양.' },
  { sequence: 33, ganzhiKo: '병신', animal: '원숭이', animalEmoji: '🐵', nickname: '불꽃숭이', copy: '아이디어는 빵빵 터지는데, 그 와중에 중요한 얘기도 같이 새어나간다.' },
  { sequence: 34, ganzhiKo: '정유', animal: '닭', animalEmoji: '🐔', nickname: '무대닭', copy: '무대 위에서는 완전 반짝이는데, 올라가기 전까지 혼자 열 번은 연습한다.' },
  { sequence: 35, ganzhiKo: '무술', animal: '개', animalEmoji: '🐶', nickname: '철벽멍', copy: '별일 아닌 알림에도, 주인을 지키겠다며 일단 몸부터 막아선다.' },
  { sequence: 36, ganzhiKo: '기해', animal: '돼지', animalEmoji: '🐷', nickname: '간식어딨돼지', copy: '잘 먹고 잘 쉬는 게 최고라면서, 정작 숨긴 간식 위치는 또 까먹었다.' },
  { sequence: 37, ganzhiKo: '경자', animal: '쥐', animalEmoji: '🐭', nickname: '짤랑쥐', copy: '10원도 허투루 안 쓰는데, 그거 고민하는 데 시간은 또 아깝게 쓴다.' },
  { sequence: 38, ganzhiKo: '신축', animal: '소', animalEmoji: '🐮', nickname: '차곡차곡채웠소', copy: '느려 보여도 하나씩 착실히 쌓아서, 결국 통장을 꽉 채웠소.' },
  { sequence: 39, ganzhiKo: '임인', animal: '호랑이', animalEmoji: '🐯', nickname: '무데뽀호랑이', copy: '막히면 거침없이 새 길을 뚫는데, 첫걸음에 꼭 물웅덩이를 밟는다.' },
  { sequence: 40, ganzhiKo: '계묘', animal: '토끼', animalEmoji: '🐰', nickname: '인사폭탄토끼', copy: '퇴근은 누구보다 하고 싶은데, 인사를 세 번은 하고서야 겨우 문을 나선다.' },
  { sequence: 41, ganzhiKo: '갑진', animal: '용', animalEmoji: '🐲', nickname: '계획만은커용', copy: '몸은 아직 작은데, 펼쳐놓은 계획만큼은 자기보다 훨씬 커용.' },
  { sequence: 42, ganzhiKo: '을사', animal: '뱀', animalEmoji: '🐍', nickname: '결정장애뱀', copy: '좋은 길을 너무 오래 고민하다가, 결국 출발 타이밍을 놓쳐버린다.' },
  { sequence: 43, ganzhiKo: '병오', animal: '말', animalEmoji: '🐴', nickname: '인싸말', copy: '분위기는 단숨에 끌어올리는데, 정작 체력이 마음을 못 따라온다.' },
  { sequence: 44, ganzhiKo: '정미', animal: '양', animalEmoji: '🐑', nickname: '온도양', copy: '사람들 사이는 따뜻하게 만드는데, 분위기가 싸해지면 본인이 제일 초조하양.' },
  { sequence: 45, ganzhiKo: '무신', animal: '원숭이', animalEmoji: '🐵', nickname: '수습숭이', copy: '문제를 정리하러 왔다가, 옆에서 또 재미있는 걸 발견하고 만다.' },
  { sequence: 46, ganzhiKo: '기유', animal: '닭', animalEmoji: '🐔', nickname: '5분닭', copy: '계획이 5분만 밀려도, 세상이 조금 잘못된 것 같은 기분이 든다.' },
  { sequence: 47, ganzhiKo: '경술', animal: '개', animalEmoji: '🐶', nickname: '내몫멍', copy: '내 몫은 당당히 지키는데, 그 와중에 간식까지 협상 테이블에 올린다.' },
  { sequence: 48, ganzhiKo: '신해', animal: '돼지', animalEmoji: '🐷', nickname: '짠돌이돼지', copy: '돈은 야무지게 잘 모으는데, 맛있는 걸 만나면 계획이 살짝 흔들린다.' },
  { sequence: 49, ganzhiKo: '임자', animal: '쥐', animalEmoji: '🐭', nickname: '레이더쥐', copy: '변화는 누구보다 빨리 알아채는데, 작은 소리에도 일단 놀라고 본다.' },
  { sequence: 50, ganzhiKo: '계축', animal: '소', animalEmoji: '🐮', nickname: '말하다말고잤소', copy: '천천히 쉬면 다 괜찮아진다더니, 말 끝나기도 전에 잠들었소.' },
  { sequence: 51, ganzhiKo: '갑인', animal: '호랑이', animalEmoji: '🐯', nickname: '새싹호랑이', copy: '새 길은 내가 연다며 앞장서지만, 꼬리는 이미 바짝 긴장한 채다.' },
  { sequence: 52, ganzhiKo: '을묘', animal: '토끼', animalEmoji: '🐰', nickname: '예민보스토끼', copy: '작은 가능성도 정성껏 키우는데, 잎 하나만 시들어도 하루 종일 신경 쓰인다.' },
  { sequence: 53, ganzhiKo: '병진', animal: '용', animalEmoji: '🐲', nickname: '얘기하다커져용', copy: '꿈을 설명하다 보면, 이야기가 어느새 세계정복까지 커져용.' },
  { sequence: 54, ganzhiKo: '정사', animal: '뱀', animalEmoji: '🐍', nickname: '말빨뱀', copy: '분위기는 말 한마디로 확 바꾸는데, 멋 부리다 가끔 혀가 꼬인다.' },
  { sequence: 55, ganzhiKo: '무오', animal: '말', animalEmoji: '🐴', nickname: '존버말', copy: '다들 지쳐도 끝까지 버티는데, 쉬는 날에도 습관처럼 출발 자세부터 잡는다.' },
  { sequence: 56, ganzhiKo: '기미', animal: '양', animalEmoji: '🐑', nickname: '평화양', copy: '싸움은 기막히게 잘 말리는데, 정작 본인이 먼저 울먹인다양.' },
  { sequence: 57, ganzhiKo: '경신', animal: '원숭이', animalEmoji: '🐵', nickname: '지름길숭이', copy: '가장 빠른 길을 찾다가, 가끔 제일 복잡한 길로 들어가버린다.' },
  { sequence: 58, ganzhiKo: '신유', animal: '닭', animalEmoji: '🐔', nickname: '메달닭', copy: '작은 칭찬도 놓치지 않고, 마음속 진열장에 야무지게 모아둔다.' },
  { sequence: 59, ganzhiKo: '임술', animal: '개', animalEmoji: '🐶', nickname: '퇴근멍', copy: '지친 주인을 기다려주다가, 현관 앞에서 먼저 잠들어버렸다.' },
  { sequence: 60, ganzhiKo: '계해', animal: '돼지', animalEmoji: '🐷', nickname: '쿨쿨돼지', copy: '주인의 칼퇴를 지켜주려 마법까지 쓰다가, 정작 본인이 먼저 잠든다.' }
];
function guardianImageUrl(sequence, base) {
  const b = base ?? '';
  return `${b}/assets/guardians/${String(sequence).padStart(2, '0')}.webp`;
}
function getGuardian(sequence, assetBase) {
  const p = PROFILES[sequence - 1];
  const id = guardianIdBySequence(sequence);
  const element = guardianElement(id);
  return {
    id,
    sequence,
    imageUrl: guardianImageUrl(sequence, assetBase),
    nickname: p.nickname,
    copy: p.copy,
    ganzhiKo: p.ganzhiKo,
    animal: p.animal,
    animalEmoji: p.animalEmoji,
    element,
    elementLabel: ELEMENT_LABEL[element]
  };
}
function listGuardians(assetBase) {
  return PROFILES.map(p => getGuardian(p.sequence, assetBase));
}

// --- 케미 계산 (원본: guardianChemistry.ts) ---
const GAN_HAP = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
const ZHI_HAP = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
const ZHI_CHUNG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
const GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
const RELATION_COPY = {
  zhi_hap: '서로의 빈틈을 채우는 조합',
  gan_hap: '결이 잘 맞아 손발이 붙는 조합',
  element_flow: '한쪽이 밀어주면 다른 쪽이 자라는 조합',
  same_element: '비슷한 방식으로 일하는 조합',
  zhi_chung: '둘 다 자기 방식이 확실한 조합',
  element_clash: '속도와 기준이 자주 부딪히는 조합',
  neutral: '무난하게 각자 몫을 하는 조합'
};
const DOMINANT_ORDER = ['zhi_chung', 'zhi_hap', 'gan_hap', 'element_clash', 'element_flow', 'same_element'];
function calcChemistry(aId, bId) {
  const aStem = aId.slice(0, 1), aBranch = aId.slice(1, 2);
  const bStem = bId.slice(0, 1), bBranch = bId.slice(1, 2);
  const aElement = guardianElement(aId), bElement = guardianElement(bId);
  const hasGanHap = GAN_HAP[aStem] === bStem;
  const hasZhiHap = ZHI_HAP[aBranch] === bBranch;
  const hasZhiChung = ZHI_CHUNG[aBranch] === bBranch;
  const hasFlow = GENERATES[aElement] === bElement || GENERATES[bElement] === aElement;
  const hasClash = CONTROLS[aElement] === bElement || CONTROLS[bElement] === aElement;
  const sameElement = aElement === bElement;
  let score = 50;
  if (hasGanHap) score += 18;
  if (hasZhiHap) score += 25;
  if (hasZhiChung) score -= 25;
  if (hasFlow) score += 8;
  if (hasClash) score -= 8;
  score = Math.max(0, Math.min(100, score));
  const present = new Set();
  if (hasZhiHap) present.add('zhi_hap');
  if (hasGanHap) present.add('gan_hap');
  if (hasFlow) present.add('element_flow');
  if (sameElement) present.add('same_element');
  if (hasZhiChung) present.add('zhi_chung');
  if (hasClash) present.add('element_clash');
  const dominantRelation = DOMINANT_ORDER.find(r => present.has(r)) ?? 'neutral';
  return { score, dominantRelation };
}
function chemistryCopy(relation) {
  return RELATION_COPY[relation] ?? RELATION_COPY.neutral;
}

/** 자기 자신을 뺀 59종 중 찰떡(best)·티격태격(worst) 한 쌍을 고른다. */
function findChemistryExtremes(selfId, assetBase) {
  const all = Array.from({ length: 60 }, (_, i) => guardianIdBySequence(i + 1)).filter(id => id !== selfId);
  const scored = all.map(id => ({ id, ...calcChemistry(selfId, id) }));
  const best = [...scored].sort((a, b) => b.score - a.score)[0];
  const worst = [...scored].sort((a, b) => a.score - b.score)[0];
  const bySeq = id => {
    const g = Array.from({ length: 60 }, (_, i) => i + 1).find(s => guardianIdBySequence(s) === id);
    return getGuardian(g, assetBase);
  };
  return {
    best: { ...best, guardian: bySeq(best.id) },
    worst: { ...worst, guardian: bySeq(worst.id) }
  };
}
