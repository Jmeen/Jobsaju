import { calculateSaju } from '@fullstackfamily/manseryeok';
import { getSajuAnalysis, calculateShiShen, normalizeGanZhi } from '../src/utils/sajuCore.ts';
import { resolveCareerAxis } from '../src/utils/careerSignal.ts';
import characters from '../free_engine_characters.js';
import { computeMonthlyScore, generateHighlights } from './scoreEngine.js';

function seoulYearMonth(now) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
  };
}

function addMonths(year, month, offset) {
  const zeroBased = year * 12 + (month - 1) + offset;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

/** 실제 유료 생성 경로와 QA가 같은 사주·월별 점수 계산을 공유한다. */
export function buildPaidReportContext(birth, { now = new Date() } = {}) {
  if (!birth || !Number.isFinite(Number(birth.year)) || !Number.isFinite(Number(birth.month)) || !Number.isFinite(Number(birth.day))) {
    throw new Error('유효한 생년월일이 필요합니다.');
  }

  const hasTime = birth.hour !== null && birth.hour !== undefined && birth.hour !== '';
  const analysis = getSajuAnalysis(
    Number(birth.year),
    Number(birth.month),
    Number(birth.day),
    hasTime ? Number(birth.hour) : 12,
    Number(birth.minute) || 0,
    Number(birth.gender) || 1,
    { isSolar: birth.isSolar !== false, hasTime },
  );

  const baseZhis = [
    { char: analysis.pillars.month.zhi, weight: 1.5, position: 'natalMonthBranch' },
    { char: analysis.pillars.day.zhi, weight: 1.2, position: 'natalDayBranch' },
    { char: analysis.pillars.year.zhi, weight: 0.8, position: 'natalYearBranch' },
  ];
  if (hasTime && analysis.pillars.hour.zhi) {
    baseZhis.push({ char: analysis.pillars.hour.zhi, weight: 0.5, position: 'natalHourBranch' });
  }

  const current = seoulYearMonth(now);
  const timeline = Array.from({ length: 6 }, (_, index) => {
    const target = addMonths(current.year, current.month, index);
    const fortune = calculateSaju(target.year, target.month, 15);
    const fortuneStem = normalizeGanZhi(fortune.monthPillar.charAt(0));
    const fortuneBranch = normalizeGanZhi(fortune.monthPillar.charAt(1));
    const shiShen = calculateShiShen(analysis.dayGan.gan, fortuneStem, true);
    const scoreResult = computeMonthlyScore(shiShen, fortuneBranch, baseZhis);
    return {
      year_month: `${target.year}-${String(target.month).padStart(2, '0')}`,
      scores: {
        job_change: scoreResult.job_change,
        negotiation: scoreResult.negotiation,
        stay: scoreResult.stay,
      },
      debug: {
        relations: scoreResult.debug.relations.map(relation => relation.relation),
        semantic_signals: scoreResult.debug.semantic_signals,
      },
    };
  });

  const dayPillar = analysis.pillars.day.ganHanja + analysis.pillars.day.zhiHanja;
  const characterData = characters.find(character => character.id === dayPillar) || null;
  return {
    analysis,
    hasTime,
    timeline,
    precomputedHighlights: generateHighlights(timeline.map((month, index) => ({ ...month, index }))),
    characterData,
    decisionContext: {
      // 무료 결과에서 사용자가 본 ◎ 축. 유료 리포트는 이 결론에서 출발하되,
      // 이후 6개월 타임라인에 따라 협상이나 이동 시점으로 자연스럽게 확장한다.
      entryAxis: resolveCareerAxis(analysis.scores),
      elements: analysis.elementsCount,
      character: characterData ? {
        id: characterData.id,
        core_type: characterData.core_type,
        keywords: characterData.keywords,
        blind_spot: characterData.blind_spot,
        best_environment: characterData.best_environment,
      } : null,
    },
  };
}
