// workers/sajuRelationsDef.js

const ZHIS = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

const CHONG_PAIRS = ['자오', '오자', '축미', '미축', '인신', '신인', '묘유', '유묘', '진술', '술진', '사해', '해사'];
const LIUHE_PAIRS = ['자축', '축자', '인해', '해인', '묘술', '술묘', '진유', '유진', '사신', '신사', '오미', '미오'];

const SANHE_GROUPS = [
  ['신', '자', '진'],
  ['해', '묘', '미'],
  ['인', '오', '술'],
  ['사', '유', '축']
];

const FANGHE_GROUPS = [
  ['인', '묘', '진'],
  ['사', '오', '미'],
  ['신', '유', '술'],
  ['해', '자', '축']
];

const XING_GROUPS = [
  ['인', '사', '신'], // 인사신
  ['축', '술', '미'], // 축술미
];
const XING_PAIRS = [
  '자묘', '묘자', // 무례지형
  '진진', '오오', '유유', '해해' // 자형
];

const PO_PAIRS = ['자유', '유자', '축진', '진축', '인해', '해인', '묘오', '오묘', '사신', '신사', '술미', '미술', '오유', '유오']; // V3.1 Sample D: "오유파"
const HAI_PAIRS = ['자미', '미자', '축오', '오축', '인사', '사인', '묘진', '진묘', '신해', '해신', '유술', '술유'];

/**
 * 주어진 운세 지지(fortuneZhi)와 원국의 지지들 간의 관계를 분석합니다.
 * @param {string} fortuneZhi - 월운 지지 (예: '자')
 * @param {Array<{char: string, weight: number, position: string}>} natalZhis - 원국 지지 배열
 */
export function evaluateRelations(fortuneZhi, natalZhis) {
  let relations = [];

  // 1. CHONG, LIUHE, XING (2자), PO, HAI 분석
  for (const nz of natalZhis) {
    const pair = fortuneZhi + nz.char;
    const targets = [nz.position];
    const weight = nz.weight;

    if (CHONG_PAIRS.includes(pair)) relations.push({ relation: 'CHONG', targets, weight });
    if (LIUHE_PAIRS.includes(pair)) relations.push({ relation: 'LIUHE', targets, weight });
    if (XING_PAIRS.includes(pair)) relations.push({ relation: 'XING', targets, weight });
    if (PO_PAIRS.includes(pair)) relations.push({ relation: 'PO', targets, weight });
    if (HAI_PAIRS.includes(pair)) relations.push({ relation: 'HAI', targets, weight });
  }

  // 2. XING 3자 그룹 (인사신, 축술미) 분석
  // fortuneZhi + natalZhis 조합에서 XING_GROUPS를 만족하는지 검사
  // 단, XING은 완전/부분 대체 규칙이 V3.1에 명시되어 있지 않으나, 보통 2자만 만나도 작용함 (예: 인사, 사신, 인신, 축술, 술미, 축미)
  // V3.1은 "XING" 이라는 단일 Signal만 언급. 
  // 인사신, 축술미의 2자 조합도 XING으로 간주하여 각각의 원국 지지와 1:1 관계로 취급하겠습니다.
  const XING_3_PAIRS = [
    '인사', '사인', '사신', '신사', '인신', '신인',
    '축술', '술축', '술미', '미술', '축미', '미축'
  ];
  for (const nz of natalZhis) {
    const pair = fortuneZhi + nz.char;
    if (XING_3_PAIRS.includes(pair) && fortuneZhi !== nz.char) {
      // 인신, 축미는 CHONG과 XING이 겹침. 둘 다 허용.
      relations.push({ relation: 'XING', targets: [nz.position], weight: nz.weight });
    }
  }

  // 3. SANHE 및 FANGHE 분석
  // fortuneZhi가 포함된 그룹 찾기
  
  // 중복된 1:1 관계를 방지하기 위해, SANHE/FANGHE를 맺은 대상들은 따로 추적할 수 있지만,
  // V3.1에 "Complete relation supersedes its constituent partial relations"라고 명시됨.
  
  const checkGroups = (groups, fullType, partialType) => {
    let groupRelations = [];
    for (const group of groups) {
      if (!group.includes(fortuneZhi)) continue;

      // group의 나머지 글자들이 원국에 있는지 확인
      const required = group.filter(ch => ch !== fortuneZhi);
      
      // 원국에서 필요한 글자들을 찾음
      const matchedNatals = [];
      for (const reqChar of required) {
        const matches = natalZhis.filter(nz => nz.char === reqChar);
        if (matches.length > 0) {
          // 중복 글자가 있을 수 있으나 첫 번째만 쓴다고 가정하거나 모두 쓴다고 가정.
          // 일반적으로 하나의 삼합은 각 글자 1개씩으로 구성.
          matchedNatals.push(matches[0]);
        }
      }

      if (matchedNatals.length === 2) {
        // 완전합
        const targets = matchedNatals.map(n => n.position);
        const avgWeight = matchedNatals.reduce((sum, n) => sum + n.weight, 0) / 2;
        groupRelations.push({ relation: fullType, targets, weight: avgWeight });
      } else if (matchedNatals.length === 1) {
        // 반합 (부분합)
        const targets = [matchedNatals[0].position];
        const weight = matchedNatals[0].weight;
        groupRelations.push({ relation: partialType, targets, weight });
      }
    }
    return groupRelations;
  };

  const sanheRels = checkGroups(SANHE_GROUPS, 'SANHE', 'SANHE_HALF');
  const fangheRels = checkGroups(FANGHE_GROUPS, 'FANGHE', 'FANGHE_PARTIAL');

  relations.push(...sanheRels);
  relations.push(...fangheRels);

  // SANHE_HALF 또는 FANGHE_PARTIAL이 완전합으로 대체되었는가?
  // checkGroups 내부에서 완전합이면 반합을 반환하지 않으므로 이미 처리됨.
  // 동일한 원국 지지가 여러 반합/완전합에 쓰이는 경우는 그대로 반환.

  // 중복 검증: 동일한 타겟에 대한 동일 관계는 1개로 병합 (예를 들어 원국에 동일 글자가 2개 있어 중복 발생 시)
  // V3.1은 1:1 계산이므로, 원국 월지도 '卯', 일지도 '卯' 라면 '자묘형'이 각각 월지, 일지에 걸리는 것이 맞음.
  // 단, XING_3_PAIRS 등에서 중복 추가된 XING 필터링
  const uniqueRels = [];
  const seen = new Set();
  for (const r of relations) {
    const key = r.relation + ':' + r.targets.sort().join(',');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRels.push(r);
    }
  }

  return uniqueRels;
}
