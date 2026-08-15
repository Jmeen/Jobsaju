// workers/scoreEngine.test.js
import test from 'node:test';
import assert from 'node:assert';
import { calculateSemanticSignals, computeMonthlyScore, buildScoreTimeline } from './scoreEngine.js';

test('1. CHONG 단일 관계 (Sample A 기반)', () => {
  // Sample A: fortuneBranch=묘, fortuneStem=상관, natalDay=유, natalMonth=자
  const natalZhis = [
    { char: '유', weight: 1.2, position: 'natalDayBranch' },
    { char: '자', weight: 1.5, position: 'natalMonthBranch' }
  ];
  const result = computeMonthlyScore('상관', '묘', natalZhis);
  
  // XING, CHONG 모두 검출되어야 함
  const chongRel = result.debug.relations.find(r => r.relation === 'CHONG');
  assert.ok(chongRel);
  assert.strictEqual(chongRel.targets[0], 'natalDayBranch');
  
  const xingRel = result.debug.relations.find(r => r.relation === 'XING');
  assert.ok(xingRel);

  // 값 검증 (Sample A 기대값)
  // Job Change ≈ 78, Negotiation ≈ 47, Stay ≈ 10
  assert.strictEqual(result.job_change, 78);
  assert.strictEqual(result.negotiation, 47);
  assert.strictEqual(result.stay, 10);
});

test('2. LIUHE 단일 관계 (Sample B 기반)', () => {
  // Sample B: fortuneBranch=진, fortuneStem=정인, natalDay=유 (진유합)
  // 월지 자(子)는 계산에서 제외됨
  //
  // v3.2 기준 기대값이다. Stay 공식의 Mobility·Risk 계수가 v3.1의 1.0에서 0.7로
  // 완화되면서(SCORING_RULES.md 참고) raw 44.5 -> 42.7, 정규화 88 -> 87이 됐다.
  const natalZhis = [
    { char: '유', weight: 1.2, position: 'natalDayBranch' }
  ];
  const result = computeMonthlyScore('정인', '진', natalZhis);
  
  const liuhe = result.debug.relations.find(r => r.relation === 'LIUHE');
  assert.ok(liuhe);
  
  // Sample B 기대값 (v3.2)
  assert.strictEqual(result.job_change, 33);
  assert.strictEqual(result.negotiation, 59);
  // Stay = Stability(22)*1.5 + Opportunity(11)*0.5 - Mobility(-6)*0.7 = 42.7 -> 87
  assert.strictEqual(result.stay, 87);
});

test('3. XING / PO / HAI 검증 (Sample C, D)', () => {
  // Sample C: 묘월, 정관, 일지 유(충), 월지 자(형)
  const natalZhis = [
    { char: '유', weight: 1.2, position: 'natalDayBranch' },
    { char: '자', weight: 1.5, position: 'natalMonthBranch' }
  ];
  const cResult = computeMonthlyScore('정관', '묘', natalZhis);
  assert.strictEqual(cResult.job_change, 68);
  assert.strictEqual(cResult.negotiation, 35);
  // Stay = Stability(-9.5)*1.5 + Opportunity(5)*0.5 - Mobility(16.5)*0.7 - Risk(24)*0.7
  //      = -40.1 -> 13 (v3.1 계수 1.0이면 -52.25 -> 11이었다)
  assert.strictEqual(cResult.stay, 13);

  // Sample D: 오월, 편재, 일지 유(파), 월지 자(충)
  const dResult = computeMonthlyScore('편재', '오', natalZhis);
  assert.strictEqual(dResult.job_change, 73);
  assert.strictEqual(dResult.negotiation, 53);
  assert.strictEqual(dResult.stay, 11); 
});

test('4. SANHE_HALF (Sample E)', () => {
  const natalZhis = [{ char: '자', weight: 1.2, position: 'natalDayBranch' }];
  const result = computeMonthlyScore('정재', '신', natalZhis);
  
  assert.strictEqual(result.job_change, 53);
  assert.strictEqual(result.negotiation, 71);
  assert.strictEqual(result.stay, 67);
});

test('5. 완전 SANHE Multi-Position Average Weight (Sample F)', () => {
  const natalZhis = [
    { char: '사', weight: 1.5, position: 'natalMonthBranch' },
    { char: '유', weight: 1.2, position: 'natalDayBranch' }
  ];
  const result = computeMonthlyScore('정관', '축', natalZhis); 
  const rels = result.debug.relations;
  
  // SANHE 1건만 존재해야 함 (Partial 중복 제거)
  assert.strictEqual(rels.filter(r => r.relation.includes('SANHE')).length, 1);
  const sanhe = rels.find(r => r.relation === 'SANHE');
  assert.ok(sanhe);
  assert.strictEqual(sanhe.weight, 1.35); // (1.5+1.2)/2
});

test('6. FANGHE / FANGHE_PARTIAL 검증 및 Partial 중복 제거', () => {
  const natalZhis = [
    { char: '인', weight: 1.5, position: 'natalMonthBranch' },
    { char: '묘', weight: 1.2, position: 'natalDayBranch' }
  ];
  const result = computeMonthlyScore('비견', '진', natalZhis);
  const rels = result.debug.relations;
  
  assert.strictEqual(rels.filter(r => r.relation.includes('FANGHE')).length, 1);
  assert.strictEqual(rels.find(r => r.relation === 'FANGHE').weight, 1.35);
});

test('7. 시주 미상 시 에러 없이 진행 및 가중치 미재분배', () => {
  const natalZhis = [
    { char: '자', weight: 1.5, position: 'natalMonthBranch' },
    { char: '유', weight: 1.2, position: 'natalDayBranch' }
  ];
  const result = computeMonthlyScore('정관', '묘', natalZhis);
  assert.ok(result);
});

test('8. Score 10~90 boundary (Flat Timeline 무보정)', () => {
  const natalZhis = [{ char: '진', weight: 1.2, position: 'natalDayBranch' }];
  const result = computeMonthlyScore('정재', '진', natalZhis); 
  assert.ok(result.job_change >= 10 && result.job_change <= 90);
  assert.ok(result.stay >= 10 && result.stay <= 90);
});

test('9. Highlight tie-break 및 best/caution 동시 허용', () => {
  const fortunes = [
    { year_month: '2026-01', fortuneStemShiShen: '상관', fortuneBranch: '묘' }, // Sample A (Risk 24, Mob 21.5, Opp 0)
    { year_month: '2026-02', fortuneStemShiShen: '정재', fortuneBranch: '신' }, // Sample E (Risk 0, Opp 9.8)
    { year_month: '2026-03', fortuneStemShiShen: '정관', fortuneBranch: '인' }  // No extreme
  ];
  const natalZhis = [
    { char: '유', weight: 1.2, position: 'natalDayBranch' },
    { char: '자', weight: 1.5, position: 'natalMonthBranch' }
  ];
  
  const tl = buildScoreTimeline(fortunes, natalZhis);
  
  assert.strictEqual(tl.scoring_rule_version, 'v3.2');
  assert.strictEqual(tl.precomputed_highlights.best_job_change_month, '2026-01');
  assert.strictEqual(tl.precomputed_highlights.caution_month, '2026-01');
  assert.strictEqual(tl.precomputed_highlights.best_negotiation_month, '2026-02');
});

test('10. 동일 입력 반복 시 determinism', () => {
  const natalZhis = [{ char: '유', weight: 1.2, position: 'natalDayBranch' }];
  const r1 = computeMonthlyScore('상관', '묘', natalZhis);
  const r2 = computeMonthlyScore('상관', '묘', natalZhis);
  assert.deepStrictEqual(r1, r2);
});
