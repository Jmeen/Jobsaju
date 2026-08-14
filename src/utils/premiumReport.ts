import type { CareerScores } from './reportViewModel.ts';
import { buildVerdictView } from './reportViewModel.ts';
import { buildScoreView, buildTopScore } from './scorePresentation.ts';
import { GAN_MAP } from './sajuCore.ts';

type CareerContext = {
  currentStatus: string;
  currentJob: string;
  careerGoal: string;
  desiredAnswer: string;
};

/** 사주에서 오는 개인화 신호. 없으면 중립 템플릿으로 동작한다. */
export type SajuSignals = {
  dayGan?: string;       // 한글 일간 (갑~계)
  bodyStrength?: number; // -1(신약) ~ +1(신강)
};

export function analyzeDecisionFactors(context: CareerContext) {
  const question = context.desiredAnswer.trim() || '지금 이직을 준비하는 것이 맞을지';
  const combined = `${context.currentStatus} ${context.currentJob} ${context.careerGoal} ${question}`;
  const summary = (explanation: string) => `입력에서 드러난 핵심 결정 조건은 “${question}”입니다. ${explanation}`;

  if (/생활비\s*12개월|12개월분/.test(combined)) {
    return {
      summary: summary('생활비 12개월은 선택을 서두르지 않고 회복과 탐색을 병행할 수 있는 재무 완충 장치입니다.'),
      recommendation: '선퇴사를 검토할 여지는 있습니다. 다만 막연히 쉬기보다 회복 기간, 탐색 시작일, 월 지출 상한을 먼저 정해 두는 편이 안전합니다.',
      checks: ['회복 기간과 구직 시작일을 달력에 함께 적기', '보험·대출·고정비를 뺀 실제 가용 개월 수 다시 계산하기', '쉬는 동안 확인할 목표 직무의 현직자 인터뷰 두 건 잡기'],
    };
  }
  if (/한 달 생활비|저축이\s*(한|1)\s*달|저축이 거의/.test(combined)) {
    return {
      summary: summary('한 달 생활비만 남은 상태에서는 구직이 길어질수록 원하는 조건보다 당장의 현금 흐름에 끌려갈 가능성이 큽니다.'),
      recommendation: '특별한 건강·안전 문제가 아니라면 선퇴사보다 재직 중 탐색을 우선하고, 업무 강도를 낮출 임시 조치를 함께 협상하는 편이 낫습니다.',
      checks: ['최소 생활비 3~6개월 확보 시점 계산하기', '연차·휴직·업무 조정 가능성 확인하기', '오퍼 서명 전 퇴사일을 확정하지 않기'],
    };
  }
  if (/하루\s*(세|3)\s*시간/.test(combined)) {
    return {
      summary: summary('하루 세 시간 출퇴근은 연봉과 별개로 매주 약 15시간을 고정 지출하게 만드는 근무 조건입니다.'),
      recommendation: '인상된 연봉을 주당 소요 시간으로 다시 환산하고, 주 2회 이하 출근이나 시차 출근을 서면으로 합의할 수 있을 때만 수용 범위를 넓혀 보세요.',
      checks: ['출근 빈도와 예외 상황을 계약 전 확인하기', '왕복 교통비와 월 60시간의 시간 비용 계산하기', '수습 기간 뒤 정책 변경 가능성 묻기'],
    };
  }
  if (/완전 재택|주\s*4일 재택|원격/.test(combined)) {
    return {
      summary: summary('완전 재택 또는 높은 재택 비중은 생활 리듬을 지키는 장점이 있지만, 협업 방식과 평가 기준이 모호하면 성장 체감이 낮아질 수 있습니다.'),
      recommendation: '재택 여부만 보지 말고 문서 중심 협업, 리더와의 1:1 주기, 승진 사례를 확인하세요. 이 세 가지가 갖춰졌다면 낮은 연봉 인상률을 보완하는 실질 가치가 있습니다.',
      checks: ['재택 정책이 계약 또는 사규에 명시되는지 확인하기', '원격 구성원의 최근 승진 사례 묻기', '핵심 회의 시간대와 긴급 대응 규칙 확인하기'],
    };
  }
  if (/매일 출근/.test(combined)) {
    return {
      summary: summary('매일 출근은 단순 선호가 아니라 돌봄 일정과 업무 지속 가능성에 직접 영향을 주는 제약입니다.'),
      recommendation: '입사 뒤 바뀔 것이라는 기대는 빼고 현재 조건 그대로 6개월을 유지할 수 있는지 판단하세요. 어렵다면 출근 일수 조정이 오퍼 단계에서 합의돼야 합니다.',
      checks: ['돌봄 공백 시간과 대체 비용 계산하기', '코어타임·시차 출근 가능 여부 확인하기', '팀 단위 예외가 실제로 운영되는지 묻기'],
    };
  }
  if (/인사권|예산권/.test(combined)) {
    return {
      summary: summary('리더 직함보다 인사권과 예산권의 범위가 실제 성과를 만들 수 있는지를 결정합니다.'),
      recommendation: '직함을 수락하기 전에 채용·평가·예산 승인 중 무엇을 독자적으로 결정할 수 있는지 R&R 문서로 확인하세요.',
      checks: ['직접 채용 가능한 인원 수 확인하기', '예산 승인 한도와 최종 결재자 묻기', '첫 90일 성과 목표를 문서로 맞추기'],
    };
  }
  if (/시니어\s*IC|스태프 엔지니어/.test(combined)) {
    return {
      summary: summary('사람 관리보다 전문 문제 해결을 선호한다면 시니어 IC 경로의 직급 상한과 영향력 범위를 먼저 봐야 합니다.'),
      recommendation: '관리자 전환을 당연한 승진으로 보지 말고, 시니어 IC가 어떤 의사결정에 참여하며 다음 단계로 어떻게 승진하는지 확인하세요.',
      checks: ['IC 직급 체계의 최고 단계 확인하기', '기술·제품 의사결정 참여 범위 묻기', '최근 시니어 IC 승진 사례 확인하기'],
    };
  }
  if (/구두 약속/.test(combined)) {
    return {
      summary: summary('구두 약속은 담당자나 상황이 바뀌면 검증하기 어려우므로 잔류 판단의 근거로는 약합니다.'),
      recommendation: '승진 시점, 직급, 보상 범위, 승인자를 문서로 받기 전에는 확정된 제안으로 계산하지 마세요. 문서화가 거절되면 외부 탐색을 계속하는 편이 합리적입니다.',
      checks: ['약속한 날짜와 승인자를 이메일에 남기기', '달성 조건을 수치로 합의하기', '기한이 지나면 이직 탐색을 재개할 기준 정하기'],
    };
  }
  if (/문서|서면/.test(combined) && /승진|보상|약속/.test(combined)) {
    return {
      summary: summary('승진과 보상 조정이 문서로 남아 있다면 구두 약속보다 실행 가능성을 검증하기 좋습니다.'),
      recommendation: '잔류를 검토할 수 있지만 문서의 날짜, 조건, 최종 승인자가 명확한지 확인하세요. 세 항목 중 하나라도 비어 있으면 추가 합의가 필요합니다.',
      checks: ['적용 날짜와 새 직급 확인하기', '고정급·변동급 범위를 분리해 확인하기', '조건 불이행 시 다시 판단할 날짜 정하기'],
    };
  }
  if (/CRO|Chief Revenue Officer|전체 퍼널/.test(combined)) {
    return {
      summary: summary('CRO는 영업만이 아니라 마케팅·영업·고객 성공을 잇는 전체 퍼널의 매출 책임을 맡는 자리로 봐야 합니다.'),
      recommendation: '직함보다 매출 목표, 가격 결정권, 세 조직에 대한 인사권이 함께 주어지는지 확인하세요. 한 기능만 책임진다면 CRO보다 기능 책임자에 가까울 수 있습니다.',
      checks: ['매출 목표와 책임 범위 확인하기', '마케팅·영업·고객 성공 보고 체계 확인하기', '가격·할인 승인 권한 묻기'],
    };
  }
  if (/Chief Sales Officer|영업 조직/.test(combined) && /CSO/.test(combined)) {
    return {
      summary: summary('Chief Sales Officer는 영업 조직과 수주 성과를 중심으로 평가받는 역할입니다.'),
      recommendation: '영업 인력, 파이프라인, 수주 목표에 대한 권한이 있는지 확인하고 전사 전략 역할과 섞여 있지 않은지 구분하세요.',
      checks: ['담당 영업 조직과 지역 범위 확인하기', '수주 목표와 보상 구조 묻기', '마케팅·고객 성공과의 책임 경계 확인하기'],
    };
  }
  if (/Chief Strategy Officer|전사 전략|M&A/.test(combined)) {
    return {
      summary: summary('Chief Strategy Officer는 전사 전략, 포트폴리오, 투자·M&A처럼 중장기 방향을 설계하는 역할입니다.'),
      recommendation: 'CEO와의 보고 관계, 전략 실행 조직, 이사회 안건 참여 범위를 확인하세요. 분석 자료만 만드는 참모 역할인지 실행 권한까지 있는지가 핵심입니다.',
      checks: ['CEO 직속 여부 확인하기', '전략 실행 인력과 예산 확인하기', '이사회·투자 의사결정 참여 범위 묻기'],
    };
  }
  if (/CSO|COO|CRO/.test(combined)) {
    return {
      summary: summary('임원 약어만으로는 실제 책임을 확정할 수 없습니다. 같은 CSO라도 전략 또는 영업을 뜻할 수 있고 COO와 CRO도 권한 경계가 회사마다 다릅니다.'),
      recommendation: '직함을 고르기 전에 손익 책임, 조직 보고선, 의사결정권 세 가지를 표로 비교하세요. 약어 해석이 확인되기 전에는 어느 직함이 맞다고 단정하지 않는 편이 안전합니다.',
      checks: ['정식 영문 직함 확인하기', '직속 조직과 보고 대상 확인하기', '손익·인사·예산 권한 비교하기'],
    };
  }
  if (/구조조정/.test(combined)) {
    return {
      summary: summary('구조조정은 개인의 성장 고민과 별개로 고용 안정성 자체를 낮추는 외부 변수입니다.'),
      recommendation: '당장 사직하기보다 재직 상태에서 탐색 속도를 높이고, 퇴직 조건과 현금 여유를 먼저 확인하세요.',
      checks: ['퇴직금·실업급여 조건 확인하기', '핵심 성과 자료를 개인 기록으로 정리하기', '2주 안에 목표 회사 다섯 곳 접촉하기'],
    };
  }
  if (/2년째|성장이 멈/.test(combined)) {
    return {
      summary: summary('2년째 역할과 학습이 정체됐다면 회사의 안정성과 별개로 경력 자산이 늘고 있는지 따져야 합니다.'),
      recommendation: '내부 이동이나 신규 책임을 60일 안에 시험해 보고, 변화가 없으면 외부 탐색을 병행하는 기한부 잔류가 적절합니다.',
      checks: ['60일 안에 맡을 새 책임 합의하기', '내부 이동 가능한 팀 확인하기', '외부 시장에서 현재 경력의 평가 확인하기'],
    };
  }
  if (/대기업 전문 조직/.test(combined)) {
    return {
      summary: summary('대기업 전문 조직은 역할의 깊이와 자원을 얻기 쉬운 대신 담당 범위가 좁아질 수 있습니다.'),
      recommendation: '전문성의 깊이가 다음 직급으로 이어지는지, 다른 기능과 협업해 사업 전체를 볼 기회가 있는지를 함께 확인하세요.',
      checks: ['담당 채널과 의사결정 범위 확인하기', '직급별 기대 역량 확인하기', '부서 이동 사례 묻기'],
    };
  }
  if (/프로젝트 선택권/.test(combined) && /대기업|정규직|안정/.test(combined)) {
    return {
      summary: summary('대기업 정규직의 안정성을 얻는 대신 프로젝트 선택권이 줄어드는 선택이므로, 자유의 감소를 어떤 자원과 경력 경로로 보상받는지가 핵심입니다.'),
      recommendation: '정규직 전환 자체보다 콘텐츠 디자인의 소유 범위, 승진 경로, 전문 교육 자원을 확인하세요. 선택권 감소를 깊이 있는 대표 사례와 안정적인 보상으로 바꿀 수 있다면 수용할 이유가 생깁니다.',
      checks: ['직접 고를 수 있는 프로젝트 비율 확인하기', '콘텐츠 디자인 직급과 승진 사례 묻기', '포트폴리오 공개 가능 범위 확인하기'],
    };
  }
  if (/초기 스타트업|전체 퍼널/.test(combined)) {
    return {
      summary: summary('넓은 역할과 프로젝트 선택권은 성장 기회가 될 수 있지만 우선순위와 권한이 불명확하면 잡무의 범위만 넓어질 수 있습니다.'),
      recommendation: '첫 90일에 직접 결정할 영역, 포기할 업무, 성과 지표를 합의할 수 있을 때 선택권을 실질 권한으로 평가하세요.',
      checks: ['첫 90일 우선순위 세 가지 확인하기', '거절할 수 있는 업무 범위 묻기', '의사결정 최종 책임자 확인하기'],
    };
  }
  if (/야근이 적은|회복/.test(combined)) {
    return {
      summary: summary('지금의 우선순위가 회복이라면 업무 강도는 부가 조건이 아니라 다음 선택을 지속할 수 있게 하는 핵심 조건입니다.'),
      recommendation: '평균 퇴근 시간, 긴급 대응 빈도, 휴가 사용률을 실제 팀 구성원에게 확인하고 회복 가능한 리듬을 먼저 확보하세요.',
      checks: ['최근 한 달 야간 대응 횟수 묻기', '휴가 중 대체 인력 체계 확인하기', '업무량이 급증하는 시기 확인하기'],
    };
  }
  if (/IPO/.test(combined)) {
    return {
      summary: summary('IPO 준비 경험은 밀도 높은 성장 자산이 될 수 있지만 업무 강도와 성공 불확실성을 함께 감수하는 선택입니다.'),
      recommendation: 'IPO 자체보다 본인이 맡을 산출물, 의사결정권, 실패해도 남는 경력 자산을 확인한 뒤 선택하세요.',
      checks: ['직접 소유할 IPO 과제 확인하기', '예상 업무 강도와 보상 구조 묻기', '일정 지연 시 역할 변화 확인하기'],
    };
  }
  if (/데이터 분석가/.test(combined)) {
    return {
      summary: summary('데이터 분석가 전환은 관심만으로 판단하기보다 SQL·통계·분석 포트폴리오로 시장 반응을 먼저 확인할 수 있습니다.'),
      recommendation: '퇴사 전 작은 분석 프로젝트 두 개와 실무자 인터뷰를 마치고, 실제 지원 반응으로 전환 가능성을 검증하세요.',
      checks: ['SQL 기반 포트폴리오 두 개 만들기', '목표 공고 열 건의 공통 요건 정리하기', '현직자 인터뷰 두 건 진행하기'],
    };
  }
  if (/프로덕트 매니저|PM/.test(combined)) {
    return {
      summary: summary('프로덕트 매니저 전환은 기획 문서보다 문제 정의, 우선순위 결정, 협업 설득 경험을 증명하는 일이 중요합니다.'),
      recommendation: '현재 역할에서 제품 문제 하나를 정의하고 지표·이해관계자·결과까지 묶은 사례를 만든 뒤 지원 반응을 확인하세요.',
      checks: ['문제 정의 사례 한 개 작성하기', '우선순위 갈등을 해결한 경험 정리하기', '목표 PM 공고의 도메인 요건 비교하기'],
    };
  }
  if (/연봉\s*\d+%/.test(combined)) {
    const salary = combined.match(/연봉\s*\d+%/)?.[0] ?? '연봉 인상';
    return {
      summary: summary(`${salary}은 분명한 장점이지만 역할 범위와 다음 경력 단계가 함께 좋아지는지 봐야 합니다.`),
      recommendation: '세후 월 증가액과 추가 근무 시간을 함께 계산하고, 2년 뒤 이력서에 남을 책임이 무엇인지 확인한 뒤 결정하세요.',
      checks: ['세후 월 증가액 계산하기', '성과 평가와 변동급 기준 확인하기', '2년 뒤 얻게 될 책임을 한 문장으로 적기'],
    };
  }
  if (/대용량 트래픽/.test(combined)) {
    return {
      summary: summary('대용량 트래픽 경험은 백엔드 경력의 시장 가치를 높일 수 있지만 실제 소유 범위가 있어야 자산으로 남습니다.'),
      recommendation: '트래픽 규모만 듣지 말고 설계·장애 대응·용량 계획 중 무엇을 직접 맡는지 확인하세요.',
      checks: ['평균·피크 트래픽 수치 묻기', '본인이 소유할 시스템 범위 확인하기', '온콜 빈도와 장애 회고 방식 확인하기'],
    };
  }

  return {
    summary: summary('이 조건을 보상, 역할, 성장, 생활 리듬 중 어디에 둘지 먼저 정해야 선택지를 같은 기준으로 비교할 수 있습니다.'),
    recommendation: '원하는 조건 세 가지와 받아들일 수 없는 조건 세 가지를 정하고, 현재 회사와 후보 회사를 같은 표에서 비교하세요.',
    checks: ['필수 조건 세 가지 적기', '포기 가능한 조건 세 가지 적기', '실제 면접에서 가설 확인하기'],
  };
}

