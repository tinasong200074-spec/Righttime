import { MIN } from './types.js';

// 카카오는 "지금 출발" 기준 시간만 준다. 그래서 조회할 때마다 소요 분을 남겨 두고,
// 계획을 세울 때 출발 시각과 비슷한 시간대(같은 평일/주말, 앞뒤 1시간)에 조회했던 값을 쓴다.
// 남기는 것은 장소·시각·분 숫자뿐이고 기기에만 둔다.

export interface TransitLogEntry {
  placeId: string;
  at: number; // 조회한 시각
  rideMin: number;
}

const LOG_MAX = 120;
const WINDOW_MIN = 60;
const USE_RECENT = 5;
const DAY_MIN = 24 * 60;

export function addTransitLog(log: TransitLogEntry[], entry: TransitLogEntry): TransitLogEntry[] {
  return [...log, entry].slice(-LOG_MAX);
}

const isWeekend = (ms: number) => [0, 6].includes(new Date(ms).getDay());
const minuteOfDay = (ms: number) => new Date(ms).getHours() * 60 + new Date(ms).getMinutes();

// 자정을 넘는 경우(23:50과 00:10)도 가깝게 본다
function gapMin(a: number, b: number): number {
  const d = Math.abs(minuteOfDay(a) - minuteOfDay(b));
  return Math.min(d, DAY_MIN - d);
}

export interface PastRide {
  rideMin: number;
  n: number;
  basis: string; // "지난 평일 8시대 조회 3회 평균"
}

// 출발 예정 시각과 비슷한 시간대에 조회했던 값의 평균(올림). 없으면 null
export function similarPastRide(log: TransitLogEntry[], placeId: string, departAt: number): PastRide | null {
  const hits = log
    .filter((e) => e.placeId === placeId && e.at < departAt && isWeekend(e.at) === isWeekend(departAt) && gapMin(e.at, departAt) <= WINDOW_MIN)
    .slice(-USE_RECENT);
  if (hits.length === 0) return null;
  const mean = hits.reduce((a, e) => a + e.rideMin, 0) / hits.length;
  const dayType = isWeekend(departAt) ? '주말' : '평일';
  return {
    rideMin: Math.ceil(mean),
    n: hits.length,
    basis: `지난 ${dayType} ${new Date(departAt).getHours()}시대 조회 ${hits.length}회 평균`,
  };
}

// 출발 예정 시각을 대략 잡는다(도착 − 이동 − 여유). 비슷한 시간대를 찾는 데만 쓴다
export const roughDepartAt = (arriveAt: number, travelMin: number, buffer: number) => arriveAt - (travelMin + buffer) * MIN;

const PAD_RATE = 0.25;
const PAD_STEP = 5;

// 다른 시간대에 조회한 값밖에 없을 때는 넉넉하게 잡는다(40분 → 50분). 늦지 않는 쪽으로 틀리게 하려는 어림값이다
export const padRide = (rideMin: number) => Math.ceil((rideMin * (1 + PAD_RATE)) / PAD_STEP) * PAD_STEP;

// 이 장소의 대중교통 시간을 조회한 적이 있는지(직접 넣은 이동 시간과 구분한다)
export const hasTransitLog = (log: TransitLogEntry[], placeId: string) => log.some((e) => e.placeId === placeId);
