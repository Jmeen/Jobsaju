import { calculateSaju, lunarToSolar } from '@fullstackfamily/manseryeok';
// @ts-ignore
import { Solar } from 'lunar-javascript';

// === TypeScript Interfaces ===

export interface PillarData {
  gan: string;    // 천간 한글 (예: '계')
  zhi: string;    // 지지 한글 (예: '유')
  ganHanja: string; // 천간 한자 (예: '癸')
  zhiHanja: string; // 지지 한자 (예: '酉')
  element: string; // 오행 (예: '수', '금')
  yinYang: string; // 음양 (예: '양', '음')
  shiShen: string; // 일간 기준 십성 (예: '편인')
}

export interface CareerScores {
  jobChange: number;
  stay: number;
  negotiation: number;
}

export interface SajuCoreResult {
  pillars: {
    year: PillarData;
    month: PillarData;
    day: PillarData;
    hour: PillarData;
  };
  dayGan: {
    char: string;
    hanja: string;
    element: string;
    desc: string;
  };
  elementsCount: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  scores: CareerScores;
  /** 신강(+1) ~ 신약(-1). 해석 톤을 가르는 축 */
  bodyStrength: number;
  daewun: {
    startAge: number;
    list: Array<{
      startAge: number;
      endAge: number;
      startYear: number;
      endYear: number;
      ganZhi: string;
    }>;
    /** 현재 나이가 속한 대운 (없으면 첫 대운) */
    current: { startAge: number; endAge: number; ganZhi: string } | null;
  };
  seewun: {
    year: number;
    ganZhi: string; // 한글 (예: 병오)
    ganZhiHanja: string; // 한자 (예: 丙午)
  };
  /** 계산에 실제 사용된 양력 날짜 (음력 입력 시 변환 결과) */
  solarDate: { year: number; month: number; day: number };
  isTimeCorrected: boolean;
  correctedTime?: { hour: number; minute: number };
}

// === Static Mapping Tables ===

interface ElementYinYang {
  element: string;
  yinYang: string;
}

export const GAN_MAP: Record<string, ElementYinYang> = {
  '갑': { element: '목', yinYang: '양' }, '甲': { element: '목', yinYang: '양' },
  '을': { element: '목', yinYang: '음' }, '乙': { element: '목', yinYang: '음' },
  '병': { element: '화', yinYang: '양' }, '丙': { element: '화', yinYang: '양' },
  '정': { element: '화', yinYang: '음' }, '丁': { element: '화', yinYang: '음' },
  '무': { element: '토', yinYang: '양' }, '戊': { element: '토', yinYang: '양' },
  '기': { element: '토', yinYang: '음' }, '己': { element: '토', yinYang: '음' },
  '경': { element: '금', yinYang: '양' }, '庚': { element: '금', yinYang: '양' },
  '신': { element: '금', yinYang: '음' }, '辛': { element: '금', yinYang: '음' },
  '임': { element: '수', yinYang: '양' }, '壬': { element: '수', yinYang: '양' },
  '계': { element: '수', yinYang: '음' }, '癸': { element: '수', yinYang: '음' },
};

export const ZHI_MAP: Record<string, ElementYinYang> = {
  '자': { element: '수', yinYang: '음' }, '子': { element: '수', yinYang: '음' },
  '축': { element: '토', yinYang: '음' }, '丑': { element: '토', yinYang: '음' },
  '인': { element: '목', yinYang: '양' }, '寅': { element: '목', yinYang: '양' },
  '묘': { element: '목', yinYang: '음' }, '卯': { element: '목', yinYang: '음' },
  '진': { element: '토', yinYang: '양' }, '辰': { element: '토', yinYang: '양' },
  '사': { element: '화', yinYang: '음' }, '巳': { element: '화', yinYang: '음' },
  '오': { element: '화', yinYang: '양' }, '午': { element: '화', yinYang: '양' },
  '미': { element: '토', yinYang: '음' }, '未': { element: '토', yinYang: '음' },
  '신': { element: '금', yinYang: '양' }, '申': { element: '금', yinYang: '양' },
  '유': { element: '금', yinYang: '음' }, '酉': { element: '금', yinYang: '음' },
  '술': { element: '토', yinYang: '양' }, '戌': { element: '토', yinYang: '양' },
  '해': { element: '수', yinYang: '양' }, '亥': { element: '수', yinYang: '양' },
};