export function summarizeCareerIntent(context: CareerContext) {
  const combined = `${context.currentJob} ${context.careerGoal} ${context.desiredAnswer}`.toLowerCase();
  const mentionsCso = /\bcso\b/i.test(combined);
  const mentionsCro = /\bcro\b/i.test(combined);
  const revenueSignals = /(매출|영업|세일즈|고객성공|customer success|마케팅|수익|revenue|revops|파이프라인|매출 예측)/i.test(combined);
  const strategySignals = /(전사 전략|사업 전략|포트폴리오|신사업|m&a|중장기 전략|strategy)/i.test(combined);
  const salesSignals = /(영업 조직|세일즈 조직|수주|영업 전략|sales)/i.test(combined);

  let roleInterpretation = context.careerGoal.trim() || '목표 직함이 아직 구체적으로 정해지지 않았습니다.';
  let needsClarification = false;

  if (mentionsCro && revenueSignals) {
    roleInterpretation = 'CRO(Chief Revenue Officer), 즉 영업·마케팅·고객성공을 연결해 전체 매출 성장을 책임지는 역할을 우선 목표로 이해했습니다.';
  } else if (mentionsCso && strategySignals) {
    roleInterpretation = 'CSO(Chief Strategy Officer), 즉 전사 전략과 성장 방향을 설계하는 역할을 우선 목표로 이해했습니다.';
  } else if (mentionsCso && salesSignals && !mentionsCro) {
    roleInterpretation = 'CSO(Chief Sales Officer), 즉 영업 조직과 수주 성과를 총괄하는 역할을 우선 목표로 이해했습니다.';
  } else if (mentionsCso || mentionsCro) {
    needsClarification = true;
    roleInterpretation = 'CSO가 Chief Strategy Officer인지 Chief Sales Officer인지, 또는 CRO를 목표로 하는지 입력만으로는 확정하기 어렵습니다. 현재 리포트에서는 세 직함을 합치지 않고 후보로만 다룹니다.';
  }

  const decision = context.desiredAnswer.trim()
    ? context.desiredAnswer.trim()
    : `${context.currentStatus.trim() || '현재 상황'}에서 이직과 잔류 중 어느 선택이 유리한지 알고 싶어 합니다.`;

  return {
    primary_question: decision,
    role_interpretation: roleInterpretation,
    assumptions: needsClarification
      ? ['직함의 정식 영문명과 실제 책임 범위는 아직 확인되지 않았습니다.', '사주 해석보다 채용 공고의 책임 범위와 보고 체계를 우선 확인해야 합니다.']
      : ['직함보다 현재 입력한 실제 책임과 목표를 기준으로 해석했습니다.'],
    needs_clarification: needsClarification,
  };
}

