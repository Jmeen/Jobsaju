import { calculateSaju } from '@fullstackfamily/manseryeok';

const start = new Date('2026-08-15');
for (let i = 0; i < 12; i++) {
  const d = new Date(start);
  d.setMonth(start.getMonth() + i);
  const saju = calculateSaju(d.getFullYear(), d.getMonth() + 1, 15);
  console.log(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}: ${saju.monthPillarHanja} (${saju.monthPillar})`);
}
