import type { EscalationLevel } from './types';

// 출발 30·15·5·0분 전에 1·2·3·4단계로 올라간다
const THRESHOLDS: Array<[number, EscalationLevel]> = [
  [0, 4],
  [5, 3],
  [15, 2],
  [30, 1],
];

export function getEscalationLevel(minLeft: number): EscalationLevel {
  const hit = THRESHOLDS.find(([limit]) => minLeft <= limit);
  return hit ? hit[1] : 0;
}
