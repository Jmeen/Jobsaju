// 결제는 끝났지만 리포트는 아직 못 만든 구간을 버텨주는 임시 보관소.
//
// 결제 후 입력 화면에서 새로고침하거나 탭이 죽으면 결제 식별자가 사라진다.
// 그러면 이미 돈을 낸 사람에게 "처음부터 다시" 안내가 나가므로, 리포트가 나올 때까지만
// sessionStorage에 들고 있다가 생성이 끝나면 지운다.
// 탭 단위(sessionStorage)로 두는 이유는 결제 흐름이 그 탭에서 끝나기 때문이다.

const STORAGE_KEY = 'jobsaju_paid_session_v1';

export type PaidSession = {
  paymentId: string;
  email: string;
};

function getStore(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function savePaidSession(session: PaidSession): void {
  try {
    getStore()?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // 저장이 막혀 있어도 결제 흐름 자체는 진행돼야 한다(메모리 ref로 계속 간다).
  }
}

export function loadPaidSession(): PaidSession | null {
  try {
    const raw = getStore()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.paymentId !== 'string' || !parsed.paymentId) return null;
    if (typeof parsed?.email !== 'string' || !parsed.email) return null;
    return { paymentId: parsed.paymentId, email: parsed.email };
  } catch {
    return null;
  }
}

export function clearPaidSession(): void {
  try {
    getStore()?.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 다음 결제가 덮어쓴다.
  }
}
