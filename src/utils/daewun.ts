// 대운(大運) 계산 전용 모듈.
//
// lunar-javascript는 gzip 약 113KB로 이 프로젝트에서 가장 무거운 의존성인데,
// 대운은 결제 후 추가 질문 프롬프트에서만 쓰인다. 그래서 이 모듈만 따로 떼어
// 필요한 시점에 동적 import 하고, 초기 번들에서는 제외한다.
// (월건·세운은 이미 만세력(manseryeok)으로 대체되어 lunar-javascript가 필요 없다.)
// @ts-ignore
import { Solar } from 'lunar-javascript';

/** getSajuAnalysis가 넘겨주는 대운 계산 입력값 (시간 보정이 반영된 양력 기준) */
export interface DaewunInput {
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  /** 시간 미입력이면 정오(12시) 근사값 */
  hour: number;
  minute: number;
  /** 0=여성, 1=남성 */
  gender: number;
}

export interface DaewunEntry {
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  ganZhi: string;
}

export interface DaewunResult {
  startAge: number;
  list: DaewunEntry[];
  /** 현재 나이가 속한 대운 (없으면 첫 대운) */
  current: { startAge: number; endAge: number; ganZhi: string } | null;
}

export function computeDaewun(input: DaewunInput, at: Date = new Date()): DaewunResult {
  const solarObj = Solar.fromYmdHms(
    input.solarYear, input.solarMonth, input.solarDay, input.hour, input.minute, 0
  );
  const lunarObj = solarObj.getLunar();
  const eightCharObj = lunarObj.getEightChar();
  const yunObj = eightCharObj.getYun(input.gender);

  const list: DaewunEntry[] = yunObj.getDaYun().map((dy: any) => ({
    startAge: dy.getStartAge(),
    endAge: dy.getEndAge(),
    startYear: dy.getStartYear(),
    endYear: dy.getEndYear(),
    ganZhi: dy.getGanZhi()
  })).filter((dy: DaewunEntry) => dy.ganZhi !== '');

  const targetYear = at.getFullYear();
  const currentDaewun = list.find(
    dy => dy.startYear <= targetYear && targetYear <= dy.endYear
  ) || list[0] || null;

  return {
    startAge: yunObj.getStartYear(),
    list,
    current: currentDaewun
      ? { startAge: currentDaewun.startAge, endAge: currentDaewun.endAge, ganZhi: currentDaewun.ganZhi }
      : null
  };
}
