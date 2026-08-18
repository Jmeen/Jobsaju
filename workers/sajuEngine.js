import { getSajuAnalysis, normalizeGanZhi, ZHI_HAP, ZHI_CHUNG } from '../src/utils/sajuCore.ts';
import { calculateSaju } from '@fullstackfamily/manseryeok';

// 추가 명리 관계 정의 (형, 파, 해)
export const ZHI_HYEONG = {
  '자': ['묘'], '묘': ['자'],
  '인': ['사', '신'], '사': ['인', '신'], '신': ['인', '사'],
  '축': ['술', '미'], '술': ['축', '미'], '미': ['축', '술'],
  '진': ['진'], '오': ['오'], '유': ['유'], '해': ['해']
};

export const ZHI_PA = {
  '자': '유', '유': '자', '축': '진', '진': '축',
  '인': '해', '해': '인', '묘': '오', '오': '묘',
  '사': '신', '신': '사', '술': '미', '미': '술'
};

export const ZHI_HAE = {
  '자': '미', '미': '자', '축': '오', '오': '축',
  '인': '사', '사': '인', '묘': '진', '진': '묘',
  '신': '해', '해': '신', '유': '술', '술': '유'
};

/**
 * 특정 지지(targetZhi)가 원국의 지지(baseZhis)들과 맺는 합충형파해 관계를 계산합니다.
 */
export function getRelations(targetZhi, baseZhis) {
  const relations = [];
  const normalizedTarget = normalizeGanZhi(targetZhi);

  for (const bZhi of baseZhis) {
    const normB = normalizeGanZhi(bZhi);
    if (!normB) continue;

    if (ZHI_HAP[normalizedTarget] === normB) relations.push('합');
    if (ZHI_CHUNG[normalizedTarget] === normB) relations.push('충');
    if (ZHI_PA[normalizedTarget] === normB) relations.push('파');
    if (ZHI_HAE[normalizedTarget] === normB) relations.push('해');
    if (ZHI_HYEONG[normalizedTarget]?.includes(normB)) relations.push('형');
  }

  return [...new Set(relations)];
}

/**
 * 기준일로부터 향후 months(기본 12개월)간의 월운(월간지)과 관계를 계산합니다.
 */
export function getMonthlyFortunes(startDate, baseZhis, months = 12) {
  const fortunes = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(startDate);
    d.setMonth(startDate.getMonth() + i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    // 매월 15일은 "절기 경계를 피하기 위한 월 단위 forecast 대표일"입니다.
    // 절기(입춘, 경칩 등)는 보통 매월 4~8일 사이에 위치하므로, 
    // 15일을 기준으로 calculateSaju를 호출하면 항상 해당 월의 정확한 월간지(월운)를 안전하게 추출할 수 있습니다.
    const saju = calculateSaju(year, month, 15);
    const zhiHangul = saju.monthPillar.charAt(1);
    
    fortunes.push({
      year_month: `${year}-${String(month).padStart(2, '0')}`,
      ganji: saju.monthPillarHanja,
      ganji_hangul: saju.monthPillar,
      relations: getRelations(zhiHangul, baseZhis)
    });
  }
  return fortunes;
}

/**
 * 무료 결과 조회를 위한 전체 사주 파이프라인
 */
export function buildFreeSajuResult(birthYear, birthMonth, birthDay, birthHour, birthMinute, gender, isSolar) {
  const hasTime = birthHour !== null && birthHour !== undefined;
  
  // 1. 기존 src/utils/sajuCore.ts 재사용하여 원국 계산
  const analysis = getSajuAnalysis(
    birthYear, birthMonth, birthDay, birthHour ?? 12, birthMinute ?? 0, gender,
    { isSolar, hasTime }
  );
  
  const baseZhis = [
    analysis.pillars.year.zhi,
    analysis.pillars.month.zhi,
    analysis.pillars.day.zhi
  ];
  if (hasTime && analysis.pillars.hour.zhi) {
    baseZhis.push(analysis.pillars.hour.zhi);
  }

  // 2. 향후 12개월 월운 계산
  const monthlyFortunes = getMonthlyFortunes(new Date(), baseZhis, 12);
  
  // analysis 전체를 그대로 넘긴다. 예전에는 pillars·dayGan만 골라 내보내느라
  // 결과 화면이 쓰는 scores·elementsCount·bodyStrength가 빠져 있어서
  // 프론트가 이 API를 쓰지 못하고 같은 계산을 클라이언트에서 또 했다.
  return {
    ...analysis,
    monthly_forecast: monthlyFortunes
  };
}
