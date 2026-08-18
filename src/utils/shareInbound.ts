// 공유 링크로 들어온 사람의 문맥을 읽고 결과 완료까지 들고 간다.
// 공유 URL: /?fromGuardian=甲寅&utm_source=guardian_share&shareId=<UUID>
//
// 귀속값은 입력 단계를 지나 결과 완료 이벤트까지 살아 있어야 하므로 sessionStorage에 둔다.
// 잘못되거나 없는 값은 오류로 만들지 않고 그냥 일반 랜딩으로 떨어뜨린다.
import { isGuardianId } from './guardianAssets.ts';

const STORAGE_KEY = 'jobsaju_share_inbound_v1';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ShareInbound = {
  /** 보낸 사람의 수호신 id. 배너와 fromGuardianId 이벤트 필드에 쓴다. */
  fromGuardianId: string;
  /** 원본 공유 흐름 id. 없을 수도 있다. */
  shareId: string | null;
};

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

  const rawShareId = params.get('shareId');
  return {
    fromGuardianId,
    shareId: rawShareId && UUID_V4.test(rawShareId) ? rawShareId : null,
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
    return { fromGuardianId: parsed.fromGuardianId, shareId };
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

/** 공유할 때 붙이는 URL. 받는 사람이 보낸 사람의 수호신 문맥을 이어받는다. */
export function buildShareUrl(baseUrl: string, fromGuardianId: string, shareId: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('fromGuardian', fromGuardianId);
    url.searchParams.set('utm_source', 'guardian_share');
    url.searchParams.set('shareId', shareId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}
