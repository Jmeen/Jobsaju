// design-assets의 60수호신 원본(장당 약 2MB PNG)을 서빙 가능한 webp로 굽는다.
// 원본은 저장소에 두되 public/에는 굽은 결과만 올린다 — 원본 그대로면 114MB라 배포할 수 없다.
// 파일명은 60갑자 순번(01~60)으로, free_engine_characters.js의 배열 순서와 1:1 대응한다.
//   npm run assets:guardians
// sharp는 이 스크립트 전용이라 devDependencies에 있다.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'design-assets', 'characters', 'jobsaju-60-guardians-v2.4-production');
const OUT = path.join(__dirname, '..', 'public', 'guardians');
const THUMB_OUT = path.join(OUT, 'thumb');
const EXPECTED = 60;
const SIZE = 640; // 결과·소환 화면의 주인공 크기
// 랜딩 캐러셀은 60마리를 전부 태운다. 카드가 104px로 그리는데 640px을 내려받으면
// 랜딩 하나에 2.8MB가 나간다. 2x 화면까지 감당할 만큼만 따로 굽는다.
const THUMB_SIZE = 224;

async function main() {
  const files = fs.readdirSync(SRC).filter(name => /^\d{2}_.*\.png$/.test(name)).sort();
  if (files.length !== EXPECTED) {
    throw new Error(`원본 ${EXPECTED}장을 기대했지만 ${files.length}장을 찾았습니다.`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(THUMB_OUT, { recursive: true });
  let totalBytes = 0;
  let thumbBytes = 0;

  for (const file of files) {
    const no = file.slice(0, 2);
    const source = sharp(path.join(SRC, file));
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

    const dest = path.join(OUT, `${no}.webp`);
    await source.clone()
      .resize(SIZE, SIZE, { fit: 'contain', background: transparent })
      .webp({ quality: 82 })
      .toFile(dest);
    totalBytes += fs.statSync(dest).size;

    const thumbDest = path.join(THUMB_OUT, `${no}.webp`);
    await source.clone()
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'contain', background: transparent })
      .webp({ quality: 78 })
      .toFile(thumbDest);
    thumbBytes += fs.statSync(thumbDest).size;
  }

  console.log(`converted=${files.length} totalKB=${Math.round(totalBytes / 1024)} avgKB=${Math.round(totalBytes / files.length / 1024)}`);
  console.log(`thumbs=${files.length} totalKB=${Math.round(thumbBytes / 1024)} avgKB=${Math.round(thumbBytes / files.length / 1024)}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
