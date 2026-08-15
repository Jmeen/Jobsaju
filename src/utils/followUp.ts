import type { SajuCoreResult } from './sajuCore.ts';
import { buildVerdictView } from './reportViewModel.ts';
import { buildScoreView } from './scorePresentation.ts';
import { buildMonthlyFlow } from './monthlyFlow.ts';
import type { MonthPlan } from './monthlyFlow.ts';
import {
  assessFollowUpQuestion,
  buildRefusalMessage,
} from '../../workers/followUpPolicy.js';
import { FOLLOW_UP_MAX_LENGTH } from './followUpValidation.ts';
import type { FollowUpContext } from './followUpValidation.ts';

// 검증 쪽은 엔진 없이도 써야 해서 followUpValidation.ts로 분리했다.
// 기존 import 경로가 깨지지 않도록 여기서 그대로 다시 내보낸다.
export { FOLLOW_UP_MAX_LENGTH, validateFollowUpQuestion } from './followUpValidation.ts';
export type { FollowUpRecord, FollowUpContext } from './followUpValidation.ts';

/** 추가 질문의 의도 — 무엇을 묻는지에 따라 봐야 할 사주 신호가 다르다 */
export type FollowUpIntent =
  | 'industry'    // 업종·산업군·IT 유지
  | 'role'        // 직무·직책 전환·창업
  | 'timing'      // 언제 움직여야 하나
  | 'offer'       // 이 제안을 수락해도 되나
  | 'salary'      // 연봉·처우 협상
  | 'wait'        // 승진·약속을 기다릴까
  | 'quit'        // 먼저 퇴사하고 쉬어도 되나
  | 'people'      // 상사·동료 관계
  | 'compare'     // 두 선택지 비교
  | 'preparation' // 이력서·면접·준비 순서
  | 'general';

export function classifyFollowUp(question: string): FollowUpIntent {
  return assessFollowUpQuestion(question).primaryIntent as FollowUpIntent;
}

/** 앞으로 6개월 중 특정 성격의 달을 찾는다 */
function findMonth(flow: MonthPlan[], tones: MonthPlan['tone'][]): MonthPlan | undefined {
  return flow.find(m => tones.includes(m.tone));
}

function monthLabel(m: MonthPlan | undefined): string {
  return m ? `${m.month}월` : '';
}

/**
 * 백엔드가 없을 때의 폴백 답변.
 *
 * 핵심 원칙: 질문이 무엇인지 먼저 판별하고, 그 질문에 직접 답한다.
 * (예전 버전은 질문을 인용만 하고 매번 같은 총평을 돌려줘서 "엉뚱한 답"이 됐다)
 */
