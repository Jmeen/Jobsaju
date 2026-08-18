import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BIRTH_MINUTES,
  BIRTH_YEARS,
  BIRTH_YEAR_MAX,
  BIRTH_YEAR_MIN,
  formatBirthDigits,
  parseBirthDigits,
  toHour24,
  toMeridiemHour,
  withCurrentValue,
} from './birthWheel.ts';

test('자정과 정오가 오전 12시 / 오후 12시로 갈린다', () => {
  assert.deepEqual(toMeridiemHour(0), { meridiem: 'am', hour12: 12 });
  assert.deepEqual(toMeridiemHour(12), { meridiem: 'pm', hour12: 12 });
  assert.deepEqual(toMeridiemHour(1), { meridiem: 'am', hour12: 1 });
  assert.deepEqual(toMeridiemHour(13), { meridiem: 'pm', hour12: 1 });
  assert.deepEqual(toMeridiemHour(23), { meridiem: 'pm', hour12: 11 });
});

test('24시간 값으로 왕복해도 그대로 돌아온다', () => {
  for (let hour = 0; hour < 24; hour += 1) {
    const { meridiem, hour12 } = toMeridiemHour(hour);
    assert.equal(toHour24(meridiem, hour12), hour, `${hour}시가 왕복에서 어긋난다`);
  }
});

test('분은 5분 단위 12개로만 열린다', () => {
  assert.equal(BIRTH_MINUTES.length, 12);
  assert.deepEqual(BIRTH_MINUTES.slice(0, 3), [0, 5, 10]);
  assert.equal(BIRTH_MINUTES.at(-1), 55);
});

test('연도 목록은 직장인 연령대만 연다', () => {
  assert.equal(BIRTH_YEARS[0], BIRTH_YEAR_MIN);
  assert.equal(BIRTH_YEARS.at(-1), BIRTH_YEAR_MAX);
  assert.ok(BIRTH_YEARS.length < 60, '목록이 길어지면 드롭다운이 다시 스크롤 지옥이 된다');
});

test('목록에 없는 기존 입력값은 잃지 않고 끼워 넣는다', () => {
  // 저장된 세션이 37분처럼 5분 단위가 아닌 값을 들고 있을 수 있다.
  const minutes = withCurrentValue(BIRTH_MINUTES, 37);
  assert.ok(minutes.includes(37));
  assert.deepEqual(minutes, [...minutes].sort((a, b) => a - b));

  assert.equal(withCurrentValue(BIRTH_MINUTES, 30), BIRTH_MINUTES, '이미 있으면 그대로 쓴다');
  assert.equal(withCurrentValue(BIRTH_MINUTES, NaN), BIRTH_MINUTES);
});

test('여섯 자리 생년월일에서 세기를 구간으로 정한다', () => {
  assert.deepEqual(parseBirthDigits('880429'), { year: 1988, month: 4, day: 29 });
  assert.deepEqual(parseBirthDigits('040229'), { year: 2004, month: 2, day: 29 });
  assert.deepEqual(parseBirthDigits('930812'), { year: 1993, month: 8, day: 12 });

  // 허용 구간의 양 끝도 한쪽 세기로만 풀려야 한다.
  const minYY = String(BIRTH_YEAR_MIN % 100).padStart(2, '0');
  const maxYY = String(BIRTH_YEAR_MAX % 100).padStart(2, '0');
  assert.equal(parseBirthDigits(`${minYY}0101`)?.year, BIRTH_YEAR_MIN);
  assert.equal(parseBirthDigits(`${maxYY}0101`)?.year, BIRTH_YEAR_MAX);
});

test('형식이나 월·일이 어긋난 여섯 자리는 받지 않는다', () => {
  for (const bad of ['', '8804', '8804290', '88a429', '881329', '880032', '880440']) {
    assert.equal(parseBirthDigits(bad), null, `${bad}는 걸러야 한다`);
  }
});

test('허용 구간 밖으로만 풀리는 두 자리 연도는 거절한다', () => {
  // 구간이 56년이라 어느 세기로도 들어오지 못하는 yy가 존재한다.
  const outside = Array.from({ length: 100 }, (_, yy) => yy)
    .filter(yy => ![1900 + yy, 2000 + yy].some(y => y >= BIRTH_YEAR_MIN && y <= BIRTH_YEAR_MAX));
  assert.ok(outside.length > 0);
  for (const yy of outside) {
    assert.equal(parseBirthDigits(`${String(yy).padStart(2, '0')}0101`), null);
  }
});

test('저장된 생년월일을 다시 여섯 자리로 되돌린다', () => {
  assert.equal(formatBirthDigits({ year: 1988, month: 4, day: 29 }), '880429');
  assert.equal(formatBirthDigits({ year: 2004, month: 2, day: 9 }), '040209');
  const digits = formatBirthDigits({ year: 1993, month: 8, day: 12 });
  assert.deepEqual(parseBirthDigits(digits), { year: 1993, month: 8, day: 12 });
});
