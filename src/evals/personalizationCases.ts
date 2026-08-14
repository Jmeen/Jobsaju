import type { CareerScores } from '../utils/reportViewModel.ts';

export type EvalCareerContext = {
  currentStatus: string;
  currentJob: string;
  careerGoal: string;
  desiredAnswer: string;
};

export type RoleKind = 'generic' | 'cro' | 'chief-strategy' | 'chief-sales' | 'ambiguous';

export type PersonalizationCase = {
  id: string;
  category: 'junior' | 'mid-career' | 'leader' | 'executive' | 'burnout' | 'offer';
  split: 'development' | 'held-out';
  context: EvalCareerContext;
  scores: CareerScores;
  expected: {
    requiredTerms: string[];
    forbiddenTerms: string[];
    roleKind: RoleKind;
    mustClarify?: boolean;
  };
};

export type ContrastPair = {
  id: string;
  leftId: string;
  rightId: string;
  changedFactor: string;
  expectedDifferenceTerms: [string, string];
};

const dev = 'development' as const;
const held = 'held-out' as const;

export const PERSONALIZATION_CASES: PersonalizationCase[] = [
  {
    id: 'junior_salary', category: 'junior', split: dev,
    context: { currentStatus: '첫 이직 제안을 받음', currentJob: '2년 차 백엔드 개발자', careerGoal: '연봉을 높이며 서버 개발 경험 확대', desiredAnswer: '연봉 18% 인상 제안을 받아도 지금 옮기는 것이 좋은지 알고 싶다' },
    scores: { jobChange: 72, stay: 48, negotiation: 63 },
    expected: { requiredTerms: ['백엔드 개발자', '연봉 18%'], forbiddenTerms: ['팀장 경험', '마케팅 총괄'], roleKind: 'generic' },
  },
  {
    id: 'junior_growth', category: 'junior', split: dev,
    context: { currentStatus: '첫 이직 제안을 받음', currentJob: '2년 차 백엔드 개발자', careerGoal: '대용량 트래픽과 서버 설계 경험 확대', desiredAnswer: '연봉은 비슷하지만 대용량 트래픽을 배울 수 있는 회사로 옮길지 알고 싶다' },
    scores: { jobChange: 72, stay: 48, negotiation: 63 },
    expected: { requiredTerms: ['백엔드 개발자', '대용량 트래픽'], forbiddenTerms: ['연봉 18%', '팀장 경험'], roleKind: 'generic' },
  },
  {
    id: 'offer_commute', category: 'offer', split: dev,
    context: { currentStatus: '최종 오퍼를 검토 중', currentJob: '6년 차 프로덕트 디자이너', careerGoal: '제품 전략까지 담당하는 디자인 리드', desiredAnswer: '연봉은 20% 오르지만 출퇴근이 하루 세 시간이 되는 제안을 받아야 할까' },
    scores: { jobChange: 75, stay: 45, negotiation: 66 },
    expected: { requiredTerms: ['프로덕트 디자이너', '하루 세 시간'], forbiddenTerms: ['완전 재택', '영업 조직'], roleKind: 'generic' },
  },
  {
    id: 'offer_remote', category: 'offer', split: dev,
    context: { currentStatus: '최종 오퍼를 검토 중', currentJob: '6년 차 프로덕트 디자이너', careerGoal: '제품 전략까지 담당하는 디자인 리드', desiredAnswer: '연봉은 8% 오르지만 완전 재택과 자율 근무가 가능한 제안을 받아야 할까' },
    scores: { jobChange: 75, stay: 45, negotiation: 66 },
    expected: { requiredTerms: ['프로덕트 디자이너', '완전 재택'], forbiddenTerms: ['하루 세 시간', '영업 조직'], roleKind: 'generic' },
  },
  {
    id: 'leader_authority', category: 'leader', split: dev,
    context: { currentStatus: '리드 직함의 이직 제안을 받음', currentJob: '8년 차 프로덕트 매니저로 로드맵과 스쿼드 우선순위를 담당', careerGoal: '사람과 예산 권한이 있는 제품 리드', desiredAnswer: '리드 직함만 있고 인사권과 예산권이 없는 자리인지 확인하고 싶다' },
    scores: { jobChange: 68, stay: 52, negotiation: 74 },
    expected: { requiredTerms: ['로드맵', '인사권'], forbiddenTerms: ['이미 인사권이 있다', 'CRO'], roleKind: 'generic' },
  },
  {
    id: 'leader_title', category: 'leader', split: dev,
    context: { currentStatus: '리드 직함의 이직 제안을 받음', currentJob: '8년 차 프로덕트 매니저로 로드맵과 스쿼드 우선순위를 담당', careerGoal: '전문성을 유지하는 시니어 IC', desiredAnswer: '사람 관리보다 제품 문제 해결을 계속하면서 직급을 높일 수 있는지 알고 싶다' },
    scores: { jobChange: 68, stay: 52, negotiation: 74 },
    expected: { requiredTerms: ['로드맵', '시니어 IC'], forbiddenTerms: ['인사권이 필요하다', 'CRO'], roleKind: 'generic' },
  },
  {
    id: 'burnout_cushion', category: 'burnout', split: dev,
    context: { currentStatus: '번아웃으로 선퇴사를 고민 중', currentJob: '7년 차 콘텐츠 마케터', careerGoal: '3개월 휴식 후 브랜드 전략 직무', desiredAnswer: '생활비 12개월분을 마련한 상태에서 먼저 퇴사하고 쉬어도 될까' },
    scores: { jobChange: 61, stay: 39, negotiation: 44 },
    expected: { requiredTerms: ['콘텐츠 마케터', '생활비 12개월'], forbiddenTerms: ['비상금이 없다', '즉시 창업'], roleKind: 'generic' },
  },
  {
    id: 'burnout_no_cushion', category: 'burnout', split: dev,
    context: { currentStatus: '번아웃으로 선퇴사를 고민 중', currentJob: '7년 차 콘텐츠 마케터', careerGoal: '회복 후 브랜드 전략 직무', desiredAnswer: '저축이 한 달 생활비뿐이고 다음 회사가 없는 상태에서 먼저 퇴사해도 될까' },
    scores: { jobChange: 61, stay: 39, negotiation: 44 },
    expected: { requiredTerms: ['콘텐츠 마케터', '한 달 생활비'], forbiddenTerms: ['생활비 12개월', '안전하게 쉬어도 된다'], roleKind: 'generic' },
  },
  {
    id: 'promotion_written', category: 'leader', split: dev,
    context: { currentStatus: '잔류 제안을 검토 중', currentJob: '9년 차 B2B 영업 팀장', careerGoal: '사업부 영업 책임자', desiredAnswer: '6개월 뒤 승진과 보상 조정을 문서로 받은 경우 남는 것이 나을까' },
    scores: { jobChange: 59, stay: 67, negotiation: 76 },
    expected: { requiredTerms: ['B2B 영업 팀장', '문서'], forbiddenTerms: ['구두 약속뿐', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'promotion_verbal', category: 'leader', split: dev,
    context: { currentStatus: '잔류 제안을 검토 중', currentJob: '9년 차 B2B 영업 팀장', careerGoal: '사업부 영업 책임자', desiredAnswer: '시점과 보상 기준 없이 조금만 기다리라는 구두 약속을 믿고 남아야 할까' },
    scores: { jobChange: 59, stay: 67, negotiation: 76 },
    expected: { requiredTerms: ['B2B 영업 팀장', '구두 약속'], forbiddenTerms: ['문서로 확정', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'executive_cro', category: 'executive', split: dev,
    context: { currentStatus: '임원 이직 제안을 검토 중', currentJob: '영업·마케팅·고객성공 조직과 매출 예측을 총괄', careerGoal: 'CRO', desiredAnswer: '전체 고객 생애주기와 매출을 책임지는 CRO 제안이 현재 경력에 맞을까' },
    scores: { jobChange: 71, stay: 48, negotiation: 79 },
    expected: { requiredTerms: ['고객성공', 'CRO'], forbiddenTerms: ['Chief Strategy Officer', '전사 전략만 담당'], roleKind: 'cro' },
  },
  {
    id: 'executive_strategy', category: 'executive', split: dev,
    context: { currentStatus: '임원 이직 제안을 검토 중', currentJob: '전사 중장기 전략·신사업 포트폴리오·자원 배분을 담당', careerGoal: 'CSO', desiredAnswer: 'CEO와 전사 전략을 설계하는 Chief Strategy Officer 제안이 현재 경력에 맞을까' },
    scores: { jobChange: 71, stay: 48, negotiation: 79 },
    expected: { requiredTerms: ['신사업 포트폴리오', 'Chief Strategy Officer'], forbiddenTerms: ['Chief Revenue Officer', '영업 총괄'], roleKind: 'chief-strategy' },
  },
  {
    id: 'executive_sales_cso', category: 'executive', split: dev,
    context: { currentStatus: '영업 임원 승진을 검토 중', currentJob: '국내외 세일즈 조직과 수주 파이프라인을 총괄', careerGoal: 'CSO', desiredAnswer: 'Chief Sales Officer로서 영업조직 목표와 수주를 책임지는 자리가 맞을까' },
    scores: { jobChange: 52, stay: 70, negotiation: 82 },
    expected: { requiredTerms: ['수주 파이프라인', 'Chief Sales Officer'], forbiddenTerms: ['Chief Strategy Officer', '마케팅 총괄'], roleKind: 'chief-sales' },
  },
  {
    id: 'executive_strategy_cso', category: 'executive', split: dev,
    context: { currentStatus: '전략 임원 승진을 검토 중', currentJob: '시장 분석과 전사 성장전략 및 투자 우선순위를 담당', careerGoal: 'CSO', desiredAnswer: 'Chief Strategy Officer로서 CEO 의사결정을 지원하는 자리가 맞을까' },
    scores: { jobChange: 52, stay: 70, negotiation: 82 },
    expected: { requiredTerms: ['투자 우선순위', 'Chief Strategy Officer'], forbiddenTerms: ['Chief Sales Officer', '수주 총괄'], roleKind: 'chief-strategy' },
  },
  {
    id: 'executive_ambiguous_a', category: 'executive', split: dev,
    context: { currentStatus: '임원급 역할을 탐색 중', currentJob: '사업개발과 대표 보좌 업무를 함께 담당', careerGoal: 'CSO 또는 CRO', desiredAnswer: '둘 중 어느 직함이 더 맞는지 알고 싶다' },
    scores: { jobChange: 64, stay: 51, negotiation: 69 },
    expected: { requiredTerms: ['사업개발', 'CSO'], forbiddenTerms: ['CRO로 확정', 'Chief Strategy Officer로 확정'], roleKind: 'ambiguous', mustClarify: true },
  },
  {
    id: 'executive_ambiguous_b', category: 'executive', split: dev,
    context: { currentStatus: '임원급 역할을 탐색 중', currentJob: '조직 운영과 여러 부서 조율을 담당', careerGoal: 'COO 또는 CSO', desiredAnswer: '운영 총괄인지 전략 총괄인지 아직 정하지 못했다' },
    scores: { jobChange: 64, stay: 51, negotiation: 69 },
    expected: { requiredTerms: ['조직 운영', 'COO'], forbiddenTerms: ['CRO로 확정', 'CSO로 확정'], roleKind: 'ambiguous', mustClarify: true },
  },
  {
    id: 'engineer_ic', category: 'mid-career', split: dev,
    context: { currentStatus: '커리어 경로를 고민 중', currentJob: '10년 차 프론트엔드 개발자', careerGoal: '스태프 엔지니어', desiredAnswer: '사람 관리 없이 기술 의사결정 영향력을 키우는 경로가 맞을까' },
    scores: { jobChange: 57, stay: 62, negotiation: 69 },
    expected: { requiredTerms: ['프론트엔드 개발자', '스태프 엔지니어'], forbiddenTerms: ['팀장 승진이 필수', '영업'], roleKind: 'generic' },
  },
  {
    id: 'engineer_manager', category: 'mid-career', split: dev,
    context: { currentStatus: '커리어 경로를 고민 중', currentJob: '10년 차 프론트엔드 개발자', careerGoal: '엔지니어링 매니저', desiredAnswer: '코딩 비중을 줄이고 채용과 팀 성과를 책임지는 경로가 맞을까' },
    scores: { jobChange: 57, stay: 62, negotiation: 69 },
    expected: { requiredTerms: ['프론트엔드 개발자', '엔지니어링 매니저'], forbiddenTerms: ['사람 관리 없이', '영업'], roleKind: 'generic' },
  },
  {
    id: 'marketer_startup', category: 'mid-career', split: dev,
    context: { currentStatus: '두 회사의 제안을 비교 중', currentJob: '5년 차 퍼포먼스 마케터', careerGoal: '그로스 리드', desiredAnswer: '작은 스타트업에서 전체 퍼널을 맡는 제안이 성장에 도움이 될까' },
    scores: { jobChange: 73, stay: 44, negotiation: 65 },
    expected: { requiredTerms: ['퍼포먼스 마케터', '전체 퍼널'], forbiddenTerms: ['대기업 전문 조직', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'marketer_enterprise', category: 'mid-career', split: dev,
    context: { currentStatus: '두 회사의 제안을 비교 중', currentJob: '5년 차 퍼포먼스 마케터', careerGoal: '채널 전문성을 갖춘 시니어 마케터', desiredAnswer: '대기업 전문 조직에서 한 채널을 깊게 맡는 제안이 성장에 도움이 될까' },
    scores: { jobChange: 73, stay: 44, negotiation: 65 },
    expected: { requiredTerms: ['퍼포먼스 마케터', '대기업 전문 조직'], forbiddenTerms: ['전체 퍼널을 총괄', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'parent_remote', category: 'offer', split: held,
    context: { currentStatus: '육아기 이직 제안을 검토 중', currentJob: '7년 차 데이터 분석가', careerGoal: '분석 리드', desiredAnswer: '주 4일 재택과 유연근무를 보장하는 제안을 받아도 될까' },
    scores: { jobChange: 69, stay: 54, negotiation: 70 },
    expected: { requiredTerms: ['데이터 분석가', '주 4일 재택'], forbiddenTerms: ['매일 출근', 'CRO'], roleKind: 'generic' },
  },
  {
    id: 'parent_onsite', category: 'offer', split: held,
    context: { currentStatus: '육아기 이직 제안을 검토 중', currentJob: '7년 차 데이터 분석가', careerGoal: '분석 리드', desiredAnswer: '연봉은 높지만 매일 출근과 잦은 야근이 필요한 제안을 받아도 될까' },
    scores: { jobChange: 69, stay: 54, negotiation: 70 },
    expected: { requiredTerms: ['데이터 분석가', '매일 출근'], forbiddenTerms: ['주 4일 재택', 'CRO'], roleKind: 'generic' },
  },
  {
    id: 'company_layoff', category: 'mid-career', split: held,
    context: { currentStatus: '구조조정 가능성 때문에 이직 고민', currentJob: '4년 차 HR 담당자', careerGoal: 'HRBP', desiredAnswer: '두 차례 구조조정 예고가 있는 회사에서 먼저 이직을 준비해야 할까' },
    scores: { jobChange: 77, stay: 35, negotiation: 45 },
    expected: { requiredTerms: ['HR 담당자', '구조조정'], forbiddenTerms: ['회사가 안정적', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'company_stable', category: 'mid-career', split: held,
    context: { currentStatus: '안정적인 회사에서 성장 정체를 고민', currentJob: '4년 차 HR 담당자', careerGoal: 'HRBP', desiredAnswer: '고용은 안정적이지만 업무 범위가 2년째 같은 상태에서 옮겨야 할까' },
    scores: { jobChange: 77, stay: 35, negotiation: 45 },
    expected: { requiredTerms: ['HR 담당자', '2년째'], forbiddenTerms: ['구조조정 예고', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'contractor_enterprise', category: 'offer', split: held,
    context: { currentStatus: '정규직 전환 제안을 검토 중', currentJob: '3년 차 UX 라이터 프리랜서', careerGoal: '콘텐츠 디자인 전문가', desiredAnswer: '대기업 정규직으로 안정성을 얻는 대신 프로젝트 선택권을 줄여도 될까' },
    scores: { jobChange: 65, stay: 58, negotiation: 71 },
    expected: { requiredTerms: ['UX 라이터', '프로젝트 선택권'], forbiddenTerms: ['초기 스타트업', '영업 총괄'], roleKind: 'generic' },
  },
  {
    id: 'contractor_startup', category: 'offer', split: held,
    context: { currentStatus: '정규직 전환 제안을 검토 중', currentJob: '3년 차 UX 라이터 프리랜서', careerGoal: '콘텐츠 디자인 리드', desiredAnswer: '초기 스타트업 첫 콘텐츠 디자이너로 넓은 권한을 맡아도 될까' },
    scores: { jobChange: 65, stay: 58, negotiation: 71 },
    expected: { requiredTerms: ['UX 라이터', '초기 스타트업'], forbiddenTerms: ['대기업 정규직', '영업 총괄'], roleKind: 'generic' },
  },
  {
    id: 'workload_recovery', category: 'burnout', split: held,
    context: { currentStatus: '업무 과부하로 이동을 고민', currentJob: '8년 차 재무기획 담당자', careerGoal: '일정한 업무 리듬을 유지하는 FP&A 리드', desiredAnswer: '연봉을 조금 낮추더라도 야근이 적은 회사로 옮기는 것이 나을까' },
    scores: { jobChange: 62, stay: 38, negotiation: 50 },
    expected: { requiredTerms: ['재무기획', '야근이 적은'], forbiddenTerms: ['고연봉이 최우선', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'workload_growth', category: 'burnout', split: held,
    context: { currentStatus: '업무 강도가 낮아 성장 정체를 고민', currentJob: '8년 차 재무기획 담당자', careerGoal: 'IPO 경험을 갖춘 FP&A 리드', desiredAnswer: '업무 강도는 높지만 IPO를 경험할 수 있는 회사로 옮기는 것이 나을까' },
    scores: { jobChange: 62, stay: 38, negotiation: 50 },
    expected: { requiredTerms: ['재무기획', 'IPO'], forbiddenTerms: ['야근이 적은 회사', '개발자'], roleKind: 'generic' },
  },
  {
    id: 'career_change_data', category: 'mid-career', split: held,
    context: { currentStatus: '직무 전환을 준비 중', currentJob: '5년 차 운영 기획자로 SQL과 지표 관리를 담당', careerGoal: '데이터 분석가', desiredAnswer: '분석 프로젝트를 더 쌓은 뒤 데이터 분석가로 지원해야 할까' },
    scores: { jobChange: 66, stay: 55, negotiation: 48 },
    expected: { requiredTerms: ['SQL', '데이터 분석가'], forbiddenTerms: ['프로덕트 매니저가 목표', '영업'], roleKind: 'generic' },
  },
  {
    id: 'career_change_pm', category: 'mid-career', split: held,
    context: { currentStatus: '직무 전환을 준비 중', currentJob: '5년 차 운영 기획자로 고객 요구와 개발팀 일정을 조율', careerGoal: '프로덕트 매니저', desiredAnswer: '기능 출시 경험을 더 만든 뒤 프로덕트 매니저로 지원해야 할까' },
    scores: { jobChange: 66, stay: 55, negotiation: 48 },
    expected: { requiredTerms: ['개발팀 일정', '프로덕트 매니저'], forbiddenTerms: ['데이터 분석가가 목표', '영업'], roleKind: 'generic' },
  },
];

export const CONTRAST_PAIRS: ContrastPair[] = [
  { id: 'pair_01', leftId: 'junior_salary', rightId: 'junior_growth', changedFactor: '보상 대 학습', expectedDifferenceTerms: ['연봉 18%', '대용량 트래픽'] },
  { id: 'pair_02', leftId: 'offer_commute', rightId: 'offer_remote', changedFactor: '긴 출퇴근 대 완전 재택', expectedDifferenceTerms: ['하루 세 시간', '완전 재택'] },
  { id: 'pair_03', leftId: 'leader_authority', rightId: 'leader_title', changedFactor: '관리 권한 대 시니어 IC', expectedDifferenceTerms: ['인사권', '시니어 IC'] },
  { id: 'pair_04', leftId: 'burnout_cushion', rightId: 'burnout_no_cushion', changedFactor: '재무 여유', expectedDifferenceTerms: ['생활비 12개월', '한 달 생활비'] },
  { id: 'pair_05', leftId: 'promotion_written', rightId: 'promotion_verbal', changedFactor: '문서화된 약속 대 구두 약속', expectedDifferenceTerms: ['문서', '구두 약속'] },
  { id: 'pair_06', leftId: 'executive_cro', rightId: 'executive_strategy', changedFactor: '수익 총괄 대 전사 전략', expectedDifferenceTerms: ['CRO', 'Chief Strategy Officer'] },
  { id: 'pair_07', leftId: 'executive_sales_cso', rightId: 'executive_strategy_cso', changedFactor: 'CSO 약어의 실제 책임', expectedDifferenceTerms: ['Chief Sales Officer', 'Chief Strategy Officer'] },
  { id: 'pair_08', leftId: 'executive_ambiguous_a', rightId: 'executive_ambiguous_b', changedFactor: '모호한 임원 후보군', expectedDifferenceTerms: ['CRO', 'COO'] },
  { id: 'pair_09', leftId: 'engineer_ic', rightId: 'engineer_manager', changedFactor: '전문가 대 관리자 경로', expectedDifferenceTerms: ['스태프 엔지니어', '엔지니어링 매니저'] },
  { id: 'pair_10', leftId: 'marketer_startup', rightId: 'marketer_enterprise', changedFactor: '넓은 범위 대 깊은 전문성', expectedDifferenceTerms: ['전체 퍼널', '대기업 전문 조직'] },
  { id: 'pair_11', leftId: 'parent_remote', rightId: 'parent_onsite', changedFactor: '재택 대 출근 조건', expectedDifferenceTerms: ['주 4일 재택', '매일 출근'] },
  { id: 'pair_12', leftId: 'company_layoff', rightId: 'company_stable', changedFactor: '고용 불안 대 성장 정체', expectedDifferenceTerms: ['구조조정', '2년째'] },
  { id: 'pair_13', leftId: 'contractor_enterprise', rightId: 'contractor_startup', changedFactor: '안정성 대 역할 권한', expectedDifferenceTerms: ['프로젝트 선택권', '초기 스타트업'] },
  { id: 'pair_14', leftId: 'workload_recovery', rightId: 'workload_growth', changedFactor: '회복 대 고강도 성장 경험', expectedDifferenceTerms: ['야근이 적은', 'IPO'] },
  { id: 'pair_15', leftId: 'career_change_data', rightId: 'career_change_pm', changedFactor: '데이터 분석 대 제품 관리', expectedDifferenceTerms: ['데이터 분석가', '프로덕트 매니저'] },
];
