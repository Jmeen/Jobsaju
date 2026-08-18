// 목업 2번 화면 — "수호신을 깨워볼까요?"
// 생년월일·시간은 목업대로 드롭다운으로 받는다. 스크롤 휠은 픽셀 위치가 곧 값이라
// 컨테이너 여백이 조금만 달라져도 엉뚱한 날짜가 확정되는 사고가 났다.
import { useState } from 'react';
import { useAppFlow, useAppActions } from '../../contexts/AppContext';
import {
  BIRTH_HOURS_12,
  BIRTH_MINUTES,
  formatBirthDigits,
  parseBirthDigits,
  toHour24,
  toMeridiemHour,
  withCurrentValue,
} from '../../utils/birthWheel';
import type { Meridiem } from '../../utils/birthWheel';

export function BirthScreen() {
  const { birthData, birthError } = useAppFlow();
  const { setStep, setBirthData } = useAppActions();

  const update = (patch: Record<string, unknown>) => setBirthData({ ...birthData, ...patch });

  const { meridiem, hour12 } = toMeridiemHour(parseInt(birthData.hour));
  const setHour = (nextMeridiem: Meridiem, nextHour12: number) =>
    update({ hour: String(toHour24(nextMeridiem, nextHour12)) });

  // 예전 입력이 목록 밖 값(37분 등)이어도 선택이 비지 않게 끼워 넣는다.
  const minutes = withCurrentValue(BIRTH_MINUTES, parseInt(birthData.minute));

  // 생년월일은 여섯 자리로 받는다. 타이핑 중(자릿수 미달)에도 화면이 튀지 않도록
  // 입력 문자열은 로컬에 두고, 여섯 자리가 채워졌을 때만 컨텍스트로 확정한다.
  const [digits, setDigits] = useState(() => {
    const date = {
      year: parseInt(birthData.year),
      month: parseInt(birthData.month),
      day: parseInt(birthData.day),
    };
    return Object.values(date).every(Number.isFinite) ? formatBirthDigits(date) : '';
  });
  const parsed = parseBirthDigits(digits);
  const onDigits = (raw: string) => {
    const next = raw.replace(/\D/g, '').slice(0, 6);
    setDigits(next);
    const date = parseBirthDigits(next);
    if (date) update({ year: String(date.year), month: String(date.month), day: String(date.day) });
  };
  const digitsError = digits.length === 6 && !parsed
    ? '생년월일을 다시 확인해 주세요. 연·월·일을 두 자리씩 입력하면 돼요.'
    : null;

  return (
    <section className="jg-screen">
      <h1 className="jg-title">수호신을 깨워볼까요?</h1>
      <p className="jg-sub">
        태어난 날과 시간을 알려주세요.<br />
        입력한 정보는 당신의 직장생활 수호신을 찾는 데만 사용해요.
      </p>

      <div className="jg-birth-card">
        <span className="jg-birth-label">성별</span>
        <div className="jg-toggle-row">
          <button
            type="button"
            className={`jg-toggle ${birthData.gender === 0 ? 'is-on' : ''}`}
            aria-pressed={birthData.gender === 0}
            onClick={() => update({ gender: 0 })}
          >여성</button>
          <button
            type="button"
            className={`jg-toggle ${birthData.gender === 1 ? 'is-on' : ''}`}
            aria-pressed={birthData.gender === 1}
            onClick={() => update({ gender: 1 })}
          >남성</button>
        </div>

        <span className="jg-birth-label">달력</span>
        <div className="jg-toggle-row">
          <button
            type="button"
            className={`jg-toggle ${birthData.isSolar ? 'is-on' : ''}`}
            aria-pressed={birthData.isSolar}
            onClick={() => update({ isSolar: true })}
          >양력</button>
          <button
            type="button"
            className={`jg-toggle ${!birthData.isSolar ? 'is-on' : ''}`}
            aria-pressed={!birthData.isSolar}
            onClick={() => update({ isSolar: false })}
          >음력</button>
        </div>

        <span className="jg-birth-label">생년월일 6자리</span>
        <input
          className="jg-digits"
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          maxLength={6}
          placeholder="______"
          aria-label="생년월일 여섯 자리"
          value={digits}
          onChange={e => onDigits(e.target.value)}
        />
        <p className="jg-digits-echo">
          {parsed
            ? `${parsed.year}년 ${parsed.month}월 ${parsed.day}일`
            : '연·월·일을 두 자리씩 붙여서 입력해 주세요.'}
        </p>

        <span className="jg-birth-label">태어난 시간</span>
        <div className="jg-time-row">
          <select
            className="jg-select" aria-label="오전 오후"
            value={meridiem}
            disabled={!birthData.hasTime}
            onChange={e => setHour(e.target.value as Meridiem, hour12)}
          >
            <option value="am">오전</option>
            <option value="pm">오후</option>
          </select>
          <select
            className="jg-select" aria-label="출생 시"
            value={String(hour12)}
            disabled={!birthData.hasTime}
            onChange={e => setHour(meridiem, parseInt(e.target.value))}
          >
            {BIRTH_HOURS_12.map(hour => <option key={hour} value={String(hour)}>{hour}시</option>)}
          </select>
          <select
            className="jg-select" aria-label="출생 분"
            value={birthData.minute}
            disabled={!birthData.hasTime}
            onChange={e => update({ minute: e.target.value })}
          >
            {minutes.map(minute => <option key={minute} value={String(minute)}>{minute}분</option>)}
          </select>
        </div>

        <label className="jg-unknown">
          <input
            type="checkbox"
            checked={!birthData.hasTime}
            onChange={event => update({ hasTime: !event.target.checked })}
          />
          태어난 시간을 잘 몰라요
        </label>
      </div>

      {(digitsError || birthError) && <p className="jg-error">{digitsError || birthError}</p>}

      <button
        className="jg-btn"
        type="button"
        disabled={Boolean(digitsError || birthError || !parsed)}
        onClick={() => setStep('summon')}
      >
        수호신 깨우기
      </button>
      <button className="jg-text-link" type="button" onClick={() => setStep('landing')}>
        이전으로
      </button>
    </section>
  );
}
