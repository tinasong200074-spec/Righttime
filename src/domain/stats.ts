import { SEVERE_LATE_MIN, type ArrivalRecord } from './types';

const MS_PER_DAY = 86_400_000;

// 약속 시각 기준으로 최근 sinceDays일만 센다(없으면 전체)
export function countSevereLate(records: ArrivalRecord[], now: Date, sinceDays?: number): number {
  const from = sinceDays === undefined ? -Infinity : now.getTime() - sinceDays * MS_PER_DAY;
  return records.filter(
    (r) => r.lateMin >= SEVERE_LATE_MIN && new Date(r.appointmentAt).getTime() >= from,
  ).length;
}