// === 사주 신호별 템플릿 ===
// 같은 폴백이라도 일간 오행 × 신강신약 × 점수 등급에 따라 다른 문장이 나가야 한다.
// (테스터 두 명이 동일한 리포트를 받는 문제의 재발 방지)

const ELEMENT_NATURE: Record<string, { flow: string; content: (job: string, goal: string) => string; strengths: string[]; cautions: string[] }> = {
  목: {
    flow: '목(木)의 시작하는 기운',
    content: (job, goal) => `${job}에서는 새 판을 열고 방향을 먼저 제시할 때 힘이 붙는 목(木) 기질입니다. 이미 완성된 체계를 지키는 일보다 부족한 것을 찾아 키우는 일이 잘 맞고, 성장하는 조직에서 존재감이 커집니다.\n\n다만 벌인 일을 수습하기 전에 다음 일을 시작하는 패턴이 반복되면 성과가 흩어집니다. ${goal}로 가는 길에서도 대표 성과 한두 개를 끝까지 완성해 이름 붙이는 것이 여러 개를 벌이는 것보다 빠릅니다.`,
    strengths: ['새로운 판을 여는 추진력', '방향을 먼저 제시하는 리더십', '빠른 학습과 확장력'],
    cautions: ['마무리 전에 새 일을 벌이는 패턴', '성장 정체를 견디기 어려워하는 조급함'],
  },
  화: {
    flow: '화(火)의 드러내는 기운',
    content: (job, goal) => `${job}에서는 사람을 설득하고 에너지를 전파할 때 가장 빛나는 화(火) 기질입니다. 발표·미팅·협업처럼 사람 앞에 서는 순간이 실력 이상의 평가를 만들어 주고, 조용히 묻히는 자리에서는 답답함이 빨리 옵니다.\n\n반면 감정의 진폭이 커서 인정받지 못하는 시기에 소진이 빠르게 옵니다. ${goal}를 노린다면 성과를 말로만 알리지 말고 문서와 숫자로도 남겨서, 열정이 식은 날에도 증거가 말하게 만들어 두세요.`,
    strengths: ['설득과 표현으로 판을 움직이는 힘', '팀에 에너지를 불어넣는 존재감', '기회를 알아보는 빠른 감각'],
    cautions: ['인정받지 못할 때 빠르게 오는 소진', '기분에 따라 흔들리는 업무 페이스'],
  },
  토: {
    flow: '토(土)의 지키는 기운',
    content: (job, goal) => `${job}에서는 꾸준함과 신뢰로 평가받는 토(土) 기질입니다. 갈등을 중재하고 일정을 지키는 능력 덕분에 조직이 흔들릴수록 가치가 드러나고, 오래 있을수록 평판이 자산으로 쌓입니다.\n\n다만 안정을 지키려는 힘이 강해 변화 타이밍을 놓치기 쉽습니다. ${goal}에 다가가려면 "지금 자리가 나쁘지 않다"와 "지금 자리가 나를 키운다"를 구분하세요. 전자는 머무를 이유가 아니라 점검할 신호입니다.`,
    strengths: ['조직이 믿고 맡기는 안정감', '갈등을 조율하는 중재력', '장기전을 버티는 지구력'],
    cautions: ['변화 타이밍을 미루는 관성', '자기 성과를 드러내는 데 소극적인 태도'],
  },
  금: {
    flow: '금(金)의 맺고 끊는 기운',
    content: (job, goal) => `${job}에서는 기준과 완성도로 승부하는 금(金) 기질입니다. 애매한 것을 정리해 구조를 만들고, 한 번 결정하면 끝까지 실행하는 힘이 있어 품질과 마감으로 신뢰를 쌓습니다.\n\n다만 기준이 높은 만큼 스스로와 타인에게 엄격해져 협업 마찰이 생기거나, 완벽한 준비를 기다리다 기회를 흘려보낼 수 있습니다. ${goal}로 가는 결정도 100% 확신이 아니라 "충분히 확인된 70%"에서 움직이는 연습이 필요합니다.`,
    strengths: ['기준을 세우고 구조화하는 힘', '결정하면 끝까지 가는 실행력', '품질로 쌓는 신뢰'],
    cautions: ['완벽주의로 늦어지는 결단', '높은 기준이 만드는 협업 마찰'],
  },
  수: {
    flow: '수(水)의 읽어내는 기운',
    content: (job, goal) => `${job}에서는 판을 읽고 수를 내다보는 수(水) 기질입니다. 정보를 모아 맥락을 파악하는 힘이 좋아 전략·기획·분석이 잘 맞고, 상황이 바뀌어도 유연하게 경로를 다시 짭니다.\n\n다만 생각이 깊은 만큼 실행이 늦어지고, 결론을 혼자 내린 채 주변과 공유하지 않아 기회를 놓치기도 합니다. ${goal}에 필요한 것은 더 정교한 분석이 아니라, 이미 알고 있는 결론을 실제 행동(지원서·미팅 요청·협상 자리)으로 옮기는 마감일입니다.`,
    strengths: ['판을 읽는 전략적 사고', '변화에 유연하게 대응하는 적응력', '핵심을 짚는 통찰'],
    cautions: ['분석이 길어져 실기하는 패턴', '결론을 혼자만 알고 있는 습관'],
  },
};

