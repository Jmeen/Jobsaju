// 60수호신의 긴 해설문(identity/strength/blind_spot/best_environment).
// 약 110KB라 랜딩·출생 입력에는 필요 없다. 결과·고민 화면에서만 불러 쓰도록
// 가벼운 guardianAssets에서 떼어냈다.
// @ts-ignore — 런타임 데이터 파일이라 타입 선언이 없다.
import GUARDIAN_CHARACTERS from '../../free_engine_characters.js';

export type GuardianCharacter = {
  id: string;
  name: string;
  emoji: string;
  title: string;
  core_type: string;
  keywords: string[];
  summary_og: string;
  identity: string;
  strength: string;
  blind_spot: string;
  best_environment: string;
};

const BY_ID: ReadonlyMap<string, GuardianCharacter> = new Map(
  (GUARDIAN_CHARACTERS as GuardianCharacter[]).map(character => [character.id, character]),
);

export function getGuardianCharacter(id: string): GuardianCharacter {
  return (BY_ID.get(id) ?? (GUARDIAN_CHARACTERS as GuardianCharacter[])[0]);
}

export function hasGuardianCharacter(id: string): boolean {
  return BY_ID.has(id);
}