export function buildLocalFollowUpAnswer(
  question: string,
  saju: SajuCoreResult,
  context: FollowUpContext = {},
): string {
  const assessment = assessFollowUpQuestion(question);
  if (!assessment.allowed) return buildRefusalMessage(assessment);
  const intent = assessment.primaryIntent as FollowUpIntent;
  const verdict = buildVerdictView(saju.scores);
  const move = buildScoreView('jobChange', saju.scores.jobChange);
  const stay = buildScoreView('stay', saju.scores.stay);
  const nego = buildScoreView('negotiation', saju.scores.negotiation);

  const natalZhis = [
    saju.pillars.year.zhi,
    saju.pillars.month.zhi,
    saju.pillars.day.zhi,
    ...(saju.pillars.hour.zhi ? [saju.pillars.hour.zhi] : []),
  ];
  const flow = buildMonthlyFlow(saju.dayGan.char, natalZhis, 6);
  const thisMonth = flow[0];
  // 지원·면접 시기를 물으면 실제로 '움직이는' 성격의 달만 고른다.
  // 없으면 없다고 답한다 — 평가·압박 성격의 달을 "지원하기 좋은 달"로 둘러대지 않는다.
  const movePeak = findMonth(flow, ['move']);
  const negoMonth = findMonth(flow, ['nego']);
  const docMonth = findMonth(flow, ['doc']);
  const pressMonth = findMonth(flow, ['press']);

  const strong = saju.bodyStrength > 0.2 ? 'strong' : saju.bodyStrength < -0.2 ? 'weak' : 'balanced';

  // 질문 유형별 직접 답변
  const answers: Record<FollowUpIntent, () => string[]> = {
    industry: () => {
      const currentJob = context.current_job?.trim();
      const careerGoal = context.career_goal?.trim();
      return [
        currentJob
          ? `${currentJob} 경력을 바로 버리기보다, 지금까지 쌓은 경험이 통하는 인접 산업부터 검토하는 편이 안전합니다.`
          : `현재 업종을 바로 떠나기보다, 지금까지 쌓은 직무 경험이 통하는 인접 산업부터 검토하는 편이 안전합니다.`,
        careerGoal
          ? `${careerGoal}을 목표로 한다면 특정 업종 이름을 사주만으로 고르기보다, 그 목표와 연결되는 공고 10개를 모아 요구 역량을 비교해 보세요. 현재 경험과 60~70% 이상 겹치는 산업은 전환 비용이 낮고, 부족한 역량이 공통으로 반복되면 먼저 작은 프로젝트로 검증하는 편이 낫습니다.`
          : `특정 업종을 사주만으로 정할 수는 없습니다. 관심 산업의 공고 10개를 모아 현재 경험과 겹치는 요구 역량을 표시하고, 60~70% 이상 겹치는 곳부터 현직자 인터뷰와 지원 반응으로 확인해 보세요.`,
        `IT를 유지할지는 기술 자체보다 지금 가진 도메인 지식·문제 해결 경험·협업 방식이 다음 회사에서 얼마나 인정되는지로 판단해야 합니다. 완전 전환은 인접 산업에서 반응이 없을 때 두 번째 선택지로 두는 것이 좋습니다.`,
      ];
    },
    role: () => [
      `직무나 커리어 방향을 바꾸려면 퇴사보다 시장 검증이 먼저입니다. ${context.current_job ? `${context.current_job}에서 해온 일 중 새 역할에서도 증명할 수 있는 결과를 먼저 고르세요.` : '현재 역할에서 새 직무에도 가져갈 수 있는 결과를 먼저 고르세요.'}`,
      `새 분야의 작은 결과물 두 개와 현직자 인터뷰 두 건을 만든 뒤 실제 공고에 지원해 반응을 보세요. ${context.career_goal ? `${context.career_goal}이라는 목표가 있다면 직함보다 실제 책임과 요구 역량이 이어지는지를 확인해야 합니다.` : '직함보다 실제 책임과 요구 역량이 이어지는지를 확인해야 합니다.'}`,
      strong === 'strong'
        ? `스스로 판을 여는 힘은 있지만 수익이나 채용 반응을 확인하기 전에 조직을 떠나면 준비 기간이 생계에 쫓길 수 있습니다.`
        : `혼자 개척하는 구조보다 팀·플랫폼·기존 고객처럼 기댈 기반이 있는 형태의 전환이 더 안정적입니다.`,
    ],
    preparation: () => [
      `준비 순서부터 답하면, 목표 공고를 먼저 모으고 그 공고가 반복해서 요구하는 역량에 맞춰 이력서와 사례를 고치는 것이 첫 단계입니다.`,
      context.current_job
        ? `${context.current_job}에서 만든 성과 중 목표 역할과 가장 가까운 사례 하나를 문제·행동·결과 순서로 정리하세요. 입력에 없는 성과는 가정하지 말고, 실제 수치가 없다면 범위와 전후 변화를 설명하면 됩니다.`
        : `현재 경력에서 목표 역할과 가장 가까운 사례 하나를 문제·행동·결과 순서로 정리하세요.`,
      `그 다음 현직자 한 명에게 이력서가 아니라 역할 적합성을 물어보고, 작은 규모로 지원해 시장 반응을 확인하세요. 반응이 없으면 시기보다 포지셔닝을 먼저 수정해야 합니다.`,
    ],
    timing: () => {
      const target = movePeak;
      return [
        target
          ? `움직일 시점을 묻는 질문이니 시기부터 답하면, 앞으로 6개월 중 ${monthLabel(target)}이 지원과 면접에 가장 맞는 달입니다. ${target.description}`
          : `앞으로 6개월 안에는 지원·면접에 특별히 힘이 실리는 달이 보이지 않습니다. 시기를 노리기보다, 좋은 공고가 열릴 때 바로 움직일 수 있게 서류를 미리 준비해 두는 편이 낫습니다.`,
        `지금(${thisMonth.month}월)은 ${thisMonth.label.replace(/^\d+월 \[|\]$/g, '')} 구간입니다. ${target && target.month !== thisMonth.month ? `그래서 ${monthLabel(target)} 전까지 이력서와 포트폴리오를 끝내두고, 그 달에 실제 지원을 몰아치는 순서가 유리합니다.` : `${negoMonth ? `조건을 다루기 좋은 ${monthLabel(negoMonth)}과 ` : ''}이번 달의 흐름을 활용해 준비를 앞당기는 편이 낫습니다.`}`,
        `다만 이직운 자체는 ${move.headline} 수준이라, ${move.tone === 'low' ? '이번 사이클에 무리해서 옮기기보다 다음 흐름을 준비하는 편이 안전합니다.' : '시기를 맞추면 반응이 따라올 가능성이 높습니다.'}`,
      ];
    },
    salary: () => {
      const target = negoMonth;
      return [
        `연봉·처우에 관한 질문이니 협상 신호부터 보면 — ${nego.headline}입니다. ${nego.detail}`,
        target
          ? `시기로는 ${monthLabel(target)}이 가장 유리합니다. ${target.description}`
          : `앞으로 6개월 안에는 재물운이 크게 열리는 달이 없으니, 시기보다 근거의 완성도로 승부해야 합니다. 최근 성과 세 가지와 동종 직무의 보상 범위를 한 장으로 정리하는 것이 먼저입니다.`,
        strong === 'weak'
          ? `기질적으로 신약한 편이라 혼자 정면으로 요구하기보다, 시장 데이터와 성과 문서를 근거로 삼고 우호적인 중재자(리더·헤드헌터)를 거치는 방식이 통과율이 높습니다.`
          : `기질적으로 밀어붙이는 힘이 있으니, 원하는 숫자를 먼저 제시하고 근거로 방어하는 방식이 잘 맞습니다. 다만 감정이 실리면 요구가 불만으로 들리니 문서로 말하세요.`,
      ];
    },
    offer: () => [
      `제안을 받아들일지에 대한 질문이니 이동 신호부터 보면, 이직 쪽은 ${move.headline}, 잔류 쪽은 ${stay.headline}입니다. ${move.score >= stay.score ? '흐름은 이동 쪽에 조금 더 서 있습니다.' : '흐름은 오히려 지금 자리를 지키는 쪽에 서 있습니다.'}`,
      `다만 사주가 특정 회사의 좋고 나쁨을 알려주지는 않습니다. 수락 전에 확인할 것은 세 가지입니다 — 입사 후 90일에 기대하는 결과가 명확한지, 책임에 맞는 결정권이 있는지, 평가·보상 기준을 문서로 받을 수 있는지. 이 중 둘 이상이 모호하면 연봉이 올라도 같은 고민이 반복됩니다.`,
      docMonth
        ? `계약서와 처우 문서를 꼼꼼히 볼 달로는 ${monthLabel(docMonth)}이 좋습니다. 서명 시점을 조율할 수 있다면 그 달로 당겨보세요.`
        : `서명 전에 근로계약서의 업무 범위·수습 조건·성과급 산정 방식을 문장 단위로 확인하세요.`,
    ],
    wait: () => [
      `기다릴지 말지를 묻는 질문이니 잔류 신호부터 답하면 — ${stay.headline}입니다. ${stay.detail}`,
      stay.tone === 'elite' || stay.tone === 'high'
        ? `흐름상 기다림이 낭비가 되지 않는 시기입니다. 다만 조건 없이 기다리지 말고, 승진·역할 확대의 시점과 기준을 문서나 메일로 남겨두세요. 날짜와 조건이 없는 약속은 근거로 계산하지 않는 편이 안전합니다.`
        : `흐름상 무한정 기다리기에는 얻을 것이 빠르게 줄고 있습니다. 기다리더라도 기한을 정하고, 그 안에 약속이 문서로 확인되지 않으면 외부 탐색을 병행하는 조건부 잔류가 맞습니다.`,
      pressMonth
        ? `${monthLabel(pressMonth)}에 조직 내 평가·압박이 커지는 흐름이 있어, 그 시점이 약속의 진위를 확인할 자연스러운 기회가 됩니다.`
        : `기다리는 동안에도 성과 기록은 계속 쌓아두세요. 잔류의 협상 카드도 결국 기록에서 나옵니다.`,
    ],
    quit: () => [
      `먼저 그만두고 쉬어도 되는지에 대한 질문이라면, 사주보다 현금 흐름이 먼저입니다. 생활비 몇 개월분이 준비되어 있는지에 따라 답이 갈립니다. 6개월 이상이면 회복과 탐색을 병행할 여지가 있고, 3개월 미만이면 재직 중 탐색이 훨씬 안전합니다.`,
      `흐름으로만 보면 이직 쪽은 ${move.headline}입니다. ${move.tone === 'low' ? '지금 공백을 만들면 그 기간이 길어질 위험이 있으니, 쉬더라도 복귀 시점을 미리 정해두세요.' : '공백을 두더라도 시장이 반응하는 시기라 복귀는 비교적 수월할 수 있습니다.'}`,
      strong === 'weak'
        ? `신약한 기질은 쉬는 동안 리듬이 흐트러지면 회복이 오래 걸립니다. 쉬는 기간에도 주 1회 업계 사람을 만나는 정도의 최소 연결은 유지하세요.`
        : `밀어붙이는 기질이라 쉬는 중에도 무언가를 벌이기 쉽습니다. 회복이 목적이라면 첫 한 달은 의도적으로 아무 계획도 넣지 않는 편이 낫습니다.`,
    ],
    people: () => [
      `사람과의 관계에 대한 질문이니 그 부분부터 답하면, 관계 갈등은 대개 성격이 아니라 역할 경계에서 옵니다. 지금 힘든 지점이 "일이 겹친다"인지 "평가가 불공정하다"인지 "말투가 상처가 된다"인지 먼저 나눠보세요. 앞의 둘은 구조로 풀리고, 마지막 하나만 사람의 문제입니다.`,
      pressMonth
        ? `흐름으로는 ${monthLabel(pressMonth)}에 조직의 압박이 커집니다. ${pressMonth.description}`
        : `앞으로 6개월 안에 조직 압박이 크게 올라가는 달은 보이지 않습니다. 지금의 긴장은 일시적 국면일 가능성이 있습니다.`,
      `참고로 잔류 쪽은 ${stay.headline}입니다. ${stay.tone === 'low' ? '관계 때문만이 아니라 이 자리에서 얻을 것 자체가 줄고 있어, 사람 문제를 견디며 남을 이유는 약합니다.' : '이 자리에서 얻을 것은 아직 남아 있으니, 사람 하나 때문에 전부를 정리하기 전에 역할 조정이나 보고선 변경을 먼저 요청해 보세요.'}`,
    ],
    compare: () => [
      `두 선택지를 비교하는 질문이니 기준부터 정리하면, 지금 사주에서 가장 힘이 실린 방향은 ${verdict.title.replace(/^지금은 /, '').replace(/입니다\.$/, '')} 쪽입니다.`,
      `비교는 감정이 아니라 같은 항목으로 해야 합니다. 보상, 역할과 권한, 성장 경로, 생활 리듬, 함께 일할 리더 — 이 다섯 항목에 각 선택지를 점수로 매겨보세요. 총점이 아니라 "절대 포기 못 하는 항목"에서 이기는 쪽이 답인 경우가 많습니다.`,
      `참고로 세 흐름은 ${move.headline}, ${stay.headline}, ${nego.headline}입니다. 비교 결과가 팽팽하다면 점수보다 실제 보상·역할·생활 조건에서 우선순위를 정하세요.`,
    ],
    general: () => [
      `현재 입력만으로 답할 수 있는 범위에서는 ${verdict.action.title}`,
      `${verdict.action.desc} 이 판단이 질문하신 상황과 맞는지는 연봉·역할·리더·생활 리듬 중 실제로 달라지는 조건을 먼저 확인해야 합니다.`,
      thisMonth
        ? `이번 달(${thisMonth.month}월)은 ${thisMonth.label.replace(/^\d+월 \[|\]$/g, '')} 구간이라, ${thisMonth.description}`
        : '',
    ],
  };

  const body = answers[intent]().filter(Boolean).join('\n\n');
  const tail = '\n\n사주는 방향을 좁혀주는 참고 자료이고, 최종 판단은 확인한 조건과 감당 가능한 위험을 기준으로 내리시는 편이 좋습니다.';
  return body + tail;
}
