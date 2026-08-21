// 랜딩의 수호신 캐러셀.
//
// 첫인상에서 "여러 마리가 계속 바뀐다"가 보여야 한다. 한 장만 크게 띄우면
// "내 결과를 미리 보여주는 화면"으로 오해되고, 그러면 60마리라는 컬렉션 감각이 사라진다.
// 그래서 양옆 카드를 일부러 걸쳐 보이게 두고(peek), 카운터로 60 중 몇 번인지 계속 알린다.
//
// 60마리를 다 태우지는 않는다. 전부 넘겨본 사람은 "이런 게 있구나"로 끝나지만, 여섯 장만
// 본 사람에게는 "나머지는 뭐지, 나는 뭐가 나오지"가 남는다. 그 궁금증이 CTA를 누르게 한다.
// 60마리는 여섯씩 열 세트로 나뉘어 있고, 방문할 때마다 다음 세트로 넘어간다.
//
// 스크롤은 브라우저의 scroll-snap에 맡긴다 — 직접 드래그를 구현하면 모바일 관성 스크롤과
// 접근성(키보드·스크린리더 순서)을 전부 다시 만들어야 하는데, 네이티브 스크롤은 공짜로 준다.
import { useEffect, useRef, useState } from 'react';
import { advanceTeaseSet, currentTeaseSetIndex, teaseSet } from '../../utils/landingTease';
import { GUARDIAN_TOTAL } from '../../utils/guardianAssets';
import { GuardianImage } from './GuardianImage';

/** 자동 전환 간격. 한 줄 카피를 읽고 다음 장이 궁금해지는 데 걸리는 시간. */
const AUTO_ADVANCE_MS = 1800;
/** 사용자가 직접 넘긴 뒤 자동 전환을 다시 켜기까지 기다리는 시간. */
const RESUME_AFTER_MS = 5000;
/** 스크롤이 멎었다고 볼 때까지의 시간. 이 뒤에야 현재 카드를 다시 읽는다. */
const SCROLL_SETTLE_MS = 120;

export function GuardianCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  // 세트는 이 화면이 살아 있는 동안 고정한다 — 리렌더마다 다시 고르면 보던 카드가 뒤바뀐다.
  const [teaseSetIndex] = useState(currentTeaseSetIndex);
  const [teases] = useState(() => teaseSet(teaseSetIndex));
  const [index, setIndex] = useState(0);
  // 사용자가 직접 만지는 동안에는 자동 전환이 끼어들지 않는다 — 손으로 넘기는 중에
  // 화면이 저 혼자 움직이면 조작을 빼앗긴 느낌이 든다.
  const [paused, setPaused] = useState(false);
  const resumeTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  const scrollToCard = (next: number, behavior: ScrollBehavior) => {
    const track = trackRef.current;
    const card = track?.children[next] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior });
  };

  // 자동 전환. 움직임을 줄여달라고 한 사람에게는 돌리지 않는다(점과 스와이프로 계속 볼 수 있다).
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setIndex(current => {
        const next = (current + 1) % teases.length;
        scrollToCard(next, 'smooth');
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, teases.length]);

  // 다음 방문에 볼 세트를 적어둔다. 렌더가 아니라 여기서 하는 이유는,
  // 개발 모드에서 초기화 함수가 두 번 불릴 때 세트가 두 칸씩 건너뛰기 때문이다.
  useEffect(() => { advanceTeaseSet(teaseSetIndex); }, [teaseSetIndex]);

  // 탭이 가려져 있으면 자동 전환을 멈춘다. 안 보는 화면이 60장을 다 넘기며
  // 그림을 전부 내려받게 두면 데이터만 쓰고 남는 게 없다.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => () => {
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
  }, []);

  const holdAutoAdvance = () => {
    setPaused(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  };

  /**
   * 스크롤이 멎은 뒤에 현재 카드를 다시 읽는다.
   *
   * 스크롤이 움직이는 동안 매번 읽으면 안 된다. 자동 전환이 마지막 장에서 첫 장으로 되감을 때는
   * 트랙 전체를 가로지르는 긴 부드러운 스크롤이 도는데, 그 도중에 위치를 읽으면 지나가던 중간
   * 카드가 "현재"로 잡히고 다음 전환이 거기서 이어져 순서가 통째로 어긋난다.
   */
  const syncIndexFromScroll = () => {
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      const center = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let shortest = Infinity;
      for (let position = 0; position < track.children.length; position += 1) {
        const card = track.children[position] as HTMLElement;
        const distance = Math.abs(card.offsetLeft + card.clientWidth / 2 - center);
        if (distance < shortest) {
          shortest = distance;
          nearest = position;
        }
      }
      setIndex(nearest);
    }, SCROLL_SETTLE_MS);
  };

  const current = teases[index];

  return (
    <div className="jg-carousel">
      <div
        className="jg-carousel-track"
        ref={trackRef}
        onScroll={syncIndexFromScroll}
        onPointerDown={holdAutoAdvance}
        onWheel={holdAutoAdvance}
        onKeyDown={holdAutoAdvance}
        tabIndex={0}
        role="group"
        aria-label={`수호신 ${teases.length}종 — 좌우로 넘겨보세요`}
      >
        {teases.map((tease, position) => (
          <div
            className={`jg-carousel-card ${position === index ? 'is-current' : ''}`}
            key={tease.guardian.id}
            data-element={tease.guardian.element}
            aria-hidden={position !== index}
          >
            <div className="jg-carousel-portrait">
              {/* 104px로 그리는 자리이므로 원본(640px) 대신 썸네일을 받는다.
                  60마리 전체 기준 2.8MB → 620KB. 첫 세 장만 미리 받고 나머지는 넘길 때 받는다. */}
              <GuardianImage guardian={tease.guardian} thumb eager={position < 3} />
            </div>
            <p className="jg-carousel-name">{tease.guardian.nickname}</p>
            <p className="jg-carousel-copy">{tease.copy}</p>
          </div>
        ))}
      </div>

      {/* 60 중 몇 번째인지만 알린다. "No."를 붙이면 순위처럼 읽혀서
          1번이 제일 좋은 수호신인 것처럼 보인다 — 여기서 강조할 것은 60이라는 규모뿐이다. */}
      <p className="jg-carousel-count" aria-live="polite">
        {current.guardian.sequence} / {GUARDIAN_TOTAL}
      </p>

      <div className="jg-carousel-dots" role="tablist" aria-label="수호신 넘겨보기">
        {teases.map((tease, position) => (
          <button
            className={`jg-carousel-dot ${position === index ? 'is-on' : ''}`}
            key={tease.guardian.id}
            type="button"
            role="tab"
            aria-selected={position === index}
            aria-label={tease.guardian.nickname}
            onClick={() => {
              holdAutoAdvance();
              setIndex(position);
              scrollToCard(position, 'smooth');
            }}
          />
        ))}
      </div>

    </div>
  );
}
