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
const EXPECTED = 60;
const SIZE = 640; // 기존 public/creatures와 같은 규격

async function main() {
  const files = fs.readdirSync(SRC).filter(name => /^\d{2}_.*\.png$/.test(name)).sort();
  if (files.length !== EXPECTED) {
    throw new Error(`원본 ${EXPECTED}장을 기대했지만 ${files.length}장을 찾았습니다.`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  let totalBytes = 0;

  for (const file of files) {
    const no = file.slice(0, 2);
    const dest = path.join(OUT, `${no}.webp`);
    await sharp(path.join(SRC, file))
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 82 })
      .toFile(dest);
    totalBytes += fs.statSync(dest).size;
  }

  console.log(`converted=${files.length} totalKB=${Math.round(totalBytes / 1024)} avgKB=${Math.round(totalBytes / files.length / 1024)}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
