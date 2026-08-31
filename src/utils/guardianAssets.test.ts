import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import {
  FALLBACK_GUARDIAN_ID,
  GUARDIAN_TOTAL,
  getGuardianAsset,
  getGuardianSequence,
  guardianIdBySequence,
  guardianIdFromPillar,
  guardianElement,
  guardianEmojiFallbackUrl,
  guardianImageUrl,
  isGuardianId,
} from './guardianAssets.ts';
import { GUARDIAN_PROFILES } from './guardianProfiles.ts';
import { getGuardianCharacter, hasGuardianCharacter } from './guardianCharacters.ts';
// @ts-ignore
import GUARDIAN_CHARACTERS from '../../free_engine_characters.js';

test('60갑자 순번은 천간 10주기·지지 12주기로 돌아 양 끝이 맞는다', () => {
  assert.equal(guardianIdBySequence(1), '甲子');
  assert.equal(guardianIdBySequence(51), '甲寅');
  assert.equal(guardianIdBySequence(60), '癸亥');

  const ids = new Set(Array.from({ length: GUARDIAN_TOTAL }, (_, i) => guardianIdBySequence(i + 1)));
  assert.equal(ids.size, GUARDIAN_TOTAL, '60갑자는 중복 없이 60개여야 한다');
});

test('캐릭터 데이터의 모든 id가 순번을 가지며, 그림 파일이 실제로 존재한다', () => {
  assert.equal(GUARDIAN_CHARACTERS.length, GUARDIAN_TOTAL);

  for (const character of GUARDIAN_CHARACTERS as { id: string }[]) {
    const sequence = getGuardianSequence(character.id);
    assert.ok(sequence, `${character.id}에 대응하는 60갑자 순번이 없다`);
    assert.ok(
      existsSync(new URL(`../../public${guardianImageUrl(sequence)}`, import.meta.url)),
      `${character.id}(${sequence}) 아트워크가 public/guardians에 없다`,
    );
  }
});

test('데이터 파일 순서가 아니라 60갑자 자체로 그림을 고른다', () => {
  // 배열 51번째가 甲寅이고 그림도 51번이어야 한다 — 목업이 쓰는 조합이다.
  const asset = getGuardianAsset('甲寅');
  assert.equal(asset.sequence, 51);
  assert.equal(asset.imageUrl, '/guardians/51.webp');
  assert.equal(getGuardianCharacter(asset.id).id, '甲寅');
  assert.match(getGuardianCharacter(asset.id).name, /호랑이/);
});

test('일주 한자를 이어 붙인 값이 곧 수호신 id다', () => {
  assert.equal(guardianIdFromPillar('甲', '寅'), '甲寅');
  assert.ok(isGuardianId(guardianIdFromPillar('癸', '亥')));
  assert.equal(isGuardianId('甲亥'), false, '실재하지 않는 간지 조합은 걸러야 한다');
});

test('알 수 없는 일주가 들어와도 화면이 비지 않게 기본 수호신으로 떨어진다', () => {
  const asset = getGuardianAsset('없는간지');
  assert.equal(asset.id, FALLBACK_GUARDIAN_ID);
  assert.equal(asset.sequence, 1);
  assert.ok(hasGuardianCharacter(asset.id));
});

test('이미지 로드 실패 시 기존 수호신 이모지를 보여줄 data URL을 만든다', () => {
  const url = guardianEmojiFallbackUrl('🐯');

  assert.match(url, /^data:image\/svg\+xml,/);
  assert.ok(decodeURIComponent(url).includes('🐯'));
});

