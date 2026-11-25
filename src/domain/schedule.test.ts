import { describe, expect, it } from 'vitest';
import {
  computeTimes,
  getNextAppointment,
  getPhase,
  minutesUntilDeparture,
} from './schedule';
import type { Appointment } from './types';

const make = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'a1',
  title: '친구 저녁',
  appointmentAt: '2026-11-26T09:00:00Z',
  travelMin: 40,
  prepMin: 30,
  bufferMin: 10,
  ...overrides,
});

const at = (hhmm: string) => new Date(`2026-11-26T${hhmm}:00Z`);

describe('computeTimes (R01)', () => {
  it('약속 09:00, 이동 40분, 여유 10분이면 출발 08:10, 준비 시작 07:40', () => {
    const { departAt, prepStartAt } = computeTimes(make());
    expect(departAt.toISOString()).toBe('2026-11-26T08:10:00.000Z');
    expect(prepStartAt.toISOString()).toBe('2026-11-26T07:40:00.000Z');
  });
});

describe('minutesUntilDeparture', () => {
  it('출발 10분 전이면 10', () => {
    expect(minutesUntilDeparture(make(), at('08:00'))).toBe(10);
  });
  it('출발이 지나면 음수', () => {
    expect(minutesUntilDeparture(make(), at('08:15'))).toBe(-5);
  });
  it('출발 30초 전은 0으로 내림', () => {
    const now = new Date('2026-11-26T08:09:30Z');
    expect(minutesUntilDeparture(make(), now)).toBe(0);
  });
});

describe('getPhase', () => {
  const cases: Array<[string, string]> = [
    ['07:00', 'relaxed'], // 준비 시작(07:40) 전
    ['07:40', 'prepare'],
    ['07:54', 'prepare'], // 남은 16분
    ['07:55', 'soon'], // 남은 15분
    ['08:04', 'soon'], // 남은 6분
    ['08:05', 'leaveNow'], // 남은 5분
    ['08:10', 'leaveNow'], // 남은 0분
    ['08:11', 'late'],
  ];
  it.each(cases)('%s → %s', (time, phase) => {
    expect(getPhase(make(), at(time))).toBe(phase);
  });

  it('준비 시간이 짧아도 단계 순서가 뒤집히지 않는다', () => {
    const a = make({ prepMin: 5 }); // 준비 시작 08:05
    expect(getPhase(a, at('07:50'))).toBe('relaxed');
    expect(getPhase(a, at('07:56'))).toBe('soon');
  });
});

describe('getNextAppointment', () => {
  const early = make({ id: 'early', appointmentAt: '2026-11-26T09:00:00Z' });
  const late = make({ id: 'late', appointmentAt: '2026-11-26T12:00:00Z' });
  const past = make({ id: 'past', appointmentAt: '2026-11-25T09:00:00Z' });

  it('아직 안 지난 약속 중 가장 빠른 것을 고른다', () => {
    expect(getNextAppointment([late, past, early], at('08:00'))?.id).toBe('early');
  });
  it('남은 약속이 없으면 undefined', () => {
    expect(getNextAppointment([past], at('08:00'))).toBeUndefined();
  });
});
