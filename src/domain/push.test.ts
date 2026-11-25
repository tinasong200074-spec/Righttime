import { describe, expect, it } from 'vitest';
import { buildPushSchedule, isPushEndpoint, pickEntry } from './push';
import { calcPlan } from './schedule';
import { createSession, depart, snooze, startPrep, tickSession } from './session';
import { DEFAULT_SETTINGS, MIN, type Plan } from './types';

const at = (h: number, m: number) => new Date(2026, 10, 26, h, m).getTime();
const plan: Plan = {
  title: 'A사 면접', arriveAt: at(9, 0), rideMin: 33, waitMin: 8, kind: 'interview',
  steps: [{ id: 's1', name: '씻기', est: 40 }],
};
const c = calcPlan(plan, DEFAULT_SETTINGS, [], [])!; // 알람 07:24, 출발 08:14
const armed = createSession(c, '', at(6, 0), false);
const times = (list: Array<{ at: number }>) => list.map((e) => e.at);

describe('buildPushSchedule', () => {
  it('알람을 켜면 기상, 출발 5분 전, 출발 세 번', () => {
    expect(times(buildPushSchedule(armed, at(6, 0), 5))).toEqual([at(7, 24), at(8, 9), at(8, 14)]);
  });
  it('미루면 다시 울릴 시각으로 바뀐다', () => {
    const s = snooze(tickSession(armed, at(7, 24)), at(7, 25), 5);
    expect(times(buildPushSchedule(s, at(7, 25), 5))[0]).toBe(at(7, 30));
  });
  it('준비를 시작하면 기상 알림은 빠지고, 출발하면 모두 빠진다', () => {
    const prep = startPrep(tickSession(armed, at(7, 24)), at(7, 30));
    expect(times(buildPushSchedule(prep, at(7, 30), 5))).toEqual([at(8, 9), at(8, 14)]);
    expect(buildPushSchedule(depart(prep, at(8, 14)), at(8, 14), 5)).toEqual([]);
  });
  it('지난 시각과 시연은 넣지 않는다', () => {
    const prep = startPrep(tickSession(armed, at(7, 24)), at(7, 30));
    expect(times(buildPushSchedule(prep, at(8, 10), 5))).toEqual([at(8, 14)]);
    expect(buildPushSchedule({ ...armed, demo: true }, at(6, 0), 5)).toEqual([]);
    expect(buildPushSchedule(null, at(6, 0), 5)).toEqual([]);
  });
});

describe('pickEntry', () => {
  const entries = buildPushSchedule(armed, at(6, 0), 5);
  it('지금과 가장 가까운 알림을 고른다(3분 이내)', () => {
    expect(pickEntry(entries, at(7, 24) + 40_000)?.title).toBe('일어날 시간이에요');
    expect(pickEntry(entries, at(8, 13))?.title).toBe('출발할 시간이에요');
    expect(pickEntry(entries, at(7, 40))).toBeNull();
    expect(pickEntry(entries, at(8, 9) + MIN)?.title).toBe('출발 5분 전이에요');
  });
});

describe('isPushEndpoint', () => {
  it('알려진 푸시 서비스 주소만 통과', () => {
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isPushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isPushEndpoint('https://evil.example.com/fcm.googleapis.com')).toBe(false);
    expect(isPushEndpoint('https://fcm.googleapis.com.evil.com/x')).toBe(false);
    expect(isPushEndpoint('아무 글')).toBe(false);
  });
});