test('60종 전체가 고유한 별명과 카피를 갖는다', () => {
  assert.equal(getGuardianAsset('甲寅').nickname, '새싹호랑이');   // 51
  assert.equal(getGuardianAsset('甲子').nickname, '저지르쥐');     // 1
  assert.equal(getGuardianAsset('乙卯').nickname, '잎하나토끼');   // 52
  assert.equal(getGuardianAsset('戊寅').nickname, '허당호랑이');   // 15
  assert.equal(getGuardianAsset('乙丑').nickname, '조금늦소');     // 2

  const assets = Array.from({ length: GUARDIAN_TOTAL }, (_, i) => getGuardianAsset(guardianIdBySequence(i + 1)));
  assert.equal(new Set(assets.map(a => a.nickname)).size, GUARDIAN_TOTAL, '별명이 겹친다');
  assert.equal(new Set(assets.map(a => a.copy)).size, GUARDIAN_TOTAL, '카피가 겹친다');
  for (const asset of assets) {
    assert.ok(asset.nickname && asset.copy && asset.ganzhiKo && asset.animalEmoji);
  }
});

test('확정한 수호신 이름과 한 줄 설명은 해당 60갑자에 붙는다', () => {
  const fixtures = [
    ['甲子', '저지르쥐', '기회는 남들보다 먼저 잡는데, 신나게 뛰어가다 씨앗을 다 흘리고 온다.'],
    ['己巳', '보고또보고뱀', '확인했고 또 확인했는데, 그래도 혹시 몰라 한 번 더 들여다본다.'],
    ['己丑', '조금만더해소', '쉴 시간이 됐는데도 “딱 이것만 하고”를 벌써 세 번째 말하고 있다.'],
    ['癸巳', '스리슬쩍뱀', '복잡한 상황에서 스리슬쩍 빠져나오는 건 천재급인데, 너무 잘 숨어서 아무도 못 찾을 때가 있다.'],
    ['乙卯', '잎하나토끼', '작은 가능성도 정성껏 키우는데, 잎 하나만 시들어도 하루 종일 마음에 걸린다.'],
    ['癸亥', '쉬어야돼지', '주인의 칼퇴를 지켜주려 마법까지 쓰지만, 한 번에 힘을 다 써 자기가 먼저 방전된다.'],
  ] as const;

  for (const [id, nickname, copy] of fixtures) {
    const asset = getGuardianAsset(id);
    assert.equal(asset.nickname, nickname);
    assert.equal(asset.copy, copy);
  }
});

test('기획 데이터의 한글 간지가 60갑자 순번과 어긋나지 않는다', () => {
  // 별명·카피가 엉뚱한 수호신에게 붙으면 그림과 글이 따로 논다.
  const GAN_KO = '갑을병정무기경신임계';
  const ZHI_KO = '자축인묘진사오미신유술해';

  for (const profile of GUARDIAN_PROFILES) {
    const index = profile.sequence - 1;
    const expected = GAN_KO[index % 10] + ZHI_KO[index % 12];
    assert.equal(profile.ganzhiKo, expected, `${profile.sequence}번(${profile.nickname})의 간지가 어긋난다`);
  }
  assert.equal(GUARDIAN_PROFILES.length, GUARDIAN_TOTAL);
});

test('일간 두 개가 오행 하나를 이룬다', () => {
  assert.equal(guardianElement('甲子'), 'wood');
  assert.equal(guardianElement('乙丑'), 'wood');
  assert.equal(guardianElement('丙寅'), 'fire');
  assert.equal(guardianElement('戊辰'), 'earth');
  assert.equal(guardianElement('庚午'), 'metal');
  assert.equal(guardianElement('癸亥'), 'water');
  assert.equal(getGuardianAsset('癸亥').elementLabel, '수(水)');
});

test('작게 그리는 자리를 위한 썸네일 경로가 함께 나온다', () => {
  // 원본은 장당 47KB라 랜딩 캐러셀에 60마리를 태우면 2.8MB가 나간다.
  const tiger = getGuardianAsset('甲寅');

  assert.equal(tiger.imageUrl, `/guardians/${String(tiger.sequence).padStart(2, '0')}.webp`);
  assert.equal(tiger.thumbUrl, `/guardians/thumb/${String(tiger.sequence).padStart(2, '0')}.webp`);
});