const DAY_GAN_DESCS: Record<string, string> = {
  '갑': '갑목(甲木) - 곧게 뻗어나가는 큰 나무처럼 추진력과 개척정신이 강한 리더형',
  '을': '을목(乙木) - 담쟁이덩굴처럼 유연하면서도 끈질긴 생명력을 지닌 적응형 직장인',
  '병': '병화(丙火) - 태양처럼 밝고 열정적이며, 자신을 표현하고 소통하는 데 능한 마케터형',
  '정': '정화(丁火) - 등대나 촛불처럼 은은하지만 섬세하고 내실 있는 기획 및 분석가형',
  '무': '무토(戊土) - 거대한 산처럼 묵직하고 믿음직스러우며 위기관리 능력이 돋보이는 중재자형',
  '기': '기토(己土) - 비옥한 대지처럼 포용력 있고 꼼꼼하며 실무 능력이 탁월한 관리자형',
  '경': '경금(庚金) - 제련되지 않은 원석처럼 단호하고 뚝심 있으며 돌파력이 강한 추진가형',
  '신': '신금(辛金) - 정밀하게 세공된 보석처럼 날카롭고 완벽주의적이며 전문성이 돋보이는 전문가형',
  '임': '임수(壬水) - 깊은 바다처럼 생각의 깊이가 있고 유연하며 임기응변에 강한 전략가형',
  '계': '계수(癸水) - 계곡의 옹달샘이나 단비처럼 지혜롭고 세심하며 기획과 연구에 탁월한 참모형',
};

export const ZHI_CHUNG: Record<string, string> = {
  '자': '오', '오': '자', '축': '미', '미': '축',
  '인': '신', '신': '인', '묘': '유', '유': '묘',
  '진': '술', '술': '진', '사': '해', '해': '사',
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳'
};

export const ZHI_HAP: Record<string, string> = {
  '자': '축', '축': '자', '인': '해', '해': '인',
  '묘': '술', '술': '묘', '진': '유', '유': '진',
  '사': '신', '신': '사', '오': '미', '미': '오',
  '子': '丑', '丑': '子', '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯', '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳', '午': '未', '未': '午'
};

const HANJA_TO_HANGUL: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무',
  己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진',
  巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유',
  戌: '술', 亥: '해',
};

/** 간지 문자열의 한자를 한글로 정규화한다 (충/합/십성 비교용) */
export function normalizeGanZhi(ganZhi: string): string {
  return ganZhi.split('').map(ch => HANJA_TO_HANGUL[ch] || ch).join('');
}

// === Helper Functions ===

function getRelationship(self: string, target: string): string {
  if (self === target) return '동행';

  const order = ['목', '화', '토', '금', '수'];
  const selfIdx = order.indexOf(self);
  const targetIdx = order.indexOf(target);

  if ((selfIdx + 1) % 5 === targetIdx) return '생함';
  if ((targetIdx + 1) % 5 === selfIdx) return '나를생함';
  if ((selfIdx + 2) % 5 === targetIdx) return '극함';
  if ((targetIdx + 2) % 5 === selfIdx) return '나를극함';

  return '동행';
}

export function calculateShiShen(selfGan: string, targetChar: string, isGan: boolean): string {
  const selfInfo = GAN_MAP[selfGan];
  const targetInfo = isGan ? GAN_MAP[targetChar] : ZHI_MAP[targetChar];

  if (!selfInfo || !targetInfo) return '';

  const relation = getRelationship(selfInfo.element, targetInfo.element);
  const isSameYinYang = selfInfo.yinYang === targetInfo.yinYang;

  switch (relation) {
    case '동행':
      return isSameYinYang ? '비견' : '겁재';
    case '생함':
      return isSameYinYang ? '식신' : '상관';
    case '극함':
      return isSameYinYang ? '편재' : '정재';
    case '나를극함':
      return isSameYinYang ? '편관' : '정관';
    case '나를생함':
      return isSameYinYang ? '편인' : '정인';
    default:
      return '';
  }
}

const YONGMA = ['인', '신', '사', '해'];

/**
 * 3대 커리어 점수(이직/잔류/협상) 산출.
 *
 * 설계 원칙:
 * 1. 세운은 모든 사용자에게 동일하므로 단독 가산점으로 쓰지 않는다.
 *    원국과의 충·합, 일간 대비 십성처럼 "내 사주와의 관계"로만 반영한다.
 * 2. 원국 8글자를 자리별 가중치로 집계한다 (월지 > 일지 > 나머지).
 * 3. 신강·신약을 축으로 써서 사람마다 방향이 갈리게 한다.
 * 4. 마지막에 세 점수를 상대 정규화해 항상 우열이 드러나게 한다.
 */
