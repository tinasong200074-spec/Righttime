import { describe, expect, it } from 'vitest';
import { calcPlan } from './schedule';
import { arrive, completeStep, createSession, depart, snooze, startPrep, tickSession } from './session';
import { buildShareStatus, isStale, randomToken, shareExpiresAt, stageOf } from './share';
import { DEFAULT_SETTINGS, MIN, type Plan } from './types';

const at = (h: number, m: number) => new Date(2026, 10, 26, h, m).getTime();
const plan: Plan = {
  title: 'A사 면접', arriveAt: at(9, 0), rideMin: 33, waitMin: 8, kind: 'interview',
  steps: [{ id: 's1', name: '씻기', est: 20 }, { id: 's2', name: '옷 입기', est: 20 }],
};
const c = calcPlan(plan, DEFAULT_SETTINGS, [], [])!; // 알람 07:24, 준비 07:34, 출발 08:14
const ringing = tickSession(createSession(c, plan.title, at(6, 0), false), at(7, 24));
const opts = { name: '지민', showStage: true, showEta: true };

describe('stageOf', () => {
  it('미루는 중이어도 "일어남"까지만 보인다', () => {
    expect(stageOf(ringing)).toBe('woke');
    expect(stageOf(snooze(ringing, at(7, 25), 5))).toBe('woke');
  });
  it('진행에 따라 단계가 바뀐다', () => {
    const prep = startPrep(ringing, at(7, 34));
    expect(stageOf(prep)).toBe('prep');
    const check = completeStep(completeStep(prep, at(7, 54)), at(8, 14));
    expect(stageOf(check)).toBe('depart');
    expect(stageOf(depart(check, at(8, 14)))).toBe('travel');
    expect(stageOf(arrive(depart(check, at(8, 14)), at(8, 58)))).toBe('arrived');
  });
});

describe('buildShareStatus (명세 15-8)', () => {
  it('위치·미루기·기록 필드를 올리지 않는다', () => {
    const s = snooze({ ...ringing, geo: { status: 'match', dist: 20 } }, at(7, 25), 5);
    const st = buildShareStatus(s, at(7, 26), opts);
    expect(Object.keys(st).sort()).toEqual(['arriveMs', 'etaMs', 'lateMin', 'name', 'stage', 'stepCount', 'stepIdx']);
    expect(JSON.stringify(st)).not.toMatch(/snooze|geo|"lat"|"lon"|latency|dist|씻기/);
  });
  it('제때 가는 중이면 늦는 분이 없고 도착 예정은 5분 단위로 올린다', () => {
    const prep = startPrep(ringing, at(7, 34));
    const st = buildShareStatus(prep, at(7, 34), opts);
    expect(st).toMatchObject({ stage: 'prep', stepIdx: 0, stepCount: 2, lateMin: null });
    expect(st.etaMs).toBe(at(8, 55)); // 07:34 + 준비 40 + 이동 41
  });
  it('늦어지면 늦는 분을 5분 단위로 알린다', () => {
    const prep = startPrep(ringing, at(7, 46)); // 12분 늦게 시작 → 도착 09:07
    const st = buildShareStatus(prep, at(7, 46), opts);
    expect(st.lateMin).toBe(10);
    expect(st.etaMs).toBe(at(9, 10));
  });
  it('스위치를 끄면 해당 값은 올라가지 않는다', () => {
    const prep = startPrep(ringing, at(7, 46));
    expect(buildShareStatus(prep, at(7, 46), { ...opts, showStage: false })).toMatchObject({ stage: null, stepIdx: null, stepCount: null });
    expect(buildShareStatus(prep, at(7, 46), { ...opts, showEta: false })).toMatchObject({ etaMs: null, lateMin: null });
  });
  it('이름이 비어 있으면 "친구"', () => {
    expect(buildShareStatus(ringing, at(7, 25), { ...opts, name: '  ' }).name).toBe('친구');
  });
});

describe('isStale, shareExpiresAt, randomToken', () => {
  it('15분 넘게 갱신이 없으면 확인 안 됨', () => {
    expect(isStale(at(8, 0), at(8, 15))).toBe(false);
    expect(isStale(at(8, 0), at(8, 16))).toBe(true);
  });
  it('약속 한 시간 뒤에 닫힌다', () => expect(shareExpiresAt(at(9, 0))).toBe(at(9, 0) + 60 * MIN));
  it('16바이트는 32자 16진수', () => {
    expect(randomToken(new Uint8Array([0, 15, 255, 16, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toBe('000fff100102030405060708090a0b0c');
  });
});
