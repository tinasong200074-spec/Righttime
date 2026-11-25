import { judgeArrival } from './recommend';
import type { PlanCalc } from './schedule';
import { MIN, type Arrival, type GeoResult, type RecordRow, type Session, type StepLog } from './types';

const round1 = (x: number) => Math.round(x * 10) / 10;
const ARM_DELAY_MS = 2000; // 알람 시각이 이미 지났으면 잠깐 뒤에 울린다

export function createSession(c: PlanCalc, title: string, now: number, demo: boolean): Session {
  return {
    state: 'armed',
    title,
    arriveAt: c.arriveAt,
    alarmAt: Math.max(c.alarmAt, now + ARM_DELAY_MS),
    leaveAt: c.leaveAt,
    prepStartPlanAt: c.prepStartAt,
    travelMin: c.travelTotal,
    waitMin: c.waitMin,
    transitChecked: 0,
    buffer: c.buffer,
    wakeMin: c.wake.val,
    placeId: c.place?.id,
    placeName: c.place?.name ?? '',
    steps: c.steps,
    userPrep: c.userPrep,
    snoozeCount: 0,
    stepIdx: 0,
    log: [],
    checked: {},
    demo,
  };
}

// 알람·다시 울림 시각이 되면 울림 상태로 바꾼다. 바뀔 것이 없으면 같은 객체를 돌려준다
export function tickSession(s: Session, now: number): Session {
  if (s.state === 'armed' && now >= s.alarmAt) return { ...s, state: 'ringing', firstRingAt: s.alarmAt };
  if (s.state === 'snoozed' && s.nextRingAt !== undefined && now >= s.nextRingAt) return { ...s, state: 'ringing' };
  return s;
}

export function snooze(s: Session, now: number, snoozeMin: number): Session {
  return { ...s, state: 'snoozed', snoozeCount: s.snoozeCount + 1, nextRingAt: now + snoozeMin * MIN };
}

// 기상 시간 = 첫 울림 ~ 준비 시작. 미루는 동안도 포함한다
export function startPrep(s: Session, now: number): Session {
  const latency = Math.max(0, round1((now - (s.firstRingAt ?? now)) / MIN));
  return { ...s, state: 'prep', latency, prepStartAt: now, stepIdx: 0, stepStartAt: now };
}

export function completeStep(s: Session, now: number, skip = false): Session {
  const step = s.steps[s.stepIdx];
  if (s.state !== 'prep' || !step) return s;
  const entry: StepLog = skip
    ? { name: step.name, userEst: step.userEst, act: null, skipped: true }
    : { name: step.name, userEst: step.userEst, act: round1((now - (s.stepStartAt ?? now)) / MIN) };
  const stepIdx = s.stepIdx + 1;
  const done = stepIdx >= s.steps.length;
  return { ...s, log: [...s.log, entry], stepIdx, stepStartAt: now, state: done ? 'check' : 'prep' };
}

export function finishEarly(s: Session, now: number): Session {
  let next = s;
  while (next.state === 'prep') next = completeStep(next, now, true);
  return next;
}

export function depart(s: Session, now: number): Session {
  return { ...s, state: 'travel', leftAt: now };
}

export function arrive(s: Session, now: number): Session {
  return { ...s, state: 'summary', arrivedAt: now };
}

export function skipArrival(s: Session, arrival: Arrival): Session {
  return { ...s, state: 'summary', arrival };
}

export function setGeo(s: Session, geo: GeoResult): Session {
  return { ...s, geo };
}

// 명세 10장: 준비·출발 확인 중이고 출발까지 preLeave분 이하이면 붉은 조명. 늦어져도 출발할 때까지 유지
export function isGlowOn(s: Session | null, now: number, preLeave: number): boolean {
  if (!s || (s.state !== 'prep' && s.state !== 'check')) return false;
  return (s.leaveAt - now) / MIN <= preLeave;
}

const RECHECK_BEFORE_MIN = [30, 10]; // 출발 30분 전, 10분 전에 다시 확인한다

// 지금까지 했어야 할 이동 시간 재확인 횟수. 알람이 울린 뒤 한 번, 그리고 출발 30분·10분 전
export function transitChecksDue(s: Session, now: number): number {
  if (s.demo || s.state === 'armed' || s.state === 'travel' || s.state === 'summary') return s.transitChecked ?? 0;
  return 1 + RECHECK_BEFORE_MIN.filter((m) => now >= s.leaveAt - m * MIN).length;
}

// 다시 조회한 이동 시간을 반영한다. 달라졌으면 출발 시각을 옮기고 한 줄 안내를 남긴다.
// 알람은 이미 울렸으므로 당길 수 없다. rideMin이 null이면(조회 실패) 횟수만 올린다
export function applyTransitCheck(s: Session, rideMin: number | null, checked: number): Session {
  const base = { ...s, transitChecked: Math.max(s.transitChecked ?? 0, checked) };
  if (rideMin === null) return base;
  const travelMin = rideMin + (s.waitMin ?? 0);
  const diff = travelMin - s.travelMin;
  if (diff === 0) return base;
  const leaveAt = s.arriveAt - (travelMin + s.buffer) * MIN;
  const d = new Date(leaveAt);
  const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const transitNote =
    diff > 0
      ? `지금 기준으로 이동 시간이 ${diff}분 늘었어요. 출발을 ${clock}로 당겼어요.`
      : `지금 기준으로 이동 시간이 ${-diff}분 줄었어요. 출발은 ${clock}예요.`;
  return { ...base, travelMin, leaveAt, transitNote };
}

export function toRecord(s: Session, id: string, excluded: boolean): RecordRow {
  const left = s.leftAt ?? s.leaveAt;
  // 준비 시간은 마지막 단계를 끝낸 때까지다. 출발 버튼을 누르기까지 기다린 시간은 넣지 않는다
  const prepDone = s.log.length >= s.steps.length && s.stepStartAt !== undefined ? s.stepStartAt : left;
  const arriveDiff = s.arrivedAt !== undefined ? round1((s.arrivedAt - s.arriveAt) / MIN) : undefined;
  return {
    id,
    date: s.alarmAt,
    title: s.title || '약속',
    latency: s.latency ?? 0,
    snoozeCount: s.snoozeCount,
    prepActual: round1((prepDone - (s.prepStartAt ?? prepDone)) / MIN),
    userPrep: s.userPrep,
    steps: s.log,
    leaveDiff: round1((left - s.leaveAt) / MIN),
    placeId: s.placeId,
    placeName: s.placeName,
    travelActual: s.arrivedAt !== undefined ? round1((s.arrivedAt - left) / MIN) : undefined,
    arriveDiff,
    arrival: arriveDiff !== undefined ? judgeArrival(arriveDiff) : s.arrival,
    geoStatus: s.geo?.status ?? 'none',
    geoDist: s.geo?.dist, // 도착 좌표는 남기지 않고 상태와 거리만 남긴다
    demo: s.demo,
    excluded,
  };
}
