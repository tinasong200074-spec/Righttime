import { nextRepeatArrive, repeatLabel } from './repeat.js';
import { DAY, MIN, type Place, type Plan, type PlanKind, type Step } from './types.js';

// 최근 일정: 알람을 켰던 일정을 지도 앱의 검색 기록처럼 남겨 두고, 누르면 그대로 다시 채운다.
// 앱을 다시 열면 일정 입력은 비우고(진행 중인 알람이 없을 때) 이 목록에서 고르게 한다.

export interface RecentPlan {
  id: string;
  title: string;
  placeId?: string;
  placeName: string;
  rideMin: number;
  waitMin: number;
  steps: Step[];
  kind: PlanKind;
  repeatDays?: number[];
  arriveMin: number; // 도착 시각(하루 중 몇 분째). 날짜는 남기지 않는다
  usedAt: number;
}

const RECENT_MAX = 8;
const minuteOfDay = (ms: number) => new Date(ms).getHours() * 60 + new Date(ms).getMinutes();

export function toRecent(plan: Plan, placeName: string, now: number, id: string): RecentPlan {
  return {
    id,
    title: plan.title,
    placeId: plan.placeId,
    placeName,
    rideMin: plan.rideMin,
    waitMin: plan.waitMin,
    steps: plan.steps,
    kind: plan.kind,
    repeatDays: plan.repeatDays?.length ? plan.repeatDays : undefined,
    arriveMin: minuteOfDay(plan.arriveAt),
    usedAt: now,
  };
}

const sameTrip = (a: RecentPlan, b: RecentPlan) => a.title === b.title && a.placeId === b.placeId && a.arriveMin === b.arriveMin;

// 같은 일정(제목·장소·도착 시각)은 하나만 두고 맨 위로 올린다. 8개까지
export function addRecent(list: RecentPlan[], entry: RecentPlan): RecentPlan[] {
  return [entry, ...list.filter((r) => !sameTrip(r, entry))].slice(0, RECENT_MAX);
}

// 다음에 오는 그 시각(오늘 아직 안 지났으면 오늘, 지났으면 내일)
export function nextOccurrence(arriveMin: number, now: number): number {
  const d = new Date(now);
  d.setHours(Math.floor(arriveMin / 60), arriveMin % 60, 0, 0);
  return d.getTime() > now ? d.getTime() : d.getTime() + DAY;
}

// 기록을 눌렀을 때 일정에 다시 채운다. 그사이 지운 장소는 빼고, 이동 시간은 기록의 값을 쓴다
export function applyRecent(r: RecentPlan, now: number, places: Place[]): Plan {
  const placeId = places.some((p) => p.id === r.placeId) ? r.placeId : undefined;
  const base: Plan = {
    title: r.title,
    arriveAt: nextRepeatArrive(r.arriveMin, r.repeatDays ?? [], now) ?? nextOccurrence(r.arriveMin, now),
    placeId,
    rideMin: r.rideMin,
    waitMin: r.waitMin,
    steps: r.steps,
    kind: r.kind,
  };
  return r.repeatDays?.length ? { ...base, repeatDays: r.repeatDays } : base;
}

const DEFAULT_ARRIVE_MIN = 9 * 60;

// 앱을 다시 열었을 때의 빈 일정. 준비 단계는 평소 습관이라 그대로 둔다
export function freshPlan(prev: Plan, now: number): Plan {
  const d = new Date(now + DAY);
  d.setHours(0, 0, 0, 0);
  return { title: '', arriveAt: d.getTime() + DEFAULT_ARRIVE_MIN * MIN, rideMin: 30, waitMin: 5, steps: prev.steps, kind: prev.kind };
}

export function recentLabel(r: RecentPlan): { title: string; sub: string } {
  const hh = String(Math.floor(r.arriveMin / 60)).padStart(2, '0');
  const mm = String(r.arriveMin % 60).padStart(2, '0');
  const where = r.placeName || '장소 없음';
  const repeat = r.repeatDays?.length ? ` · ${repeatLabel(r.repeatDays)}` : '';
  return { title: r.title || where, sub: `${hh}:${mm} 도착 · ${r.title ? `${where} · ` : ''}이동 ${r.rideMin + r.waitMin}분${repeat}` };
}