const DEFAULT_NATURE = {
  flow: '균형 잡힌 기운',
  content: (job: string, goal: string) => `${job}에서는 목표가 분명하고 방법은 스스로 정할 수 있을 때 힘을 잘 씁니다. 문제를 정리하고 사람들을 설득하는 일이 잘 맞습니다.\n\n다음 회사를 볼 때는 이름값보다 누가 결정하고 무엇으로 평가하는지 물어보세요. ${goal}라는 제목만 달아주는 자리인지, 실제 권한이 있는 자리인지가 다릅니다.`,
  strengths: ['복잡한 문제를 구조화하는 힘', '상대의 요구를 읽고 조율하는 능력', '맡은 일을 끝까지 책임지는 지속력'],
  cautions: ['역할이 모호할 때 책임을 과하게 떠안는 경향', '불만을 오래 참다가 한 번에 결론 내리는 패턴'],
};

/**
 * 같은 오행이라도 양간(갑·병·무·경·임)과 음간(을·정·기·신·계)은 발현 방식이 다르다.
 * 이걸 반영하지 않으면 일간 10종이 오행 5종으로 뭉쳐 같은 문장이 나간다.
 */
const YINYANG_NUANCE: Record<string, { line: string; strength: string }> = {
  양: {
    line: '같은 기운이라도 양간(陽干)이라 겉으로 크게 드러나는 편입니다. 판을 키우고 정면으로 부딪히는 방식이 잘 통하니, 조용히 실력을 쌓아두기보다 눈에 보이는 자리에서 성과를 내는 편이 유리합니다.',
    strength: '정면 돌파로 판을 키우는 실행력',
  },
  음: {
    line: '같은 기운이라도 음간(陰干)이라 안으로 촘촘하게 쓰는 편입니다. 정면 충돌보다 관계와 완성도로 승부하는 방식이 잘 맞으니, 넓게 벌이기보다 확실한 한 곳에서 깊이를 증명하는 편이 유리합니다.',
    strength: '관계와 완성도로 신뢰를 쌓는 섬세함',
  },
};

