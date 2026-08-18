// 생년월일 드롭다운이 보여줄 값의 범위와, 월별 일수 계산.
// 데이터는 UI가 아니라서 컴포넌트 밖에 둔다 — 컨텍스트의 입력 검증도 이걸 쓴다.

export const CURRENT_YEAR = new Date().getFullYear();

// 직장인 커리어 서비스라 실제로 고를 만한 구간만 연다.
// 1920년부터 열면 100개가 넘는 목록이 떠서 스크롤만 길어진다.
const OLDEST_AGE = 70;
const YOUNGEST_AGE = 15;
export const BIRTH_YEAR_MIN = CURRENT_YEAR - OLDEST_AGE;
export const BIRTH_YEAR_MAX = CURRENT_YEAR - YOUNGEST_AGE;

export const BIRTH_YEARS = Array.from(
  { length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 },
  (_, i) => BIRTH_YEAR_MIN + i,
);
export const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export type BirthDate = { year: number; month: number; day: number };

/**
 * "880429" 같은 여섯 자리 생년월일을 읽는다.
 *
 * 두 자리 연도는 세기가 비어 있는데, 허용 구간(BIRTH_YEAR_MIN~MAX)이 100년보다 좁으므로
 * 19xx와 20xx 중 구간 안에 드는 쪽이 항상 하나뿐이다. 그 성질로 세기를 정한다.
 * (예: 88 → 1988, 04 → 2004)
 */
export function parseBirthDigits(digits: string): BirthDate | null {
  if (!/^\d{6}$/.test(digits)) return null;

  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const candidates = [1900 + yy, 2000 + yy].filter(
    year => year >= BIRTH_YEAR_MIN && year <= BIRTH_YEAR_MAX,
  );
  if (candidates.length !== 1) return null;

  return { year: candidates[0], month, day };
}

/** 저장된 생년월일을 입력창에 되돌려 넣을 때 쓴다. */
export function formatBirthDigits({ year, month, day }: BirthDate): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(year % 100)}${pad(month)}${pad(day)}`;
}

// 시간은 오전/오후를 따로 고르고 1~12시만 보여준다.
// 사주 계산은 24시제를 쓰므로 화면 값과 내부 값을 아래 두 함수로 오간다.
export type Meridiem = 'am' | 'pm';
export const BIRTH_HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

/** 0~23시를 화면 표기(오전/오후 + 1~12시)로 나눈다. 0시는 오전 12시, 12시는 오후 12시다. */
export function toMeridiemHour(hour24: number): { meridiem: Meridiem; hour12: number } {
  const normalized = ((hour24 % 24) + 24) % 24;
  return {
    meridiem: normalized < 12 ? 'am' : 'pm',
    hour12: normalized % 12 === 0 ? 12 : normalized % 12,
  };
}

/** 화면 표기를 다시 0~23시로 되돌린다. */
export function toHour24(meridiem: Meridiem, hour12: number): number {
  const base = hour12 % 12; // 12시는 0으로 접는다
  return meridiem === 'am' ? base : base + 12;
}

// 분은 5분 단위면 충분하다. 시주는 두 시간 단위로 갈리고 경도 보정도 30분 남짓이라
// 1분 해상도가 결과를 바꾸는 경우가 사실상 없는데 목록만 60개가 된다.
export const BIRTH_MINUTE_STEP = 5;
export const BIRTH_MINUTES = Array.from(
  { length: 60 / BIRTH_MINUTE_STEP },
  (_, i) => i * BIRTH_MINUTE_STEP,
);

/**
 * 저장된 세션이나 예전 입력이 목록에 없는 값(예: 37분, 1935년)을 들고 있을 수 있다.
 * 그 값을 잃지 않도록 목록에 끼워 넣어 돌려준다.
 */
export function withCurrentValue(values: number[], current: number): number[] {
  if (!Number.isFinite(current) || values.includes(current)) return values;
  return [...values, current].sort((a, b) => a - b);
}

export function daysInMonth(year: number, month: number, isSolar: boolean): number {
  if (!isSolar) return 30; // 음력은 만세력 변환 전이라 30일 상한으로 넉넉히 받아둔다
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}
