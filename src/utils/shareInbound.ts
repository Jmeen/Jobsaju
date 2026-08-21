// 공유 링크로 들어온 사람의 문맥을 읽고 결과 완료까지 들고 간다.
// 공유 URL: /?fromGuardian=甲寅&utm_source=guardian_share&utm_medium=kakao&shareSessionId=<UUID>
//
// 귀속값은 입력 단계를 지나 결과 완료 이벤트까지 살아 있어야 하므로 sessionStorage에 둔다.
// 잘못되거나 없는 값은 오류로 만들지 않고 그냥 일반 랜딩으로 떨어뜨린다.
//
// URL 파라미터 이름은 shareSessionId이지만, 내부 필드와 D1 컬럼은 계속 share_id를 쓴다.
// 같은 값을 가리키는 다른 이름일 뿐이고, 이미 쌓인 분석 데이터와 쿼리를 깨지 않기 위해서다.
// 예전 링크가 쓰던 shareId 파라미터도 계속 받아준다 — 이미 카톡방에 떠 있는 링크가 있다.
import { isGuardianId } from './guardianAssets.ts';
import type { GuardianShareMedium } from './guardianShare.ts';

const STORAGE_KEY = 'jobsaju_share_inbound_v1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEDIUMS: readonly GuardianShareMedium[] = ['kakao', 'copy'];

export type ShareInbound = {
  /** 보낸 사람의 수호신 id. 배너와 fromGuardianId 이벤트 필드에 쓴다. */
  fromGuardianId: string;
  /** 원본 공유 흐름 id(URL에서는 shareSessionId). 없을 수도 있다. */
  shareId: string | null;
  /** 어떤 경로로 공유된 링크인지. 카카오와 링크 복사를 나눠 보기 위해 결과 완료까지 들고 간다. */
  medium: GuardianShareMedium | null;
};

function normalizeMedium(value: string | null): GuardianShareMedium | null {
  return MEDIUMS.find(medium => medium === value) ?? null;
}

/** 쿼리에서 공유 유입 문맥을 읽는다. fromGuardian이 유효한 60갑자일 때만 성립한다. */
export function parseShareInbound(search: string): ShareInbound | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }

  const fromGuardianId = params.get('fromGuardian');
  if (!fromGuardianId || !isGuardianId(fromGuardianId)) return null;

  const rawShareId = params.get('shareSessionId') ?? params.get('shareId');
  return {
    fromGuardianId,
    shareId: rawShareId && UUID_V4.test(rawShareId) ? rawShareId : null,
    medium: normalizeMedium(params.get('utm_medium')),
  };
}

function getStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function saveShareInbound(inbound: ShareInbound): void {
  try {
    getStore()?.setItem(STORAGE_KEY, JSON.stringify(inbound));
  } catch {
    // 저장이 막혀도 이번 방문 안에서는 메모리 값으로 계속 간다.
  }
}

export function loadShareInbound(): ShareInbound | null {
  try {
    const raw = getStore()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.fromGuardianId !== 'string' || !isGuardianId(parsed.fromGuardianId)) return null;
    const shareId = typeof parsed?.shareId === 'string' && UUID_V4.test(parsed.shareId) ? parsed.shareId : null;
    return {
      fromGuardianId: parsed.fromGuardianId,
      shareId,
      medium: normalizeMedium(typeof parsed?.medium === 'string' ? parsed.medium : null),
    };
  } catch {
    return null;
  }
}

/**
 * 이번 방문의 공유 유입 문맥. 새로 들어온 링크가 있으면 그것으로 갱신하고,
 * 없으면 앞서 저장해둔 값을 이어 쓴다(입력 단계에서 쿼리가 사라져도 유지되도록).
 */
export function resolveShareInbound(search: string): ShareInbound | null {
  const fresh = parseShareInbound(search);
  if (fresh) {
    saveShareInbound(fresh);
    return fresh;
  }
  return loadShareInbound();
}
