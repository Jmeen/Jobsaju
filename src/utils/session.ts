// 진단 세션의 localStorage 저장/복원.
// 컨텍스트가 아니라 여기 두어, 저장 형식이 바뀔 때 봐야 할 곳을 한 군데로 모은다.
import type { FollowUpRecord } from './followUpValidation.ts';

export const STORAGE_KEY = 'saju_session_v1';

export type SavedSession = {
  birthData: any;
  careerContext: any;
  aiReport: any | null;
  isUnlocked: boolean;
  followUp?: FollowUpRecord | null;
  followUps?: FollowUpRecord[];
  shareBonusGranted?: boolean;
  resultSessionId?: string;
  shareId?: string;
  unlockToken?: string;
  savedAt: string;
};

export function loadSavedSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.birthData?.year) return null;
    return parsed;
  } catch {
    return null;
  }
}

