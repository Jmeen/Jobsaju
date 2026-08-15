
// workers/distributionCheck.js
import { computeMonthlyScore, generateHighlights } from './scoreEngine.js';
import { getSajuAnalysis, calculateShiShen, normalizeGanZhi } from '../src/utils/sajuCore.ts';
import { calculateSaju } from '@fullstackfamily/manseryeok';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function runDistributionCheck(numUsers = 1000) {
  let totalJobChange = 0;
  let totalNego = 0;
  let totalStay = 0;
  
  const scores = [];
  const bestJobChangeStems = {};
  const cautionStems = {};
  const relationStats = {};
  
  const highlightCounts = { 
    bestJobChange: Array(12).fill(0), 
    bestNego: Array(12).fill(0), 
    caution: Array(12).fill(0) 
  };
  
  let jobChangeHist = Array(10).fill(0); // 0~9, 10~19, ..., 90~100
  let negoHist = Array(10).fill(0);
  let stayHist = Array(10).fill(0);
  
  let stayLowChong = 0, stayLowXing = 0, stayLowPo = 0, stayLowHai = 0, stayLowCount = 0;

  let userJcStats = { totalRange: 0, totalStdDev: 0, totalBestDiff: 0 };
  let userNegoStats = { totalRange: 0, totalStdDev: 0, totalBestDiff: 0 };
  let userStayStats = { totalRange: 0, totalStdDev: 0, totalBestDiff: 0 };

  for (let i = 0; i < numUsers; i++) {
    const y = randomInt(1970, 2005);
    const m = randomInt(1, 12);
    const d = randomInt(1, 28);
    const hasTime = Math.random() > 0.2;
    const h = hasTime ? randomInt(0, 23) : 12;

    const analysis = getSajuAnalysis(y, m, d, h, 0, 'M', { isSolar: true, hasTime });
    
    const baseZhis = [
      { char: analysis.pillars.month.zhi, weight: 1.5, position: 'natalMonthBranch' },
      { char: analysis.pillars.day.zhi, weight: 1.2, position: 'natalDayBranch' },
      { char: analysis.pillars.year.zhi, weight: 0.8, position: 'natalYearBranch' }
    ];
    if (hasTime && analysis.pillars.hour.zhi) {
      baseZhis.push({ char: analysis.pillars.hour.zhi, weight: 0.5, position: 'natalHourBranch' });
    }

    const yearTimeline = [];
    const userJcScores = [];
    const userNegoScores = [];
    const userStayScores = [];

    for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
      const fMonth = monthIdx + 1;
      const fSaju = calculateSaju(2026, fMonth, 15);
      
      const fortuneStem = normalizeGanZhi(fSaju.monthPillar.charAt(0));
      const fortuneBranch = normalizeGanZhi(fSaju.monthPillar.charAt(1));
      const shiShen = calculateShiShen(analysis.dayGan.gan, fortuneStem, true);
      
      const result = computeMonthlyScore(shiShen, fortuneBranch, baseZhis);
      
      const wrappedResult = {
        year_month: `2026-${fMonth.toString().padStart(2, '0')}`,
        stem: shiShen,
        zhi: fortuneBranch,
        index: monthIdx,
        scores: {
          job_change: result.job_change,
          negotiation: result.negotiation,
          stay: result.stay
        },
        job_change: result.job_change, 
        negotiation: result.negotiation,
        stay: result.stay,
        debug: result.debug
      };
      
      scores.push(wrappedResult);
      yearTimeline.push(wrappedResult);
      userJcScores.push(result.job_change);
      userNegoScores.push(result.negotiation);
      userStayScores.push(result.stay);
      
      totalJobChange += result.job_change;
      totalNego += result.negotiation;
      totalStay += result.stay;
      
      const jcIdx = Math.min(Math.floor(result.job_change / 10), 9);
      const ngIdx = Math.min(Math.floor(result.negotiation / 10), 9);
      const stIdx = Math.min(Math.floor(result.stay / 10), 9);
      
      jobChangeHist[jcIdx]++;
      negoHist[ngIdx]++;
      stayHist[stIdx]++;
      
      for (const rel of result.debug.relations) {
        if (!relationStats[rel.relation]) relationStats[rel.relation] = 0;
        relationStats[rel.relation]++;
      }

      if (result.stay < 30) {
        stayLowCount++;
        const rels = result.debug.relations.map(r => r.relation);
        if (rels.includes('CHONG')) stayLowChong++;
        if (rels.includes('XING')) stayLowXing++;
        if (rels.includes('PO')) stayLowPo++;
        if (rels.includes('HAI')) stayLowHai++;
      }
    }
    
    function calcUserStats(scoresArr, statsObj) {
      const sorted = [...scoresArr].sort((a,b) => b - a);
      statsObj.totalBestDiff += (sorted[0] - sorted[1]);
      statsObj.totalRange += (sorted[0] - sorted[11]);
      const mean = sorted.reduce((a,b)=>a+b,0) / 12;
      const vari = sorted.reduce((a,b)=>a+Math.pow(b-mean,2),0)/12;
      statsObj.totalStdDev += Math.sqrt(vari);
    }
    
    calcUserStats(userJcScores, userJcStats);
    calcUserStats(userNegoScores, userNegoStats);
    calcUserStats(userStayScores, userStayStats);

    // Highlights
    const highlights = generateHighlights(yearTimeline);
    const bestMonth = yearTimeline.find(y => y.year_month === highlights.best_job_change_month);
    const cautionMonth = yearTimeline.find(y => y.year_month === highlights.caution_month);
    const bestNegoMonth = yearTimeline.find(y => y.year_month === highlights.best_negotiation_month);
    
    bestJobChangeStems[bestMonth.stem] = (bestJobChangeStems[bestMonth.stem] || 0) + 1;
    cautionStems[cautionMonth.stem] = (cautionStems[cautionMonth.stem] || 0) + 1;

    highlightCounts.bestJobChange[bestMonth.index]++;
    highlightCounts.caution[cautionMonth.index]++;
    highlightCounts.bestNego[bestNegoMonth.index]++;
  }
  
  const N = scores.length;
  const avgJC = totalJobChange / N;
  const avgNego = totalNego / N;
  const avgStay = totalStay / N;
  
  let varJC = 0, varNego = 0, varStay = 0;
  let covJcStay = 0, covJcNego = 0, covNegoStay = 0;
  
  scores.sort((a,b) => a.job_change - b.job_change);
  const p10_jc = scores[Math.floor(N * 0.1)].job_change;
  const p25_jc = scores[Math.floor(N * 0.25)].job_change;
  const p50_jc = scores[Math.floor(N * 0.5)].job_change;
  const p75_jc = scores[Math.floor(N * 0.75)].job_change;
  const p90_jc = scores[Math.floor(N * 0.9)].job_change;

  scores.sort((a,b) => a.stay - b.stay);
  const p10_st = scores[Math.floor(N * 0.1)].stay;
  const p25_st = scores[Math.floor(N * 0.25)].stay;
  const p50_st = scores[Math.floor(N * 0.5)].stay;
  const p75_st = scores[Math.floor(N * 0.75)].stay;
  const p90_st = scores[Math.floor(N * 0.9)].stay;

  for (const s of scores) {
    varJC += Math.pow(s.job_change - avgJC, 2);
    varNego += Math.pow(s.negotiation - avgNego, 2);
    varStay += Math.pow(s.stay - avgStay, 2);
    covJcStay += (s.job_change - avgJC) * (s.stay - avgStay);
    covJcNego += (s.job_change - avgJC) * (s.negotiation - avgNego);
    covNegoStay += (s.negotiation - avgNego) * (s.stay - avgStay);
  }
  
  const stdJC = Math.sqrt(varJC / N);
  const stdNego = Math.sqrt(varNego / N);
  const stdStay = Math.sqrt(varStay / N);
  
  const corrJcStay = covJcStay / (stdJC * stdStay * N);
  const corrJcNego = covJcNego / (stdJC * stdNego * N);
  const corrNegoStay = covNegoStay / (stdNego * stdStay * N);

  console.log('--- Production Path Distribution Check (V3.2) ---');
  console.log(`Total Months Simulated: ${N}`);
  
  function printAxisStats(name, avg, scoresArr, histArr, prop) {
    scoresArr.sort((a,b) => a[prop] - b[prop]);
    const p10 = scoresArr[Math.floor(N * 0.1)][prop];
    const p25 = scoresArr[Math.floor(N * 0.25)][prop];
    const p50 = scoresArr[Math.floor(N * 0.5)][prop];
    const p75 = scoresArr[Math.floor(N * 0.75)][prop];
    const p90 = scoresArr[Math.floor(N * 0.9)][prop];
    
    let varSum = 0;
    let score10 = 0, score90 = 0;
    for (const s of scoresArr) {
      varSum += Math.pow(s[prop] - avg, 2);
      if (s[prop] === 10) score10++;
      if (s[prop] === 90) score90++;
    }
    const std = Math.sqrt(varSum / N);

    console.log(`\n[ ${name} Axis ]`);
    console.log(`Mean: ${avg.toFixed(2)}, Median: ${p50}, StdDev: ${std.toFixed(2)}`);
    console.log(`Percentiles: p10=${p10}, p25=${p25}, p75=${p75}, p90=${p90}`);
    console.log(`Min: ${scoresArr[0][prop]}, Max: ${scoresArr[N-1][prop]}`);
    console.log(`Score == 10: ${(score10/N*100).toFixed(2)}%, Score == 90: ${(score90/N*100).toFixed(2)}%`);
    console.log(`Hist: 10s:${(histArr[1]/N*100).toFixed(1)}%, 20s:${(histArr[2]/N*100).toFixed(1)}%, 30s:${(histArr[3]/N*100).toFixed(1)}%, 40s:${(histArr[4]/N*100).toFixed(1)}%, 50s:${(histArr[5]/N*100).toFixed(1)}%, 60s:${(histArr[6]/N*100).toFixed(1)}%, 70s:${(histArr[7]/N*100).toFixed(1)}%, 80s:${(histArr[8]/N*100).toFixed(1)}%, 90s:${(histArr[9]/N*100).toFixed(1)}%`);
  }

  printAxisStats('Job Change', avgJC, [...scores], jobChangeHist, 'job_change');
  printAxisStats('Negotiation', avgNego, [...scores], negoHist, 'negotiation');
  printAxisStats('Stay', avgStay, [...scores], stayHist, 'stay');

  console.log('\n[ Correlations ]');
  console.log(`JC ↔ Stay: ${corrJcStay.toFixed(4)}`);
  console.log(`JC ↔ Nego: ${corrJcNego.toFixed(4)}`);
  console.log(`Nego ↔ Stay: ${corrNegoStay.toFixed(4)}`);

  console.log('\n[ User-level 12-month metrics ]');
  console.log(`Job Change - Avg Range: ${(userJcStats.totalRange/numUsers).toFixed(2)}, Avg StdDev: ${(userJcStats.totalStdDev/numUsers).toFixed(2)}, Best vs 2nd: ${(userJcStats.totalBestDiff/numUsers).toFixed(2)}`);
  console.log(`Negotiation - Avg Range: ${(userNegoStats.totalRange/numUsers).toFixed(2)}, Avg StdDev: ${(userNegoStats.totalStdDev/numUsers).toFixed(2)}, Best vs 2nd: ${(userNegoStats.totalBestDiff/numUsers).toFixed(2)}`);
  console.log(`Stay - Avg Range: ${(userStayStats.totalRange/numUsers).toFixed(2)}, Avg StdDev: ${(userStayStats.totalStdDev/numUsers).toFixed(2)}, Best vs 2nd: ${(userStayStats.totalBestDiff/numUsers).toFixed(2)}`);

  console.log('\n[ Highlights by Month (1~12) ]');
  console.log(`Best Job Change: ${highlightCounts.bestJobChange.join(', ')}`);
  console.log(`Best Negotiation: ${highlightCounts.bestNego.join(', ')}`);
  console.log(`Caution Month: ${highlightCounts.caution.join(', ')}`);

  console.log('\n[ Stay Low (<30) Contributors ]');
  console.log(`Total Low Stay Months: ${stayLowCount}`);
  console.log(`Contained CHONG: ${stayLowChong} (${(stayLowChong/stayLowCount*100).toFixed(1)}%)`);
  console.log(`Contained XING: ${stayLowXing} (${(stayLowXing/stayLowCount*100).toFixed(1)}%)`);
  console.log(`Contained PO: ${stayLowPo} (${(stayLowPo/stayLowCount*100).toFixed(1)}%)`);
  console.log(`Contained HAI: ${stayLowHai} (${(stayLowHai/stayLowCount*100).toFixed(1)}%)`);

  console.log('\n[ Relation Stats ]');
  console.table(relationStats);
}

runDistributionCheck(1000); // 1000 years = 12000 months
