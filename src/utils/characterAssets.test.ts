import assert from 'node:assert/strict';
import test from 'node:test';
import { access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getCharacterAsset, listCharacterAssets, CHARACTER_COLLECTION_TOTAL } from './characterAssets.ts';

test('일간 10종은 서로 다른 크리처 이미지와 고유한 컬렉션 번호를 가진다', () => {
  const assets = listCharacterAssets();
  assert.equal(assets.length, 10);
  assert.equal(CHARACTER_COLLECTION_TOTAL, 10);
  assert.equal(new Set(assets.map(a => a.imageUrl)).size, 10);
  assert.equal(new Set(assets.map(a => a.collectionNo)).size, 10);
  assert.ok(assets.every(a => a.imageUrl.startsWith('/creatures/') && a.imageUrl.endsWith('.webp')));
  assert.ok(assets.every(a => a.collectionNo >= 1 && a.collectionNo <= 10));
});

test('모르는 일간이 들어오면 기본값(갑)으로 안전하게 대체한다', () => {
  const asset = getCharacterAsset('알수없음');
  assert.equal(asset.dayGan, '갑');
  assert.equal(asset.collectionNo, 1);
});

test('같은 오행끼리는 같은 원소 라벨을 공유한다', () => {
  assert.equal(getCharacterAsset('갑').element, getCharacterAsset('을').element);
  assert.equal(getCharacterAsset('갑').elementLabel, '목(木)');
  assert.notEqual(getCharacterAsset('갑').element, getCharacterAsset('병').element);
});

test('배포용 크리처 이미지는 모두 존재하며 한 장당 150KB 이하이다', async () => {
  for (const asset of listCharacterAssets()) {
    const relativePath = `../../public${asset.imageUrl}`;
    const filePath = fileURLToPath(new URL(relativePath, import.meta.url));
    await access(filePath);
    const info = await stat(filePath);
    assert.ok(info.size <= 150 * 1024, `${asset.imageUrl} is ${info.size} bytes`);
  }
});
