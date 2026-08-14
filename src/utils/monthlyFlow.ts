// @ts-ignore
import { Solar } from 'lunar-javascript';
import { calculateShiShen, normalizeGanZhi, ZHI_CHUNG, ZHI_HAP } from './sajuCore.ts';

export type MonthTone = 'move' | 'nego' | 'press' | 'doc' | 'peer' | 'calm';

export interface MonthPlan {
  year: number;
  month: number; // 1~12 (양력 달력 기준)
  ganZhi: string; // 월건 (예: 병신)
  label: string; // 배지 문구 (예: "9월 [지원·면접 집중]")
  tone: MonthTone;
  description: string;
  isPeak: boolean; // 이동운이 가장 강한 달
}

/** 십성 10종별 행동 지침 — 같은 계열이라도 달마다 다른 조언이 나오도록 개별 작성 */
const SS_PROFILE: Record<string, { action: string; tone: MonthTone; desc: string }> = {
  식신: {
    action: '결과물 다듬기',
    tone: 'move',
    desc: '식신(차분히 결과물을 만들어내는 힘)이 흐르는 달입니다. 당장 지원서를 뿌리기보다 경력기술서와 포트폴리오를 완성도 있게 다듬어 두면, 다음 기회가 왔을 때 바로 꺼내 쓸 수 있습니다.',
  },
  상관: {
    action: '지원·면접 집중',
    tone: 'move',
    desc: '상관(내 실력을 말과 결과로 드러내는 힘)이 강한 달입니다. 면접과 발표에서 평소보다 설득력이 올라가니, 미뤄둔 지원을 이 달에 실제로 실행하세요.',
  },
  편재: {
    action: '기회 확장',
    tone: 'nego',
    desc: '편재(기회를 잡아 판을 키우는 재물운)가 흐릅니다. 여러 곳을 동시에 저울질하며 조건을 끌어올리기 좋은 달이니, 한 곳에 성급히 확정하지 마세요.',
  },
  정재: {
    action: '연봉 협상',
    tone: 'nego',
    desc: '정재(일한 만큼 챙겨 받는 재물운)가 자리합니다. 확실한 근거를 들고 연봉과 처우를 조율하기에 알맞은 달이니, 시장 연봉 데이터와 성과 수치를 미리 준비하세요.',
  },
  편관: {
    action: '압박 관리',
    tone: 'press',
    desc: '편관(나를 시험하는 조직의 압박)이 강해지는 달입니다. 상사와의 긴장이나 갑작스러운 업무 부담이 늘 수 있으니, 감정이 올라온 상태에서 퇴사를 결정하는 일은 피하세요.',
  },
  정관: {
    action: '평가·승진 어필',
    tone: 'press',
    desc: '정관(직장과 직책의 안정 기운)이 자리합니다. 내부 평가와 승진 논의에 이름을 올리기 좋은 달이니, 주요 성과를 의사결정권자가 확인할 수 있도록 정리해 두세요.',
  },
  편인: {
    action: '조건 재검토',
    tone: 'doc',
    desc: '편인(문서와 자격을 파고드는 기운)이 들어옵니다. 제안받은 조건을 다시 뜯어보고 자격증·교육처럼 남는 준비를 채우기 좋습니다. 다만 생각이 많아져 결정을 미루기 쉬운 달이기도 합니다.',
  },
  정인: {
    action: '계약·문서 정비',
    tone: 'doc',
    desc: '정인(배움과 계약 문서의 기운)이 흐릅니다. 근로계약서와 처우 문서를 문장 단위로 확인하고, 부족한 학습을 채워두기에 알맞은 달입니다.',
  },
  비견: {
    action: '네트워킹·레퍼런스',
    tone: 'peer',
    desc: '비견(나란히 서는 동료의 기운)이 강합니다. 업계 네트워크를 통해 공고에 없는 정보가 들어오니, 커피챗과 레퍼런스 정리로 다음 기회의 문을 넓혀두세요.',
  },
  겁재: {
    action: '경쟁·지출 주의',
    tone: 'peer',
    desc: '겁재(몫을 다투는 경쟁의 기운)가 강합니다. 같은 자리를 노리는 경쟁자가 늘 수 있으니 차별점을 분명히 하고, 지출도 커지기 쉬우니 이직 공백에 대비한 자금을 확인해 두세요.',
  },
};

/** 충(변동) 신호가 겹칠 때 붙는 문장 — 6개월 안에 여러 번 나와도 복붙처럼 보이지 않도록 순번대로 로테이션 */
const CHUNG_TAILS = [
  '여기에 내 사주와 충(부딪혀 흔들리는 변동 신호)이 겹칩니다. 조직 개편이나 예상 밖의 제안처럼 상황이 갑자기 바뀔 수 있으니, 움직일 기준선을 미리 정해두면 흔들리지 않습니다.',
  '동시에 충(부딪혀 흔들리는 변동 신호)이 다시 들어오는 달입니다. 지난달과 다른 종류의 변수(인사이동, 새 제안 등)일 수 있으니, 이번엔 어떤 조건이 바뀌는지부터 확인하세요.',
  '이 시기에도 충(부딪혀 흔들리는 변동 신호)이 이어집니다. 같은 신호가 반복된다는 것은 아직 정리되지 않은 결정이 남아있다는 뜻이니, 미뤄둔 판단을 이번 달 안에 매듭짓는 편이 낫습니다.',
];

