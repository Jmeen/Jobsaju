// 생년월일 휠이 보여줄 값의 범위와, 월별 일수 계산.
// 데이터는 UI가 아니라서 컴포넌트 밖에 둔다 — 컨텍스트의 입력 검증도 이걸 쓴다.

export const WHEEL_ITEM_HEIGHT = 36;
const WHEEL_VISIBLE_ROWS = 3;
export const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
export const WHEEL_PADDING = (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2;

export const CURRENT_YEAR = new Date().getFullYear();
export const WHEEL_YEARS = Array.from({ length: CURRENT_YEAR - 1920 + 1 }, (_, i) => 1920 + i);
export const WHEEL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const WHEEL_HOURS = Array.from({ length: 24 }, (_, i) => i);
export const WHEEL_MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function daysInMonth(year: number, month: number, isSolar: boolean): number {
  if (!isSolar) return 30; // 음력은 만세력 변환 전이라 30일 상한으로 넉넉히 받아둔다
  if (!year || !month) return 31;
  return new Date(year, month, 0).getDate();
}

/** 값이 바뀌면 해당 항목이 가운데로 오도록 스크롤을 맞추는 iOS 스타일 휠 피커 */