type StrengthTone = 'strong' | 'weak' | 'balanced';

const STRENGTH_TEXT: Record<StrengthTone, { dilemma: string; environment: (goal: string) => string }> = {
  strong: {
    dilemma: '기질적으로는 신강한 사주 — 스스로 결정하고 밀어붙일 때 힘이 나는 쪽입니다. 그래서 지금의 답답함은 능력 부족이 아니라 결정권이 좁은 환경과의 마찰일 가능성이 큽니다.',
    environment: (goal) => `신강한 기질에는 재량과 결정권이 넓은 환경이 맞습니다. ${goal}를 향해서도 관리가 촘촘한 대조직보다, 목표만 합의하면 방법은 맡기는 팀에서 성과가 빨리 납니다. 면접에서 "이 역할이 독자적으로 결정할 수 있는 것"을 꼭 확인하세요.`,
  },
  weak: {
    dilemma: '기질적으로는 신약한 사주 — 혼자 밀어붙일 때보다 환경과 사람의 지원이 갖춰질 때 성과가 나는 쪽입니다. 그래서 지금 흔들리는 것도 의지 문제가 아니라 지지 기반이 얇아진 신호로 읽는 편이 정확합니다.',
    environment: (goal) => `신약한 기질에는 시스템과 동료의 밀도가 높은 환경이 맞습니다. ${goal}로 가는 길에서도 혼자 개척해야 하는 자리보다, 온보딩·멘토·협업 체계가 갖춰진 조직에서 실력이 온전히 발휘됩니다. 면접에서 리더의 피드백 주기와 팀 구조를 꼭 확인하세요.`,
  },
  balanced: {
    dilemma: '기질적으로는 중화된 사주 — 환경에 크게 휘둘리지 않고 어디서든 제 몫을 하는 쪽입니다. 그래서 선택의 기준을 "버틸 수 있는가"가 아니라 "여기가 나를 키우는가"에 두어도 됩니다.',
    environment: (goal) => `중화된 기질은 적응력이 넓어 조직 유형보다 성장 곡선이 중요합니다. ${goal}에 가까워지려면 결과에 대한 책임과 그에 맞는 권한이 함께 주어지는 환경을 고르세요. 면접에서는 입사 후 90일의 기대 결과와 평가 기준을 확인하는 것이 좋습니다.`,
  },
};

