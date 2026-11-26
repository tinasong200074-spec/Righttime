import { describe, expect, it } from 'vitest';
import { arrange, parkedDue, shouldSkipFront, type Booked } from './queue';
import type { Plan, Session } from './types';

const HOUR = 3_600_000;
const booked = (id: string, alarmAt: number, state: Session['state'] = 'armed'): Booked => ({
  id,
  plan: { title: id } as Plan,
  session: { state, title: id, alarmAt, arriveAt: alarmAt + 2 * HOUR } as Session,
});

describe('arrange', () => {
  it('알람이 가장 이른 약속이 맨 앞에 온다', () => {
    const r = arrange(booked('late', 9 * HOUR), [booked('early', 7 * HOUR), booked('mid', 8 * HOUR)]);
    expect(r.front?.id).toBe('early');
    expect(r.parked.map((b) => b.id)).toEqual(['mid', 'late']);
  });
  it('맨 앞이 없으면 대기 중인 것 가운데 가장 이른 것을 올린다', () => {
    const r = arrange(null, [booked('b', 9 * HOUR), booked('a', 7 * HOUR)]);
    expect(r.front?.id).toBe('a');
    expect(r.parked.map((b) => b.id)).toEqual(['b']);
  });
  it('맨 앞이 이미 진행 중이면 더 이른 약속이 있어도 바꾸지 않는다', () => {
    const r = arrange(booked('going', 9 * HOUR, 'prep'), [booked('early', 7 * HOUR)]);
    expect(r.front?.id).toBe('going');
    expect(r.parked.map((b) => b.id)).toEqual(['early']);
  });
  it('아무것도 없으면 비어 있다', () => {
    expect(arrange(null, [])).toEqual({ front: null, parked: [] });
  });
});

describe('shouldSkipFront, parkedDue', () => {
  const front = booked('front', 7 * HOUR, 'travel').session; // 도착 09시
  const next = [booked('next', 10 * HOUR)];
  it('맨 앞의 도착 시각이 지났고 다음 알람 시각이 됐을 때만 넘긴다', () => {
    expect(shouldSkipFront(front, next, 9.5 * HOUR)).toBe(false); // 다음 알람 전
    expect(shouldSkipFront(front, next, 10 * HOUR)).toBe(true);
    expect(shouldSkipFront(front, [booked('soon', 8 * HOUR)], 8.5 * HOUR)).toBe(false); // 맨 앞이 아직 도착 전
    expect(shouldSkipFront(front, [], 12 * HOUR)).toBe(false);
  });
  it('대기 중인 알람 시각이 됐는지', () => {
    expect(parkedDue(next, 9 * HOUR)).toBe(false);
    expect(parkedDue(next, 10 * HOUR)).toBe(true);
  });
});