/** 합(관계) 신호가 겹칠 때 붙는 문장 — 6개월 안에 여러 번 나와도 복붙처럼 보이지 않도록 순번대로 로테이션 */
const HAP_TAILS = [
  '내 사주와 합(맺어지는 기운)도 들어오니, 이 달에 다져둔 관계와 평판이 다음 이동에서 우군이 되어줍니다.',
  '합(맺어지는 기운)이 다시 자리하는 달입니다. 이번엔 새로운 인맥보다 이미 알던 사람과의 접점을 다시 챙기는 쪽이 더 유리합니다.',
  '합(맺어지는 기운)이 한 번 더 이어집니다. 그동안 쌓아온 신뢰가 실제 제안이나 추천으로 이어지기 좋은 시점이니, 관계를 결과로 연결할 방법을 구체적으로 생각해 보세요.',
];

function ssGroup(ss: string): 'sikSang' | 'jae' | 'gwan' | 'in' | 'bi' | '' {
  if (ss === '식신' || ss === '상관') return 'sikSang';
  if (ss === '편재' || ss === '정재') return 'jae';
  if (ss === '편관' || ss === '정관') return 'gwan';
  if (ss === '편인' || ss === '정인') return 'in';
  if (ss === '비견' || ss === '겁재') return 'bi';
  return '';
}

interface MonthSignal {
  year: number;
  month: number;
  ganZhi: string;
  ganSS: string;
  zhiSS: string;
  hasChung: boolean;
  hasHap: boolean;
  moveScore: number;
  negoScore: number;
}

/**
 * 원국(일간+지지들)과 실제 월건(절기 기준)을 대조해
 * 앞으로 monthCount개월의 커리어 행동 캘린더를 규칙 기반으로 생성한다.
 */
export function buildMonthlyFlow(
  dayGan: string,
  natalZhis: string[],
  monthCount: number = 6,
  from: Date = new Date()
): MonthPlan[] {
  const signals: MonthSignal[] = [];

  for (let i = 0; i < monthCount; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 15);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;

    // 매월 15일 정오 기준 월건 (절기 경계에서 안전한 지점)
    const solar = Solar.fromYmdHms(y, m, 15, 12, 0, 0);
    const lunar = solar.getLunar();
    const rawGanZhi: string = typeof lunar.getMonthInGanZhiExact === 'function'
      ? lunar.getMonthInGanZhiExact()
      : lunar.getMonthInGanZhi();
    // 충/합·십성 비교를 위해 원국과 같은 한글 표기로 정규화
    const ganZhi = normalizeGanZhi(rawGanZhi);

    const mGan = ganZhi.charAt(0);
    const mZhi = ganZhi.charAt(1);
    const ganSS = calculateShiShen(dayGan, mGan, true);
    const zhiSS = calculateShiShen(dayGan, mZhi, false);

    const hasChung = natalZhis.some(z => ZHI_CHUNG[z] === mZhi);
    const hasHap = natalZhis.some(z => ZHI_HAP[z] === mZhi);

    const groups = [ssGroup(ganSS), ssGroup(zhiSS)];
    let moveScore = 0;
    let negoScore = 0;
    groups.forEach(g => {
      if (g === 'sikSang') { moveScore += 3; negoScore += 1; }
      if (g === 'jae') { negoScore += 3; }
      if (g === 'gwan') { moveScore += 1; }
      if (g === 'bi') { moveScore += 1; }
    });
    if (hasChung) moveScore += 2;
    if (hasHap) negoScore += 1;

    signals.push({ year: y, month: m, ganZhi, ganSS, zhiSS, hasChung, hasHap, moveScore, negoScore });
  }

  const peakMove = Math.max(...signals.map(s => s.moveScore));
  const peakIndex = signals.findIndex(s => s.moveScore === peakMove);

  let chungCount = 0;
  let hapCount = 0;

  return signals.map((s, idx) => {
    const isPeak = idx === peakIndex && peakMove >= 3;
    // 월지(계절 기운)를 우선 보고, 없으면 월간으로 대체한다
    const primarySS = SS_PROFILE[s.zhiSS] ? s.zhiSS : s.ganSS;
    const profile = SS_PROFILE[primarySS];

    let tone: MonthTone;
    let action: string;
    let description: string;

    if (profile) {
      tone = profile.tone;
      action = profile.action;
      description = profile.desc;
    } else {
      tone = 'calm';
      action = '탐색·숨 고르기';
      description = '뚜렷한 변동 신호가 없는 달입니다. 채용 시장을 조용히 관찰하고 관심 회사 리스트를 넓히는 탐색 구간으로 쓰세요.';
    }

    // 충·합은 월의 기본 성격 위에 덧붙는 변수로 처리한다. 같은 6개월 안에 충/합이 여러 번 겹칠 수 있어
    // 문장을 그대로 반복하면 복붙처럼 보이므로, 발생 순번에 따라 표현을 바꿔가며 붙인다.
    if (s.hasChung) {
      action = `${action}·변동 주의`;
      description += ` ${CHUNG_TAILS[chungCount % CHUNG_TAILS.length]}`;
      chungCount += 1;
    } else if (s.hasHap) {
      description += ` ${HAP_TAILS[hapCount % HAP_TAILS.length]}`;
      hapCount += 1;
    }

    return {
      year: s.year,
      month: s.month,
      ganZhi: s.ganZhi,
      label: `${s.month}월 [${action}]`,
      tone,
      description,
      isPeak,
    };
  });
}