/** 축·점수 등급별 three_paths 문장 */
function pathContent(axis: 'jobChange' | 'stay' | 'negotiation', score: number, goal: string): string {
  const view = buildScoreView(axis, score);

  if (axis === 'jobChange') {
    if (view.tone === 'elite' || view.tone === 'high') {
      return `${view.headline}입니다. 이직 가능성을 적극적으로 탐색해 볼 수 있지만, 채용 반응을 보장하는 점수는 아닙니다. ${goal}로 이어지는 책임 범위가 명시된 자리를 선별해 시장 반응을 확인하세요.`;
    }
    if (view.tone === 'mid') {
      return `${view.headline}입니다. 사표를 서두르기보다 조건이 맞는 공고에 선별적으로 지원하며 시장 반응을 확인하는 편이 적절합니다.`;
    }
    return `${view.headline}입니다. 무리하게 이동을 결정하기보다 이력서·포트폴리오·평판을 정비하고, 원하는 조건을 구체화하는 준비 구간으로 활용하세요.`;
  }

  if (axis === 'stay') {
    if (view.tone === 'elite' || view.tone === 'high') {
      return `${view.headline}입니다. 현재 자리에서 확보할 수 있는 역할·성과·보상이 남아 있는지 확인해 볼 구간입니다. 조건 없이 남지 말고 6개월 안에 달라질 내용을 구체적으로 합의하세요.`;
    }
    if (view.tone === 'mid') {
      return `${view.headline}입니다. 남는 것과 떠나는 것의 이득이 비슷하니, 회사에 대한 감정보다 "6개월 안에 무엇이 달라지는가"를 기준으로 판단하세요.`;
    }
    return `${view.headline}입니다. 현재 자리에 머무를 이유가 충분한지 다시 확인하고, 잔류를 택한다면 역할·보상 변화의 기한을 정하세요.`;
  }

  if (view.tone === 'elite' || view.tone === 'high') {
    return `${view.headline}입니다. 최근 성과 세 가지와 시장 보상 데이터를 한 장으로 정리해 직책·연봉·업무 범위를 함께 논의해 보세요.`;
  }
  if (view.tone === 'mid') {
    return `${view.headline}입니다. 시장 데이터와 성과 수치가 준비된 안건부터 논의하고, 원하는 수준과 양보 가능한 범위를 구분하세요.`;
  }
  return `${view.headline}입니다. 협상 자리를 서두르기보다 성과와 책임 범위를 눈에 보이게 정리해 근거부터 만드세요.`;
}

