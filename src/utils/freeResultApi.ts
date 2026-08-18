// 무료 결과의 정식 계산 경로. /api/free-result가 사주 원국과 60갑자 수호신을 함께 돌려준다.
// 서버와 클라이언트가 같은 sajuCore를 쓰므로 결과는 동일하고, 서버가 응답하지 못할 때만
// 호출부가 클라이언트 계산으로 되돌아간다(오프라인·장애에도 결과 화면이 뜨도록).
import type { SajuCoreResult } from './sajuCore.ts';

export type FreeResultBirthInput = {
  year: number;
  month: number;
  day: number;
  /** 시간 미상이면 null — 서버가 정오로 보정한다. */
  hour: number | null;
  minute: number | null;
  gender: number | string;
  isSolar: boolean;
};

export type FreeResultPayload = {
  sajuResult: SajuCoreResult;
  guardianId: string;
};

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * 배포가 어긋나 예전 응답(scores 없이 pillars·dayGan만 주던 형태)이 오면 결과 화면이 깨진다.
 * 화면이 실제로 읽는 필드가 다 있는지 확인하고, 하나라도 없으면 폴백을 타게 한다.
 */
export function isUsableFreeResult(value: unknown): value is SajuCoreResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<SajuCoreResult>;

  const day = result.pillars?.day;
  if (!day || typeof day.ganHanja !== 'string' || typeof day.zhiHanja !== 'string') return false;
  if (!day.ganHanja || !day.zhiHanja) return false;
  if (!result.dayGan || typeof result.dayGan.char !== 'string') return false;

  const scores = result.scores;
  if (!scores) return false;
  return isFiniteNumber(scores.jobChange) && isFiniteNumber(scores.stay) && isFiniteNumber(scores.negotiation);
}

/**
 * 성공하면 사주 결과와 수호신 id를, 실패하면 null을 돌려준다.
 * 무료 결과는 절대 막히면 안 되므로 이 함수는 던지지 않는다.
 */
/** 서버가 응답하지 않을 때 소환 연출이 끝나도 화면이 멈추지 않도록 두는 상한. */
export const FREE_RESULT_TIMEOUT_MS = 5000;

export async function fetchFreeResult(
  birth: FreeResultBirthInput,
  deps: { fetch?: FetchLike; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<FreeResultPayload | null> {
  const doFetch = deps.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = deps.timeoutMs ?? FREE_RESULT_TIMEOUT_MS;
  const timeoutController = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const attempt = async (): Promise<FreeResultPayload | null> => {
    try {
      const response = await doFetch('/api/free-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(birth),
        signal: deps.signal ?? timeoutController.signal,
      });
      if (!response.ok) return null;

      const data = await response.json();
      if (!isUsableFreeResult(data?.saju_data)) return null;

      const sajuResult = data.saju_data as SajuCoreResult;
      // 서버가 붙여준 캐릭터 id를 우선 쓰되, 없으면 일주에서 직접 만든다.
      const guardianId = typeof data?.character?.id === 'string' && data.character.id
        ? data.character.id
        : `${sajuResult.pillars.day.ganHanja}${sajuResult.pillars.day.zhiHanja}`;

      return { sajuResult, guardianId };
    } catch {
      // 네트워크 단절·중단·JSON 파손 전부 폴백 대상이다.
      return null;
    }
  };

  // 응답을 아예 돌려주지 않는 서버(행)까지 감안해 시간으로도 끊는다.
  // abort 신호를 무시하는 구현이 있을 수 있어 경주로 처리한다.
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => {
      timeoutController.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([attempt(), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
