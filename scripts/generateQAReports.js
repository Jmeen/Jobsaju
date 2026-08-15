import { handlePaidReportRequest } from '../workers/paidReportApi.js';
import fs from 'fs';

async function runQAGeneration() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Please set GEMINI_API_KEY environment variable.");
    process.exit(1);
  }

  // Use a mocked env with API key
  const env = {
    GEMINI_API_KEY: apiKey,
    // Provide a mocked KV for caching prevention if needed
  };

  const cases = [
    { name: "이직고민_개발자", birth: { year: 1992, month: 3, day: 15, hour: 10, isSolar: true, gender: "M" }, context: { worry_text: "스타트업에서 3년차 백엔드인데 큰 기업으로 이직할지 고민입니다.", job_title: "백엔드 개발자", years_of_experience: 3 } },
    { name: "연봉협상_마케터", birth: { year: 1988, month: 11, day: 5, hour: 14, isSolar: false, gender: "F" }, context: { worry_text: "곧 연봉협상인데 성과가 좋아서 강하게 부르고 싶습니다.", job_title: "퍼포먼스 마케터", years_of_experience: 7 } },
    { name: "퇴사충동_디자이너", birth: { year: 1995, month: 7, day: 22, hour: null, isSolar: true, gender: "F" }, context: { worry_text: "사수와 안 맞아서 너무 퇴사하고 싶은데 버티는게 맞을까요?", job_title: "UX/UI 디자이너", years_of_experience: 2 } },
    { name: "직무전환_기획자", birth: { year: 1990, month: 1, day: 8, hour: 9, isSolar: true, gender: "M" }, context: { worry_text: "서비스 기획에서 PM으로 롤을 확장하고 싶은데 사내 이동이 나을지 이직이 나을지 모르겠습니다.", job_title: "서비스 기획", years_of_experience: 5 } },
    { name: "휴식기_프리랜서", birth: { year: 1985, month: 5, day: 10, hour: 20, isSolar: true, gender: "F" }, context: { worry_text: "최근 프로젝트가 끝나고 번아웃이 왔습니다. 당분간 쉬는게 맞을지, 바로 다음을 구할지 고민입니다.", job_title: "프리랜서 번역가", years_of_experience: 10 } },
    { name: "창업고민_엔지니어", birth: { year: 1982, month: 9, day: 30, hour: 18, isSolar: false, gender: "M" }, context: { worry_text: "동료들과 나와서 창업을 하려는데 올해가 적기일까요?", job_title: "테크 리드", years_of_experience: 12 } },
    { name: "계약만료_인턴", birth: { year: 2000, month: 4, day: 1, hour: 12, isSolar: true, gender: "M" }, context: { worry_text: "곧 6개월 인턴이 끝나는데 정규직 전환이 불투명합니다.", job_title: "마케팅 인턴", years_of_experience: 0 } },
    { name: "승진누락_영업", birth: { year: 1980, month: 12, day: 12, hour: 8, isSolar: true, gender: "F" }, context: { worry_text: "이번에 승진에서 누락되었습니다. 회사를 계속 다녀야 할지 회의감이 듭니다.", job_title: "B2B 영업", years_of_experience: 15 } },
    { name: "번아웃_연구원", birth: { year: 1993, month: 2, day: 28, hour: 23, isSolar: true, gender: "M" }, context: { worry_text: "일이 너무 많아서 건강이 안 좋아졌습니다. 일단 퇴사하고 쉴까 합니다.", job_title: "R&D 연구원", years_of_experience: 4 } },
    { name: "해외취업_기획", birth: { year: 1997, month: 10, day: 15, hour: null, isSolar: true, gender: "F" }, context: { worry_text: "해외 지사 발령 기회가 있는데 가는 것이 좋을까요?", job_title: "해외사업 기획", years_of_experience: 1 } },
  ];

  const results = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    console.log(`Generating report for case ${i+1}/${cases.length}: ${c.name}...`);
    
    // Create a mock Request
    const reqBody = {
      payment_id: `qa_mock_payment_${Date.now()}_${i}`,
      birth: c.birth,
      career_context: c.context
    };

    const mockRequest = {
      json: async () => reqBody
    };

    try {
      const response = await handlePaidReportRequest(mockRequest, env);
      const text = await response.text();
      
      if (response.status !== 200) {
        console.error(`Error for ${c.name}: ${text}`);
        continue;
      }
      
      const parsed = JSON.parse(text);
      results.push({
        case_name: c.name,
        input: reqBody,
        output: parsed.report
      });
      
    } catch (e) {
      console.error(`Exception for ${c.name}:`, e);
    }
  }

  fs.writeFileSync('QA_Reports.json', JSON.stringify(results, null, 2), 'utf-8');
  console.log('Saved 10 QA reports to QA_Reports.json');
}

runQAGeneration();
