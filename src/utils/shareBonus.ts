export type ShareBonusFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * 결제한 사용자가 공유 링크를 실제로 복사했을 때 추가 질문 1회를 연다.
 * 서버가 unlock token을 다시 검증하므로 결제하지 않은 사용자는 보상을 만들 수 없다.
 */
export async function grantCopyShareBonus(
  unlockToken: string,
  fetchFn: ShareBonusFetch = fetch,
): Promise<boolean> {
  if (!unlockToken) return false;

  try {
    const response = await fetchFn('/api/share-bonus/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unlock_token: unlockToken }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
