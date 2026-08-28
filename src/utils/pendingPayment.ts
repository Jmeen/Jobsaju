// 모바일 PG 리디렉션 중에만 보관하는 결제 문맥이다.
// 결제 완료 여부는 절대 이 값으로 판단하지 않고, 복귀 뒤 Worker가 포트원 API로 재검증한다.
import type { SajuCoreResult } from './sajuCore';

const STORAGE_KEY = 'jobsaju_pending_payment_v1';

export type PendingPayment = {
  paymentId: string;
  email: string;
  couponCode?: string;
  discountPercent?: number;
  // 취소 후에는 결제 전 결과 화면을 즉시 그리기 위한 표시용 데이터다.
  // 해금·금액 판단에는 사용하지 않는다.
  sajuResult?: SajuCoreResult;
};

function getStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function savePendingPayment(payment: PendingPayment): void {
  try {
    getStore()?.setItem(STORAGE_KEY, JSON.stringify(payment));
  } catch {
    // 저장이 막혀 있으면 모바일 리디렉션을 시작하지 않는다. 호출부가 안내한다.
  }
}

export function loadPendingPayment(): PendingPayment | null {
  try {
    const raw = getStore()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.paymentId !== 'string' || !parsed.paymentId) return null;
    if (typeof parsed?.email !== 'string' || !parsed.email) return null;
    if (parsed.couponCode !== undefined && typeof parsed.couponCode !== 'string') return null;
    if (parsed.discountPercent !== undefined
      && (!Number.isInteger(parsed.discountPercent) || parsed.discountPercent < 1 || parsed.discountPercent > 100)) return null;
    if (parsed.sajuResult !== undefined && (typeof parsed.sajuResult !== 'object' || !parsed.sajuResult)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPayment(): void {
  try {
    getStore()?.removeItem(STORAGE_KEY);
  } catch {
    // 실패해도 결제 검증의 중복 방어는 서버가 담당한다.
  }
}