function calculateCareerScores(
  pillars: { year: PillarData; month: PillarData; day: PillarData; hour: PillarData },
  dayGan: { char: string },
  _elementsCount: { wood: number; fire: number; earth: number; metal: number; water: number },
  seewun: { year: number; ganZhi: string }
): CareerScores & { bodyStrength: number } {
  const self = dayGan.char;

  // --- 원국 십성 가중 집계 (천간·지지를 모두 세되 자리별로 무게를 다르게) ---
  const units: Array<{ ss: string; weight: number }> = [
    { ss: calculateShiShen(self, pillars.year.gan, true), weight: 0.8 },
    { ss: calculateShiShen(self, pillars.year.zhi, false), weight: 1.0 },
    { ss: calculateShiShen(self, pillars.month.gan, true), weight: 1.2 },
    { ss: calculateShiShen(self, pillars.month.zhi, false), weight: 1.8 }, // 월령이 가장 강하다
    { ss: calculateShiShen(self, pillars.day.zhi, false), weight: 1.4 },   // 일지는 나의 자리
  ];
  if (pillars.hour.gan) units.push({ ss: calculateShiShen(self, pillars.hour.gan, true), weight: 0.8 });
  if (pillars.hour.zhi) units.push({ ss: calculateShiShen(self, pillars.hour.zhi, false), weight: 1.0 });

  const w = (...names: string[]) =>
    units.filter(u => names.includes(u.ss)).reduce((acc, u) => acc + u.weight, 0);

  const sikSang = w('식신', '상관');
  const jae = w('편재', '정재');
  const jeongGwan = w('정관');
  const pyeonGwan = w('편관');
  const inSeong = w('편인', '정인');
  const biGeop = w('비견', '겁재');
  const totalWeight = units.reduce((acc, u) => acc + u.weight, 0) || 1;

  // --- 신강/신약: 일간을 돕는 세력(비겁·인성) 비율 → -1(신약) ~ +1(신강) ---
  const supportRatio = (biGeop + inSeong) / totalWeight;
  const bodyStrength = Math.max(-1, Math.min(1, (supportRatio - 0.34) / 0.26));

  // --- 역마(이동의 별) ---
  const zhis = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi];
  if (pillars.hour.zhi) zhis.push(pillars.hour.zhi);
  const yongmaCount = zhis.filter(z => YONGMA.includes(z)).length;

  // --- 세운은 원국과의 관계로만 작동시킨다 ---
  const seewunZhi = seewun.ganZhi.charAt(1);
  const chungCount = zhis.filter(z => ZHI_CHUNG[z] === seewunZhi).length;
  const hapCount = zhis.filter(z => ZHI_HAP[z] === seewunZhi).length;
  const seewunSS = [
    calculateShiShen(self, seewun.ganZhi.charAt(0), true),
    calculateShiShen(self, seewunZhi, false),
  ];
  const seewunIs = (...names: string[]) => seewunSS.filter(s => names.includes(s)).length;

  // --- 원점수 ---
  const rawMove =
    21
    + sikSang * 5.8        // 밖으로 드러내려는 힘
    + pyeonGwan * 4        // 압박이 클수록 탈출 욕구
    + yongmaCount * 4      // 역마
    + chungCount * 9       // 올해 흔들리는 자리
    + bodyStrength * 9     // 움직이려면 내 힘이 있어야 한다
    + seewunIs('식신', '상관', '편관') * 5
    - jeongGwan * 4.5      // 안정된 직장운은 발을 묶는다
    - inSeong * 2.5;

  const rawStay =
    30
    + jeongGwan * 7
    + inSeong * 5.5
    + biGeop * 2.5
    + hapCount * 8         // 올해 맺어지는 자리
    + seewunIs('정관', '정인', '정재') * 5
    - sikSang * 4.5
    - chungCount * 7
    - bodyStrength * 8     // 신약할수록 지키는 편이 낫다
    - yongmaCount * 2;

  const rawNego =
    18
    + jae * 7.4            // 재성이 곧 보상 협상력
    + (sikSang > 0 && jae > 0 ? 10 : 0) // 식상생재: 실력을 돈으로 바꾸는 구조
    + bodyStrength * 12    // 신약하면 재를 감당하지 못한다
    + seewunIs('편재', '정재') * 6
    - (jeongGwan + pyeonGwan >= 3.4 ? 8 : 0); // 관에 눌리면 목소리를 내기 어렵다

  // --- 상대 정규화: 항상 우열이 드러나되 전체 수준도 일부 반영 ---
  const raws = [rawMove, rawStay, rawNego];
  const mean = (raws[0] + raws[1] + raws[2]) / 3;
  const shape = (raw: number) =>
    Math.max(18, Math.min(96, Math.round(54 + (raw - mean) * 1.15 + (mean - 40) * 0.32)));

  return {
    jobChange: shape(rawMove),
    stay: shape(rawStay),
    negotiation: shape(rawNego),
    bodyStrength: Math.round(bodyStrength * 100) / 100,
  };
}

