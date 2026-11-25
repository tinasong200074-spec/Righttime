// 기록 화면에 보여 줄 값 모으기. 추천·역산은 domain 함수를 쓴다.
import { computeSchedule, type PlanCalc } from '../../domain/schedule';
import { average, recentValues, usable } from '../../domain/recommend';
import { MIN, type Place, type Plan, type RecordRow, type Settings } from '../../domain/types';

const CHART_DAYS = 7;

export interface AlarmCompare {
  before: number; // 입력값만으로 계산한 알람
  after: number; // 기록을 반영한 알람
  diffMin: number; // 양수면 앞당겨짐
}

export function alarmCompare(calc: PlanCalc, plan: Plan, settings: Settings): AlarmCompare {
  const before = computeSchedule({
    arriveAt: calc.arriveAt,
    rideMin: calc.place?.travelMin ?? plan.rideMin,
    waitMin: calc.waitMin,
    buffer: calc.buffer,
    prepMin: calc.userPrep,
    latency: settings.latency,
  }).alarmAt;
  return { before, after: calc.alarmAt, diffMin: Math.round((before - calc.alarmAt) / MIN) };
}

const avgOrNull = (a: number[]) => (a.length ? average(a) : null);

export function averages(records: RecordRow[]) {
  return {
    count: records.filter(usable).length,
    wake: avgOrNull(recentValues(records, 'latency')),
    prep: avgOrNull(recentValues(records, 'prepActual')),
    leave: avgOrNull(recentValues(records, 'leaveDiff')),
  };
}

export const lastDays = (records: RecordRow[]) => records.filter(usable).slice(-CHART_DAYS);

export interface PlaceStat {
  id: string;
  name: string;
  count: number;
  actual: number;
  input?: number;
}

export function placeStats(records: RecordRow[], places: Place[]): PlaceStat[] {
  const ids = [...new Set(records.filter(usable).map((r) => r.placeId).filter((id): id is string => !!id))];
  return ids
    .map((id) => {
      const vals = recentValues(records, 'travelActual', id);
      const place = places.find((p) => p.id === id);
      const name = place?.name ?? records.find((r) => r.placeId === id)?.placeName ?? '장소';
      return { id, name, count: vals.length, actual: average(vals), input: place?.travelMin };
    })
    .filter((p) => p.count > 0);
}

export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
