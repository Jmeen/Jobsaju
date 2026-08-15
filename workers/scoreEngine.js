// workers/scoreEngine.js
import { evaluateRelations } from './sajuRelationsDef.js';

export const SCORING_RULE_VERSION = "v3.2";

const SIGNAL_MAPPING = {
  // Zhi Relations
  CHONG: { Mobility: 10, Risk: 10, Stability: -10 },
  LIUHE: { Stability: 10, Opportunity: 5, Mobility: -5 },
  SANHE: { Opportunity: 8, Stability: 6, Mobility: -2 },
  SANHE_HALF: { Opportunity: 4, Stability: 3, Mobility: -1 },
  FANGHE: { Stability: 8, Opportunity: 5, Mobility: -3 },
  FANGHE_PARTIAL: { Stability: 3, Opportunity: 2 },
  XING: { Risk: 8, Mobility: 3, Stability: -5 },
  PO: { Risk: 5, Stability: -3 },
  HAI: { Risk: 5, Opportunity: -3 },
  
  // Gan ShiShen
  '식신': { Expression: 10, Mobility: 5, Stability: -5 },
  '상관': { Expression: 10, Mobility: 5, Stability: -5 },
  '정재': { Reward: 10, Opportunity: 5 },
  '편재': { Reward: 10, Opportunity: 5 },
  '정관': { Stability: 10, Opportunity: 5 },
  '편관': { Risk: 5, Mobility: 5 },
  '정인': { Stability: 10, Opportunity: 5 },
  '편인': { Risk: 3, Stability: 5 },
  '비견': { Expression: 5, Mobility: 3 },
  '겁재': { Expression: 5, Mobility: 3 },
};

function initSignals() {
  return { Mobility: 0, Opportunity: 0, Reward: 0, Expression: 0, Stability: 0, Risk: 0 };
}

export function calculateSemanticSignals(fortuneStemShiShen, fortuneBranch, natalZhis) {
  const signals = initSignals();
  
  // 1. Gan (ShiShen) Signals
  const ganMap = SIGNAL_MAPPING[fortuneStemShiShen];
  if (ganMap) {
    for (const [key, val] of Object.entries(ganMap)) {
      signals[key] += val; // weight 1.0
    }
  }

  // 2. Zhi Relations Signals
  const relations = evaluateRelations(fortuneBranch, natalZhis);
  for (const rel of relations) {
    const relMap = SIGNAL_MAPPING[rel.relation];
    if (relMap) {
      for (const [key, val] of Object.entries(relMap)) {
        signals[key] += val * rel.weight;
      }
    }
  }

  return { signals, relations };
}

export function calculateRawScores(signals) {
  const { Mobility, Opportunity, Reward, Expression, Stability, Risk } = signals;
  
  const RawJobChange = Mobility + (Opportunity * 0.5) - (Stability * 0.5) - (Risk * 0.5);
  const RawNegotiation = Expression + Reward + (Opportunity * 0.5) - (Risk * 0.5);
  const RawStay = (Stability * 1.5) + (Opportunity * 0.5) - (Mobility * 0.7) - (Risk * 0.7);
  
  return { job_change: RawJobChange, negotiation: RawNegotiation, stay: RawStay };
}

export function normalizeScore(rawScore) {
  const finalScore = 50 + 40 * Math.tanh(rawScore / 25);
  return Math.round(finalScore);
}

export function computeMonthlyScore(fortuneStemShiShen, fortuneBranch, natalZhis) {
  const { signals, relations } = calculateSemanticSignals(fortuneStemShiShen, fortuneBranch, natalZhis);
  const raws = calculateRawScores(signals);
  
  return {
    job_change: normalizeScore(raws.job_change),
    negotiation: normalizeScore(raws.negotiation),
    stay: normalizeScore(raws.stay),
    debug: {
      semantic_signals: signals,
      relations
    }
  };
}

export function generateHighlights(monthlyDataArray) {
  // monthlyDataArray expects: { year_month, scores: { job_change, negotiation, stay }, debug: { semantic_signals } }
  
  const sortByRules = (rules) => {
    return [...monthlyDataArray].sort((a, b) => {
      for (const rule of rules) {
        const valA = rule.getValue(a);
        const valB = rule.getValue(b);
        if (valA !== valB) {
          return rule.desc ? (valB - valA) : (valA - valB);
        }
      }
      return 0; // all equal
    });
  };

  // 10-1. best_job_change_month
  const bestJobChange = sortByRules([
    { getValue: x => x.scores.job_change, desc: true },
    { getValue: x => x.debug.semantic_signals.Opportunity, desc: true },
    { getValue: x => x.debug.semantic_signals.Risk, desc: false }, // lower is better => asc
    { getValue: x => x.debug.semantic_signals.Mobility, desc: true },
    { getValue: x => x.index, desc: false } // closer to date => lower index
  ])[0];

  // 10-2. best_negotiation_month
  const bestNegotiation = sortByRules([
    { getValue: x => x.scores.negotiation, desc: true },
    { getValue: x => x.debug.semantic_signals.Reward, desc: true },
    { getValue: x => x.debug.semantic_signals.Expression, desc: true },
    { getValue: x => x.debug.semantic_signals.Risk, desc: false },
    { getValue: x => x.index, desc: false }
  ])[0];

  // 10-3. caution_month
  const cautionMonth = sortByRules([
    { getValue: x => x.debug.semantic_signals.Risk, desc: true },
    { getValue: x => x.debug.semantic_signals.Opportunity, desc: false },
    { getValue: x => x.debug.semantic_signals.Stability, desc: false },
    { getValue: x => x.debug.semantic_signals.Mobility, desc: true },
    { getValue: x => x.index, desc: false }
  ])[0];

  return {
    best_job_change_month: bestJobChange.year_month,
    best_negotiation_month: bestNegotiation.year_month,
    caution_month: cautionMonth.year_month
  };
}

/**
 * 사주 원국과 월운 데이터를 기반으로 12개월 점수 및 하이라이트를 산출합니다.
 * @param {Array<{ year_month: string, fortuneStemShiShen: string, fortuneBranch: string }>} fortunes
 * @param {Array<{ char: string, weight: number, position: string }>} natalZhis
 */
export function buildScoreTimeline(fortunes, natalZhis) {
  const timeline = fortunes.map((f, i) => {
    const computed = computeMonthlyScore(f.fortuneStemShiShen, f.fortuneBranch, natalZhis);
    return {
      year_month: f.year_month,
      index: i,
      scores: {
        job_change: computed.job_change,
        negotiation: computed.negotiation,
        stay: computed.stay
      },
      debug: computed.debug
    };
  });

  const highlights = generateHighlights(timeline);

  // Return timeline without index
  const cleanTimeline = timeline.map(t => {
    const { index, ...rest } = t;
    return rest;
  });

  return {
    scoring_rule_version: SCORING_RULE_VERSION,
    timeline: cleanTimeline,
    precomputed_highlights: highlights
  };
}
