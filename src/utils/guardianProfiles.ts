// 60수호신의 별명·한 줄 카피. 캐릭터 기획 원본을 그대로 옮긴 것이다.
// free_engine_characters.js의 해설문(identity/strength/...)과 달리 이쪽은
// 60종이 각각 고유한 문장이라, 화면에 이름과 대사로 바로 쓴다.

export type GuardianProfile = {
  /** 60갑자 순번 (甲子=1 ~ 癸亥=60). 아트워크 파일명과 같다. */
  sequence: number;
  ganzhiKo: string;
  animal: string;
  /** 그림을 못 받았을 때 대신 쓰는 띠 이모지. */
  animalEmoji: string;
  nickname: string;
  /** 결과 화면에서 캐릭터 대사처럼 보여주는 한 줄. */
  copy: string;
};

export const GUARDIAN_PROFILES: readonly GuardianProfile[] = [
  { sequence: 1, ganzhiKo: '갑자', animal: '쥐', animalEmoji: '🐭', nickname: '저지르쥐', copy: '기회는 남들보다 먼저 채가는데, 뛰어가다 씨앗을 다 흘리고 온다.' }, // 甲子
  { sequence: 2, ganzhiKo: '을축', animal: '소', animalEmoji: '🐮', nickname: '조금늦소', copy: '매일 조금씩 자라긴 하는데, 출발만큼은 늘 남들보다 조금 늦소.' }, // 乙丑
  { sequence: 3, ganzhiKo: '병인', animal: '호랑이', animalEmoji: '🐯', nickname: '센척호랑이', copy: '일단 크게 나서긴 하는데, 꼬리는 이미 방구석에 가고 싶어 한다.' }, // 丙寅
  { sequence: 4, ganzhiKo: '정묘', animal: '토끼', animalEmoji: '🐰', nickname: '볼빨간토끼', copy: '분위기 하나는 확실히 띄우는데, 칭찬 한마디에 귀부터 새빨개진다.' }, // 丁卯
  { sequence: 5, ganzhiKo: '무진', animal: '용', animalEmoji: '🐲', nickname: '일단크게용', copy: '작은 일 하나에도 일단 큰 그림부터 그려놓고 시작해용.' }, // 戊辰
  { sequence: 6, ganzhiKo: '기사', animal: '뱀', animalEmoji: '🐍', nickname: '한번더뱀', copy: '확인했고 또 확인했는데, 그래도 혹시 몰라 한 번 더 본다.' }, // 己巳
  { sequence: 7, ganzhiKo: '경오', animal: '말', animalEmoji: '🐴', nickname: '앞만보는말', copy: '목표만 보이면 냅다 달리는데, 신나서 목적지를 지나쳐버릴 때도 있다.' }, // 庚午
  { sequence: 8, ganzhiKo: '신미', animal: '양', animalEmoji: '🐑', nickname: '결국양보양', copy: '협상은 기가 막히게 하는데, 마지막엔 결국 자기 몫을 양보한다.' }, // 辛未
  { sequence: 9, ganzhiKo: '임신', animal: '원숭이', animalEmoji: '🐵', nickname: '아이디어숭이', copy: '방법은 이미 열두 개나 생각했는데, 정작 뭘 하던 중인지는 까먹었다.' }, // 壬申
  { sequence: 10, ganzhiKo: '계유', animal: '닭', animalEmoji: '🐔', nickname: '퇴근알람닭', copy: '퇴근 시간만큼은 절대 안 놓치는데, 그걸 위한 알람이 무려 다섯 개다.' }, // 癸酉
  { sequence: 11, ganzhiKo: '갑술', animal: '개', animalEmoji: '🐶', nickname: '앞장멍', copy: '주인을 이끌겠다고 먼저 뛰었는데, 신나서 너무 멀리 가버렸다.' }, // 甲戌
  { sequence: 12, ganzhiKo: '을해', animal: '돼지', animalEmoji: '🐷', nickname: '낮잠돼지', copy: '천천히 키우면 된다면서, 새싹 옆에서 본인이 먼저 낮잠 든다.' }, // 乙亥
  { sequence: 13, ganzhiKo: '병자', animal: '쥐', animalEmoji: '🐭', nickname: '무대체질이쥐', copy: '기회만 보이면 일단 무대 중앙으로 튀어나가고 본다.' }, // 丙子
  { sequence: 14, ganzhiKo: '정축', animal: '소', animalEmoji: '🐮', nickname: '부끄럽소', copy: '조용히 오래 빛나는 편인데, 칭찬 한마디에 뿔까지 새빨개졌소.' }, // 丁丑
  { sequence: 15, ganzhiKo: '무인', animal: '호랑이', animalEmoji: '🐯', nickname: '허당호랑이', copy: '앞은 내가 막는다며 무서운 표정을 짓는데, 사실 하나도 안 무섭다.' }, // 戊寅
  { sequence: 16, ganzhiKo: '기묘', animal: '토끼', animalEmoji: '🐰', nickname: '쿠션토끼', copy: '남들 쉬라고 쿠션까지 챙겨주다가, 정작 본인이 제일 먼저 지친다.' }, // 己卯
  { sequence: 17, ganzhiKo: '경진', animal: '용', animalEmoji: '🐲', nickname: '별잡이용', copy: '작은 성과 하나도 별처럼 번쩍 들어 올리고는 한참 뿌듯해한다.' }, // 庚辰
  { sequence: 18, ganzhiKo: '신사', animal: '뱀', animalEmoji: '🐍', nickname: '싹둑뱀', copy: '필요 없는 건 확실히 잘라내는데, 결정하고도 세 번은 다시 본다.' }, // 辛巳
  { sequence: 19, ganzhiKo: '임오', animal: '말', animalEmoji: '🐴', nickname: '왔다갔다말', copy: '길이 막히면 바로 방향을 트는데, 가끔 본인도 어디 가는지 모른다.' }, // 壬午
  { sequence: 20, ganzhiKo: '계미', animal: '양', animalEmoji: '🐑', nickname: '꾸벅양', copy: '주인을 쉬게 해주려다가, 정작 본인이 먼저 꾸벅 잠들었다.' }, // 癸未
  { sequence: 21, ganzhiKo: '갑신', animal: '원숭이', animalEmoji: '🐵', nickname: '실험숭이', copy: '새 방법은 일단 다 해보는데, 그 와중에 벌여놓은 일이 너무 많다.' }, // 甲申
  { sequence: 22, ganzhiKo: '을유', animal: '닭', animalEmoji: '🐔', nickname: '체크닭', copy: '하루 한 칸씩 야무지게 채우다가, 체크 하나 빠지면 하루 종일 신경 쓴다.' }, // 乙酉
  { sequence: 23, ganzhiKo: '병술', animal: '개', animalEmoji: '🐶', nickname: '응원멍', copy: '주인 응원하러 왔다가, 정작 본인이 제일 신나버렸다.' }, // 丙戌
  { sequence: 24, ganzhiKo: '정해', animal: '돼지', animalEmoji: '🐷', nickname: '금방친해돼지', copy: '금방 친해지는 건 좋은데, 거리 두는 법은 그새 또 잊어버렸다.' }, // 丁亥
  { sequence: 25, ganzhiKo: '무자', animal: '쥐', animalEmoji: '🐭', nickname: '짐백개쥐', copy: '혹시 몰라 챙기고 또 챙기다, 결국 짐이 백 개가 되어버렸다.' }, // 戊子
  { sequence: 26, ganzhiKo: '기축', animal: '소', animalEmoji: '🐮', nickname: '조금만더소', copy: '쉴 시간이 됐는데도, 딱 이것만 하고 쉰다는 말을 벌써 세 번째 한다.' }, // 己丑
  { sequence: 27, ganzhiKo: '경인', animal: '호랑이', animalEmoji: '🐯', nickname: '쫄보호랑이', copy: '결정만 하면 누구보다 세게 밀어붙이는데, 결정 전엔 혼자 제일 쫀다.' }, // 庚寅
  { sequence: 28, ganzhiKo: '신묘', animal: '토끼', animalEmoji: '🐰', nickname: '1mm토끼', copy: '남들은 절대 못 보는 1mm 차이를 기어이 발견하고, 결국 고치고야 만다.' }, // 辛卯
  { sequence: 29, ganzhiKo: '임진', animal: '용', animalEmoji: '🐲', nickname: '저멀리보여용', copy: '흐름은 저 멀리까지 미리 다 읽는데, 정작 오늘 할 일은 깜빡해용.' }, // 壬辰
  { sequence: 30, ganzhiKo: '계사', animal: '뱀', animalEmoji: '🐍', nickname: '슬쩍뱀', copy: '눈치껏 빠져나오는 건 천재급인데, 가끔 너무 잘 숨어서 아무도 못 찾는다.' }, // 癸巳
  { sequence: 31, ganzhiKo: '갑오', animal: '말', animalEmoji: '🐴', nickname: '출발말', copy: '준비됐냐고 묻기도 전에, 이미 저 멀리 뛰어가고 있다.' }, // 甲午
  { sequence: 32, ganzhiKo: '을미', animal: '양', animalEmoji: '🐑', nickname: '같이양', copy: '모두 챙겨 함께 가려다가, 정작 자기 차례는 자꾸 까먹는양.' }, // 乙未
  { sequence: 33, ganzhiKo: '병신', animal: '원숭이', animalEmoji: '🐵', nickname: '불꽃숭이', copy: '아이디어는 빵빵 터지는데, 그 와중에 중요한 얘기도 같이 새어나간다.' }, // 丙申
  { sequence: 34, ganzhiKo: '정유', animal: '닭', animalEmoji: '🐔', nickname: '무대닭', copy: '무대 위에서는 완전 반짝이는데, 올라가기 전까지 혼자 열 번은 연습한다.' }, // 丁酉
  { sequence: 35, ganzhiKo: '무술', animal: '개', animalEmoji: '🐶', nickname: '철벽멍', copy: '별일 아닌 알림에도, 주인을 지키겠다며 일단 몸부터 막아선다.' }, // 戊戌
  { sequence: 36, ganzhiKo: '기해', animal: '돼지', animalEmoji: '🐷', nickname: '간식어딨돼지', copy: '잘 먹고 잘 쉬는 게 최고라면서, 정작 숨긴 간식 위치는 또 까먹었다.' }, // 己亥
  { sequence: 37, ganzhiKo: '경자', animal: '쥐', animalEmoji: '🐭', nickname: '짤랑쥐', copy: '10원도 허투루 안 쓰는데, 그거 고민하는 데 시간은 또 아깝게 쓴다.' }, // 庚子
  { sequence: 38, ganzhiKo: '신축', animal: '소', animalEmoji: '🐮', nickname: '차곡차곡채웠소', copy: '느려 보여도 하나씩 착실히 쌓아서, 결국 통장을 꽉 채웠소.' }, // 辛丑
  { sequence: 39, ganzhiKo: '임인', animal: '호랑이', animalEmoji: '🐯', nickname: '무데뽀호랑이', copy: '막히면 거침없이 새 길을 뚫는데, 첫걸음에 꼭 물웅덩이를 밟는다.' }, // 壬寅
  { sequence: 40, ganzhiKo: '계묘', animal: '토끼', animalEmoji: '🐰', nickname: '인사폭탄토끼', copy: '퇴근은 누구보다 하고 싶은데, 인사를 세 번은 하고서야 겨우 문을 나선다.' }, // 癸卯
  { sequence: 41, ganzhiKo: '갑진', animal: '용', animalEmoji: '🐲', nickname: '계획만은커용', copy: '몸은 아직 작은데, 펼쳐놓은 계획만큼은 자기보다 훨씬 커용.' }, // 甲辰
  { sequence: 42, ganzhiKo: '을사', animal: '뱀', animalEmoji: '🐍', nickname: '결정장애뱀', copy: '좋은 길을 너무 오래 고민하다가, 결국 출발 타이밍을 놓쳐버린다.' }, // 乙巳
  { sequence: 43, ganzhiKo: '병오', animal: '말', animalEmoji: '🐴', nickname: '인싸말', copy: '분위기는 단숨에 끌어올리는데, 정작 체력이 마음을 못 따라온다.' }, // 丙午
  { sequence: 44, ganzhiKo: '정미', animal: '양', animalEmoji: '🐑', nickname: '온도양', copy: '사람들 사이는 따뜻하게 만드는데, 분위기가 싸해지면 본인이 제일 초조하양.' }, // 丁未
  { sequence: 45, ganzhiKo: '무신', animal: '원숭이', animalEmoji: '🐵', nickname: '수습숭이', copy: '문제를 정리하러 왔다가, 옆에서 또 재미있는 걸 발견하고 만다.' }, // 戊申
  { sequence: 46, ganzhiKo: '기유', animal: '닭', animalEmoji: '🐔', nickname: '5분닭', copy: '계획이 5분만 밀려도, 세상이 조금 잘못된 것 같은 기분이 든다.' }, // 己酉
  { sequence: 47, ganzhiKo: '경술', animal: '개', animalEmoji: '🐶', nickname: '내몫멍', copy: '내 몫은 당당히 지키는데, 그 와중에 간식까지 협상 테이블에 올린다.' }, // 庚戌
  { sequence: 48, ganzhiKo: '신해', animal: '돼지', animalEmoji: '🐷', nickname: '짠돌이돼지', copy: '돈은 야무지게 잘 모으는데, 맛있는 걸 만나면 계획이 살짝 흔들린다.' }, // 辛亥
  { sequence: 49, ganzhiKo: '임자', animal: '쥐', animalEmoji: '🐭', nickname: '레이더쥐', copy: '변화는 누구보다 빨리 알아채는데, 작은 소리에도 일단 놀라고 본다.' }, // 壬子
  { sequence: 50, ganzhiKo: '계축', animal: '소', animalEmoji: '🐮', nickname: '말하다말고잤소', copy: '천천히 쉬면 다 괜찮아진다더니, 말 끝나기도 전에 잠들었소.' }, // 癸丑
  { sequence: 51, ganzhiKo: '갑인', animal: '호랑이', animalEmoji: '🐯', nickname: '새싹호랑이', copy: '새 길은 내가 연다며 앞장서지만, 꼬리는 이미 바짝 긴장한 채다.' }, // 甲寅
  { sequence: 52, ganzhiKo: '을묘', animal: '토끼', animalEmoji: '🐰', nickname: '예민보스토끼', copy: '작은 가능성도 정성껏 키우는데, 잎 하나만 시들어도 하루 종일 신경 쓰인다.' }, // 乙卯
  { sequence: 53, ganzhiKo: '병진', animal: '용', animalEmoji: '🐲', nickname: '얘기하다커져용', copy: '꿈을 설명하다 보면, 이야기가 어느새 세계정복까지 커져용.' }, // 丙辰
  { sequence: 54, ganzhiKo: '정사', animal: '뱀', animalEmoji: '🐍', nickname: '말빨뱀', copy: '분위기는 말 한마디로 확 바꾸는데, 멋 부리다 가끔 혀가 꼬인다.' }, // 丁巳
  { sequence: 55, ganzhiKo: '무오', animal: '말', animalEmoji: '🐴', nickname: '존버말', copy: '다들 지쳐도 끝까지 버티는데, 쉬는 날에도 습관처럼 출발 자세부터 잡는다.' }, // 戊午
  { sequence: 56, ganzhiKo: '기미', animal: '양', animalEmoji: '🐑', nickname: '평화양', copy: '싸움은 기막히게 잘 말리는데, 정작 본인이 먼저 울먹인다양.' }, // 己未
  { sequence: 57, ganzhiKo: '경신', animal: '원숭이', animalEmoji: '🐵', nickname: '지름길숭이', copy: '가장 빠른 길을 찾다가, 가끔 제일 복잡한 길로 들어가버린다.' }, // 庚申
  { sequence: 58, ganzhiKo: '신유', animal: '닭', animalEmoji: '🐔', nickname: '메달닭', copy: '작은 칭찬도 놓치지 않고, 마음속 진열장에 야무지게 모아둔다.' }, // 辛酉
  { sequence: 59, ganzhiKo: '임술', animal: '개', animalEmoji: '🐶', nickname: '퇴근멍', copy: '지친 주인을 기다려주다가, 현관 앞에서 먼저 잠들어버렸다.' }, // 壬戌
  { sequence: 60, ganzhiKo: '계해', animal: '돼지', animalEmoji: '🐷', nickname: '쿨쿨돼지', copy: '주인의 칼퇴를 지켜주려 마법까지 쓰다가, 정작 본인이 먼저 잠든다.' }, // 癸亥
];

const BY_SEQUENCE: ReadonlyMap<number, GuardianProfile> = new Map(
  GUARDIAN_PROFILES.map(profile => [profile.sequence, profile]),
);

export function getGuardianProfile(sequence: number): GuardianProfile | null {
  return BY_SEQUENCE.get(sequence) ?? null;
}
