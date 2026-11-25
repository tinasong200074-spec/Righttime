import type { Arrival, RecordRow } from './types';

const RECENT_COUNT = 5;
const MIX_BELOW = 3; // 기록이 이보다 적으면 입력값과 섞는다

export interface Rec {
  val: number;
  n: number;
  basis: string;
}

// 명세 9.3. "평균 + 변동의 절반"은 검증되지 않은 임의 규칙이라 한 곳에 모아 둔다
export function rec(userVal: number, all: number[]): Rec {
  const arr = all.slice(-RECENT_COUNT);
  const n = arr.length;
  if (n === 0) return { val: userVal, n, basis: '내 입력값' };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  if (n < MIX_BELOW) {
    const w = n / MIX_BELOW;
    return { val: Math.ceil(userVal * (1 - w) + mean * w), n, basis: `기록 ${n}회와 입력값을 섞은 값` };
  }
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)); // 표본 표준편차
  return { val: Math.ceil(mean + 0.5 * sd), n, basis: `최근 ${n}회 평균 + 변동 반영` };
}

export function usable(r: RecordRow): boolean {
  return !r.demo && !r.excluded;
}

type NumericKey = 'latency' | 'prepActual' | 'travelActual' | 'leaveDiff';

export function recentValues(records: RecordRow[], key: NumericKey, placeId?: string): number[] {
  return records
    .filter((r) => usable(r) && (placeId === undefined || r.placeId === placeId))
    .map((r) => r[key])
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

export function average(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

const LATE_OVER_MIN = 0.5;
const EARLY_UNDER_MIN = -5;

export function judgeArrival(arriveDiffMin: number): Arrival {
  if (arriveDiffMin > LATE_OVER_MIN) return 'late';
  if (arriveDiffMin < EARLY_UNDER_MIN) return 'early';
  return 'ontime';
}