const AVOID_BY_AXIS: Record<string, string[]> = {
  jobChange: [
    '상사와 충돌한 직후 감정적으로 퇴사 일정을 확정하지 마세요.',
    '첫 오퍼 하나만 보고 결정하지 마세요. 비교 대상이 없으면 협상력도 없습니다.',
    '현 회사의 카운터오퍼에 즉답하지 마세요. 떠나려던 이유가 연봉 하나였는지 먼저 확인해야 합니다.',
  ],
  stay: [
    '남기로 했다고 시장 감각까지 끄지 마세요. 반기마다 이력서를 갱신하고 시세를 확인하세요.',
    '기한 없는 "조금만 기다려"에 계획을 걸지 마세요. 날짜와 조건이 없는 약속은 약속이 아닙니다.',
    '성과 기록을 미루지 마세요. 잔류의 협상 카드도 결국 기록에서 나옵니다.',
  ],
  negotiation: [
    '감정이 격한 날 협상 자리를 잡지 마세요. 요구가 불만으로 들리는 순간 협상력이 사라집니다.',
    '근거 없는 희망 숫자를 먼저 던지지 마세요. 시장 데이터로 범위를 제시해야 합니다.',
    '결렬 시 대안 없이 배수진을 치지 마세요. 떠날 수 있는 사람이 협상에서 이깁니다.',
  ],
};

