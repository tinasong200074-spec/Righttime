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

export function toRecord(s: Session, id: string, excluded: boolean): RecordRow {
  const left = s.leftAt ?? s.leaveAt;
  const arriveDiff = s.arrivedAt !== undefined ? round1((s.arrivedAt - s.arriveAt) / MIN) : undefined;
  return {
    id,
    date: s.alarmAt,
    title: s.title || '약속',
    latency: s.latency ?? 0,
    snoozeCount: s.snoozeCount,
    prepActual: round1((left - (s.prepStartAt ?? left)) / MIN),
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