// === Main Export Function ===

export function getSajuAnalysis(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number = 0,
  gender: number = 1,
  options: { applyTimeCorrection?: boolean; longitude?: number; isSolar?: boolean; hasTime?: boolean } = {}
): SajuCoreResult {
  const applyTimeCorrection = options.applyTimeCorrection !== false;
  const longitude = options.longitude || 127.3;
  const isSolar = options.isSolar !== false;
  const hasTime = options.hasTime !== false;

  // 음력 입력이면 만세력 기준 양력으로 먼저 변환 (윤달 미지원 입력은 평달로 처리)
  let sYear = year;
  let sMonth = month;
  let sDay = day;
  if (!isSolar) {
    const converted = lunarToSolar(year, month, day, false);
    sYear = converted.solar.year;
    sMonth = converted.solar.month;
    sDay = converted.solar.day;
  }

  // 출생 시간을 모르면 시주 없이 연/월/일 삼주만 계산한다
  const kasiSaju = hasTime
    ? calculateSaju(sYear, sMonth, sDay, hour, minute, { longitude, applyTimeCorrection })
    : calculateSaju(sYear, sMonth, sDay, undefined, undefined, { longitude, applyTimeCorrection: false });

  const yGan = kasiSaju.yearPillar.charAt(0);
  const yZhi = kasiSaju.yearPillar.charAt(1);
  const mGan = kasiSaju.monthPillar.charAt(0);
  const mZhi = kasiSaju.monthPillar.charAt(1);
  const dGan = kasiSaju.dayPillar.charAt(0);
  const dZhi = kasiSaju.dayPillar.charAt(1);
  const hGan = kasiSaju.hourPillar ? kasiSaju.hourPillar.charAt(0) : '';
  const hZhi = kasiSaju.hourPillar ? kasiSaju.hourPillar.charAt(1) : '';

  const yGanH = kasiSaju.yearPillarHanja.charAt(0);
  const yZhiH = kasiSaju.yearPillarHanja.charAt(1);
  const mGanH = kasiSaju.monthPillarHanja.charAt(0);
  const mZhiH = kasiSaju.monthPillarHanja.charAt(1);
  const dGanH = kasiSaju.dayPillarHanja.charAt(0);
  const dZhiH = kasiSaju.dayPillarHanja.charAt(1);
  const hGanH = kasiSaju.hourPillarHanja ? kasiSaju.hourPillarHanja.charAt(0) : '';
  const hZhiH = kasiSaju.hourPillarHanja ? kasiSaju.hourPillarHanja.charAt(1) : '';

  const dayGanChar = dGan;

  const yearPillar: PillarData = {
    gan: yGan, zhi: yZhi, ganHanja: yGanH, zhiHanja: yZhiH,
    element: GAN_MAP[yGan]?.element || '',
    yinYang: GAN_MAP[yGan]?.yinYang || '',
    shiShen: calculateShiShen(dayGanChar, yGan, true)
  };

  const monthPillar: PillarData = {
    gan: mGan, zhi: mZhi, ganHanja: mGanH, zhiHanja: mZhiH,
    element: GAN_MAP[mGan]?.element || '',
    yinYang: GAN_MAP[mGan]?.yinYang || '',
    shiShen: calculateShiShen(dayGanChar, mGan, true)
  };

  const dayPillar: PillarData = {
    gan: dGan, zhi: dZhi, ganHanja: dGanH, zhiHanja: dZhiH,
    element: GAN_MAP[dGan]?.element || '',
    yinYang: GAN_MAP[dGan]?.yinYang || '',
    shiShen: '본원'
  };

  const hourPillar: PillarData = {
    gan: hGan, zhi: hZhi, ganHanja: hGanH, zhiHanja: hZhiH,
    element: hGan ? GAN_MAP[hGan]?.element : '',
    yinYang: hGan ? GAN_MAP[hGan]?.yinYang : '',
    shiShen: hGan ? calculateShiShen(dayGanChar, hGan, true) : ''
  };

  yearPillar.shiShen = calculateShiShen(dayGanChar, yZhi, false);
  monthPillar.shiShen = calculateShiShen(dayGanChar, mZhi, false);
  dayPillar.shiShen = calculateShiShen(dayGanChar, dZhi, false);
  if (hZhi) {
    hourPillar.shiShen = calculateShiShen(dayGanChar, hZhi, false);
  }

  const allElements = [
    yearPillar.element, ZHI_MAP[yZhi]?.element,
    monthPillar.element, ZHI_MAP[mZhi]?.element,
    dayPillar.element, ZHI_MAP[dZhi]?.element,
  ];
  if (hourPillar.element) allElements.push(hourPillar.element);
  if (ZHI_MAP[hZhi]?.element) allElements.push(ZHI_MAP[hZhi].element);

  const elementsCount = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  allElements.forEach(el => {
    if (el === '목') elementsCount.wood++;
    else if (el === '화') elementsCount.fire++;
    else if (el === '토') elementsCount.earth++;
    else if (el === '금') elementsCount.metal++;
    else if (el === '수') elementsCount.water++;
  });

  // 시간 모름이면 대운 계산용으로만 정오를 근사값으로 사용한다 (시주에는 반영하지 않음)
  const daewunHour = hasTime ? (kasiSaju.correctedTime ? kasiSaju.correctedTime.hour : hour) : 12;
  const daewunMinute = hasTime ? (kasiSaju.correctedTime ? kasiSaju.correctedTime.minute : minute) : 0;

  const solarObj = Solar.fromYmdHms(sYear, sMonth, sDay, daewunHour, daewunMinute, 0);
  const lunarObj = solarObj.getLunar();
  const eightCharObj = lunarObj.getEightChar();
  const yunObj = eightCharObj.getYun(gender);

  const daewunStartAge = yunObj.getStartYear();
  const daewunList = yunObj.getDaYun().map((dy: any) => ({
    startAge: dy.getStartAge(),
    endAge: dy.getEndAge(),
    startYear: dy.getStartYear(),
    endYear: dy.getEndYear(),
    ganZhi: dy.getGanZhi()
  })).filter((dy: any) => dy.ganZhi !== '');

  const now = new Date();
  const targetYear = now.getFullYear();
  const currentDaewun = daewunList.find(
    (dy: any) => dy.startYear <= targetYear && targetYear <= dy.endYear
  ) || daewunList[0] || null;

  // 세운은 입춘 기준 연간지를 사용한다
  const solarNow = Solar.fromYmdHms(targetYear, now.getMonth() + 1, now.getDate(), 12, 0, 0);
  const lunarNow = solarNow.getLunar();
  const seewunGanZhiHanja = typeof lunarNow.getYearInGanZhiByLiChun === 'function'
    ? lunarNow.getYearInGanZhiByLiChun()
    : lunarNow.getYearInGanZhi();

  const seewun = {
    year: targetYear,
    ganZhi: normalizeGanZhi(seewunGanZhiHanja), // 충/합·십성 비교는 한글 기준으로 통일
    ganZhiHanja: seewunGanZhiHanja
  };

  const { bodyStrength, ...scores } = calculateCareerScores(
    { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar },
    { char: dayGanChar },
    elementsCount,
    seewun
  );

  return {
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    dayGan: {
      char: dayGanChar,
      hanja: dGanH,
      element: GAN_MAP[dayGanChar]?.element || '',
      desc: DAY_GAN_DESCS[dayGanChar] || ''
    },
    elementsCount,
    scores,
    bodyStrength,
    daewun: {
      startAge: daewunStartAge,
      list: daewunList,
      current: currentDaewun
        ? { startAge: currentDaewun.startAge, endAge: currentDaewun.endAge, ganZhi: currentDaewun.ganZhi }
        : null
    },
    seewun,
    solarDate: { year: sYear, month: sMonth, day: sDay },
    isTimeCorrected: kasiSaju.isTimeCorrected,
    correctedTime: kasiSaju.correctedTime
  };
}