export function buildPremiumExpansion(
  context: CareerContext,
  scores: CareerScores,
  signals: SajuSignals = {},
) {
  const job = context.currentJob.trim() || '현재 맡고 있는 직무';
  const goal = context.careerGoal.trim() || '다음 커리어 단계';
  const status = context.currentStatus.trim() || '이직과 잔류 사이에서 고민하는 상황';
  const question = context.desiredAnswer.trim() || '지금 이직을 준비하는 것이 맞을까요?';
  const decisionFactors = analyzeDecisionFactors(context);

  // 사주 신호 해석
  const ganInfo = signals.dayGan ? GAN_MAP[signals.dayGan] : undefined;
  const element = ganInfo?.element;
  const nature = (element && ELEMENT_NATURE[element]) || DEFAULT_NATURE;
  const nuance = ganInfo ? YINYANG_NUANCE[ganInfo.yinYang] : undefined;
  const bs = signals.bodyStrength ?? 0;
  const strengthTone: StrengthTone = bs > 0.2 ? 'strong' : bs < -0.2 ? 'weak' : 'balanced';
  const strength = STRENGTH_TEXT[strengthTone];

  const verdict = buildVerdictView(scores);
  const top = buildTopScore(scores);
  const topLine = `${top.headline}으로, 세 선택지 중 가장 높은 점수입니다`;

  return {
    intent_summary: summarizeCareerIntent(context),
    decision_factors: decisionFactors,
    one_line_conclusion: `${topLine}. ${verdict.title} 실제 결정은 아래 현실 조건을 함께 확인한 뒤에 내리세요.`,
    current_dilemma: {
      title: '왜 지금 마음이 흔들리는가',
      content: `${status}이라고 적어주셨습니다. ${job}에서 보낸 시간이 아깝다기보다는, 여기서 한 해를 더 보냈을 때 역할과 보상이 실제로 달라질지 확신이 없는 쪽에 가깝습니다.\n\n${strength.dilemma} 여기에 지금 사주에서는 ${nature.flow}이 중심에 있어, ${verdict.subtitle}`,
    },
    career_nature: {
      title: '타고난 업무 방식과 성장 조건',
      content: nuance
        ? `${nature.content(job, goal)}\n\n${nuance.line}`
        : nature.content(job, goal),
      strengths: nuance ? [...nature.strengths.slice(0, 2), nuance.strength] : nature.strengths,
      cautions: nature.cautions,
    },
    three_paths: [
      { key: 'change', title: '이직한다면', score: scores.jobChange, content: pathContent('jobChange', scores.jobChange, goal) },
      { key: 'stay', title: '남는다면', score: scores.stay, content: pathContent('stay', scores.stay, goal) },
      { key: 'negotiate', title: '협상한다면', score: scores.negotiation, content: pathContent('negotiation', scores.negotiation, goal) },
    ],
    ideal_environment: {
      title: '잘 맞는 회사와 역할의 조건',
      content: `${strength.environment(goal)}\n\n어느 쪽이든 이전 담당자가 떠난 이유와 평가·보상 기준이 문서로 확인되는지는 공통으로 물어보세요. 이 답변이 모호하다면 높은 연봉만으로 결정하지 않는 편이 안전합니다.`,
      checklist: ['입사 후 90일의 기대 결과가 명확한가', '책임에 맞는 의사결정 권한이 있는가', '평가와 보상 기준을 문서로 확인할 수 있는가', '직속 리더의 피드백 방식이 나와 맞는가'],
    },
    action_plan: {
      do: decisionFactors.checks,
      avoid: AVOID_BY_AXIS[top.axis] || AVOID_BY_AXIS.jobChange,
    },
    personal_answer: {
      question,
      content: `질문에 직접 답하면, ${decisionFactors.recommendation}\n\n사주 흐름도 같은 방향을 가리킵니다. 지금 가장 높은 지표는 ${top.headline}이고, ${verdict.action.title} 지금 확인할 것은 ${decisionFactors.checks.join(', ')}입니다. 이 사실들을 확인한 뒤에도 조건이 ${goal}로 이어지고 감당 가능한 위험 안에 있다면 실행할 근거가 생깁니다.`,
    },
    closing_advice: `이번 주에는 결론을 서두르기보다 “${decisionFactors.checks[0]}”부터 해보세요. 사주는 방향을 살피는 참고 자료이고, 실제 결정은 확인한 조건과 감당 가능한 위험을 바탕으로 내려야 합니다. 작은 확인 하나면 지금의 고민을 비교 가능한 선택지로 바꾸기 시작한 것입니다.`,
  };
}
