import { rec, recentValues, type Rec } from './recommend';
import { hasTransitLog, padRide, roughDepartAt, similarPastRide, type TransitLogEntry } from './transitLog';
import { DAY, MIN, type Place, type Plan, type RecordRow, type SessionStep, type Settings, type Step } from './types';

export interface ScheduleInput {
  arriveAt: number;
  rideMin: number;
  waitMin: number;
  buffer: number;
  prepMin: number;
  latency: number;
}

export interface Schedule {
  leaveAt: number;
  prepStartAt: number;
  alarmAt: number;
  travelTotal: number;
}

// 명세 9.1: 도착 시각에서 거꾸로 출발 → 준비 시작 → 알람을 정한다
export function computeSchedule(i: ScheduleInput): Schedule {
  const travelTotal = i.rideMin + i.waitMin;
  const leaveAt = i.arriveAt - (travelTotal + i.buffer) * MIN;
  const prepStartAt = leaveAt - i.prepMin * MIN;
  return { leaveAt, prepStartAt, alarmAt: prepStartAt - i.latency * MIN, travelTotal };
}

const round1 = (x: number) => Math.round(x * 10) / 10;

// 추천으로 총 준비 시간이 달라지면 단계별 시간은 입력 비율대로 나눈다
export function scaleSteps(steps: Step[], prepRec: number): SessionStep[] {
  const userTotal = steps.reduce((a, s) => a + s.est, 0) || 1;
  return steps.map((s) => ({ ...s, userEst: s.est, est: round1((s.est * prepRec) / userTotal) }));
}

export function rollForward(arriveAt: number, now: number): number {
  if (arriveAt >= now) return arriveAt;
  return arriveAt + Math.ceil((now - arriveAt) / DAY) * DAY;
}

export interface PlanCalc extends Schedule {
  arriveAt: number;
  steps: SessionStep[];
  userPrep: number;
  prep: Rec; // 준비 총시간 추천
  wake: Rec; // 기상 시간 추천
  ride: Rec; // 이동 시간 추천
  waitMin: number;
  buffer: number;
  place?: Place;
}

// 장소의 이동 시간: 비슷한 시간대에 조회했던 값이 있으면 그것을, 없으면 저장된 값을 바탕으로 삼고
// 실제로 걸린 기록이 있으면 그 기록으로 추천한다
function rideFor(place: Place, plan: Plan, settings: Settings, records: RecordRow[], log: TransitLogEntry[]): Rec {
  const past = similarPastRide(log, place.id, roughDepartAt(plan.arriveAt, place.travelMin + plan.waitMin, settings.buffer));
  const actual = recentValues(records, 'travelActual', place.id);
  if (past && actual.length === 0) return { val: past.rideMin, n: past.n, basis: past.basis };
  // 처음 가는 곳: 다른 시간대에 조회한 값뿐이면 넉넉하게 잡는다. 한 번 다녀오면 실제 기록으로 바뀐다
  if (!past && actual.length === 0 && hasTransitLog(log, place.id)) {
    return { val: padRide(place.travelMin), n: 0, basis: `조회 ${place.travelMin}분에 여유를 더한 값` };
  }
  return rec(past?.rideMin ?? place.travelMin, actual);
}

// 계획 + 기록 → 화면에 보여 줄 전체 계산
export function calcPlan(
  plan: Plan,
  settings: Settings,
  records: RecordRow[],
  places: Place[],
  transitLog: TransitLogEntry[] = [],
): PlanCalc | null {
  if (!plan.arriveAt || plan.steps.length === 0) return null;
  const userPrep = plan.steps.reduce((a, s) => a + s.est, 0) || 1;
  const prep = rec(userPrep, recentValues(records, 'prepActual'));
  const wake = rec(settings.latency, recentValues(records, 'latency'));
  const place = places.find((p) => p.id === plan.placeId);
  const ride = place ? rideFor(place, plan, settings, records, transitLog) : { val: plan.rideMin, n: 0, basis: '내 입력값' };
  const schedule = computeSchedule({
    arriveAt: plan.arriveAt,
    rideMin: ride.val,
    waitMin: plan.waitMin,
    buffer: settings.buffer,
    prepMin: prep.val,
    latency: wake.val,
  });
  return {
    ...schedule,
    arriveAt: plan.arriveAt,
    steps: scaleSteps(plan.steps, prep.val),
    userPrep,
    prep,
    wake,
    ride,
    waitMin: plan.waitMin,
    buffer: settings.buffer,
    place,
  };
}

// 지금 바로 준비를 시작해도 도착 시각을 몇 분 넘기는지(준비 + 이동 기준). 0 이하면 맞출 수 있다
export function overBy(c: Pick<PlanCalc, 'arriveAt' | 'prep' | 'ride' | 'waitMin'>, now: number): number {
  return Math.ceil((now + (c.prep.val + c.ride.val + c.waitMin) * MIN - c.arriveAt) / MIN);
}
