import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReportRetention,
  getReportExpirationDate,
  isReportExpired,
  resolveReportRetention,
} from './reportRetention.js';

test('리포트 삭제일은 결제 시각에서 달력 기준 6개월이 지난 다음 날이다', () => {
  assert.equal(
    getReportExpirationDate('2026-09-16T03:20:00.000Z').toISOString(),
    '2027-03-17T03:20:00.000Z',
  );
});

test('월말 결제는 대상 월의 마지막 날로 보정한 뒤 다음 날 삭제한다', () => {
  assert.equal(
    getReportExpirationDate('2026-08-31T12:00:00.000Z').toISOString(),
    '2027-03-01T12:00:00.000Z',
  );
});

test('한국 시간 자정 부근의 월말 결제도 서울 달력 기준으로 계산한다', () => {
  // 2026-08-31 00:30 KST 결제 → 2027-02-28 00:30 KST까지 6개월 → 다음 날 삭제
  assert.equal(
    getReportExpirationDate('2026-08-30T15:30:00.000Z').toISOString(),
    '2027-02-28T15:30:00.000Z',
  );
});

test('토큰에 기록된 결제일과 만료일을 이후 저장에서도 그대로 사용한다', async () => {
  const kv = {
    async get() {
      return JSON.stringify({
        createdAt: '2026-09-16T03:20:00.000Z',
        expiresAt: '2027-03-17T03:20:00.000Z',
      });
    },
  };
  const retention = await resolveReportRetention(kv, 'token-123');
  assert.deepEqual(retention, buildReportRetention(
    '2026-09-16T03:20:00.000Z',
    '2027-03-17T03:20:00.000Z',
  ));
  assert.equal(isReportExpired(retention, '2027-03-17T03:20:00.000Z'), true);
});
