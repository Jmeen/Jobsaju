import React from 'react';

/** "직장 케미 92점" 처럼 %가 아닌 라벨+점수 조합으로 보여주는 칩. */
export function ChemistryScore({ label, score }) {
  return <span style={{ color: 'var(--color-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>{label} {score}점</span>;
}
