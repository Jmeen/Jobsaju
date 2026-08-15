// 생년월일·시각 입력용 스크롤 휠.
//
// 원래 AppContext.tsx에 들어 있었는데, 컨텍스트 모듈이 UI를 함께 내보내면
// Fast Refresh가 깨지고 화면들이 상태를 쓰려고 컨텍스트에서 UI까지 끌어오게 된다.
import { useEffect, useRef } from 'react';
import { WHEEL_ITEM_HEIGHT, WHEEL_HEIGHT, WHEEL_PADDING } from '../utils/birthWheel';

export function WheelColumn({
  values,
  value,
  onChange,
  formatValue = (v: number) => String(v),
  ariaLabel,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  ariaLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);

  // 값이 외부에서 바뀌었을 때(초기 로드, 다른 휠의 파생 변경 등) 스크롤 위치를 맞춘다
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx === -1) return;
    const target = idx * WHEEL_ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: 'auto' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values.length]);

  const handleScroll = () => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    // 스크롤이 멈춘 뒤에만 값을 확정한다 (스크롤 중 계속 갱신하면 매 프레임 리렌더가 생긴다)
    scrollTimeoutRef.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)));
      const target = idx * WHEEL_ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - target) > 1) {
        el.scrollTo({ top: target, behavior: 'smooth' });
      }
      const next = values[idx];
      if (next !== undefined && next !== value) onChange(next);
    }, 110);
  };

  return (
    <div className="wheel-col" role="listbox" aria-label={ariaLabel}>
      <div className="wheel-highlight" style={{ height: WHEEL_ITEM_HEIGHT, top: WHEEL_PADDING }} />
      <div
        ref={scrollRef}
        className="wheel-scroll"
        style={{ height: WHEEL_HEIGHT }}
        onScroll={handleScroll}
      >
        <div style={{ height: WHEEL_PADDING }} aria-hidden="true" />
        {values.map(v => (
          <div
            key={v}
            role="option"
            aria-selected={v === value}
            className={`wheel-item${v === value ? ' active' : ''}`}
            style={{ height: WHEEL_ITEM_HEIGHT }}
            onClick={() => onChange(v)}
          >
            {formatValue(v)}
          </div>
        ))}
        <div style={{ height: WHEEL_PADDING }} aria-hidden="true" />
      </div>
    </div>
  );
}
