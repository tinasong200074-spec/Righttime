import type { Appointment, Phase } from './types';

const MS_PER_MIN = 60_000;
const SOON_MIN = 15;
const LEAVE_NOW_MIN = 5;

export function computeTimes(a: Appointment): { departAt: Date; prepStartAt: Date } {
  const appointmentMs = new Date(a.appointmentAt).getTime();
  const departMs = appointmentMs - (a.travelMin + a.bufferMin) * MS_PER_MIN;
  return {
    departAt: new Date(departMs),
    prepStartAt: new Date(departMs - a.prepMin * MS_PER_MIN),
  };
}

// 내림: 출발 직전 30초는 0분, 출발이 1초라도 지나면 -1분(늦음)으로 본다
export function minutesUntilDeparture(a: Appointment, now: Date): number {
  const { departAt } = computeTimes(a);
  return Math.floor((departAt.getTime() - now.getTime()) / MS_PER_MIN);
}

// 준비 시간이 짧아도 순서가 뒤집히지 않게 늦은 단계부터 판정한다
export function getPhase(a: Appointment, now: Date): Phase {
  const minLeft = minutesUntilDeparture(a, now);
  if (minLeft < 0) return 'late';
  if (minLeft <= LEAVE_NOW_MIN) return 'leaveNow';
  if (minLeft <= SOON_MIN) return 'soon';
  return now >= computeTimes(a).prepStartAt ? 'prepare' : 'relaxed';
}

export function getNextAppointment(list: Appointment[], now: Date): Appointment | undefined {
  return list
    .filter((a) => new Date(a.appointmentAt) >= now)
    .sort((x, y) => x.appointmentAt.localeCompare(y.appointmentAt))[0];
}
