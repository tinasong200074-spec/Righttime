import { describe, expect, it } from 'vitest';
import { calcPlan } from './schedule';
import { addTransitLog, padRide, similarPastRide, type TransitLogEntry } from './transitLog';
import { DEFAULT_SETTINGS, type Place, type Plan, type RecordRow } from './types';

// 2026-11-26은 목요일, 11-28은 토요일
const day = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime();
const log: TransitLogEntry[] = [
  { placeId: 'p1', at: day(23, 8, 10), rideMin: 41 }, // 월 아침
  { placeId: 'p1', at: day(24, 8, 40), rideMin: 44 }, // 화 아침
  { placeId: 'p1', at: day(24, 22, 0), rideMin: 30 }, // 화 밤
  { placeId: 'p1', at: day(21, 8, 20), rideMin: 28 }, // 토 아침
  { placeId: 'p2', at: day(24, 8, 20), rideMin: 99 }, // 다른 장소
];

describe('similarPastRide', () => {
  it('같은 평일, 앞뒤 1시간 안의 값만 평균한다(올림)', () => {
    expect(similarPastRide(log, 'p1', day(26, 8, 15))).toEqual({ rideMin: 43, n: 2, basis: '지난 평일 8시대 조회 2회 평균' });
  });
  it('주말은 주말 값만 쓴다', () => {
    expect(similarPastRide(log, 'p1', day(28, 8, 15))?.rideMin).toBe(28);
  });
  it('비슷한 시간대 값이 없으면 null', () => {
    expect(similarPastRide(log, 'p1', day(26, 14, 0))).toBeNull();
    expect(similarPastRide(log, 'p3', day(26, 8, 15))).toBeNull();
  });
  it('앞으로의 값(조회 시각이 출발보다 뒤)은 쓰지 않는다', () => {
    expect(similarPastRide([{ placeId: 'p1', at: day(27, 8, 0), rideMin: 50 }], 'p1', day(26, 8, 15))).toBeNull();
  });
});

describe('addTransitLog', () => {
  it('오래된 것부터 버리고 120개까지만 둔다', () => {
    let l: TransitLogEntry[] = [];
    for (let i = 0; i < 130; i++) l = addTransitLog(l, { placeId: 'p1', at: i, rideMin: i });
    expect(l).toHaveLength(120);
    expect(l[0].rideMin).toBe(10);
  });
});

describe('calcPlan + 조회 기록', () => {
  const place: Place = { id: 'p1', name: 'A사', travelMin: 30 }; // 밤에 조회해 저장한 값
  const plan: Plan = {
    title: '', arriveAt: day(26, 9, 0), placeId: 'p1', rideMin: 30, waitMin: 5, kind: 'interview',
    steps: [{ id: 's', name: '씻기', est: 40 }],
  };
  it('비슷한 시간대 값이 있으면 저장된 값 대신 쓴다', () => {
    const c = calcPlan(plan, DEFAULT_SETTINGS, [], [place], log)!;
    expect(c.ride.val).toBe(43);
    expect(c.ride.basis).toBe('지난 평일 8시대 조회 2회 평균');
  });
  it('조회한 적이 없으면(직접 넣은 값) 저장된 값을 그대로 쓴다', () => {
    expect(calcPlan(plan, DEFAULT_SETTINGS, [], [place], [])!.ride.val).toBe(30);
  });
  it('다른 시간대에 조회한 값뿐이면 넉넉하게 잡고 근거를 적는다', () => {
    const nightOnly = [{ placeId: 'p1', at: day(24, 22, 0), rideMin: 30 }];
    const c = calcPlan(plan, DEFAULT_SETTINGS, [], [place], nightOnly)!;
    expect(c.ride.val).toBe(40);
    expect(c.ride.basis).toBe('조회 30분에 여유를 더한 값');
  });
  it('실제로 다녀온 기록이 있으면 여유를 더하지 않고 기록으로 추천한다', () => {
    const nightOnly = [{ placeId: 'p1', at: day(24, 22, 0), rideMin: 30 }];
    const rows = [36, 38, 37].map((m, i) => ({ id: `r${i}`, placeId: 'p1', travelActual: m, demo: false, excluded: false }) as RecordRow);
    const c = calcPlan(plan, DEFAULT_SETTINGS, rows, [place], nightOnly)!;
    expect(c.ride.basis).toBe('최근 3회 평균 + 변동 반영');
    expect(c.ride.val).toBe(38);
  });
});

describe('padRide', () => {
  it('4분의 1을 더하고 5분 단위로 올린다', () => {
    expect(padRide(40)).toBe(50);
    expect(padRide(30)).toBe(40);
    expect(padRide(20)).toBe(25);
    expect(padRide(12)).toBe(15);
  });
});
