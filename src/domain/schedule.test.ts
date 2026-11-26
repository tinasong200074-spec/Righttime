import { describe, expect, it } from 'vitest';
import { fmtClock } from './format';
import { judgeArrival, rec } from './recommend';
import { calcPlan, computeSchedule, rollForward, scaleSteps, overBy } from './schedule';
import { applyTransitCheck, arrive, completeStep, createSession, depart, isGlowOn, snooze, startPrep, tickSession, toRecord, transitChecksDue } from './session';
import { DAY, DEFAULT_SETTINGS, MIN, type Plan, type RecordRow } from './types';

// 기대 시각은 여유 5분 기준으로 적었다. 기본값이 바뀌어도 흔들리지 않게 고정한다
const SETTINGS = { ...DEFAULT_SETTINGS, buffer: 5 };

const at = (h: number, m: number) => new Date(2026, 10, 26, h, m).getTime();

describe('computeSchedule (명세 15-1)', () => {
  it('도착 09:00, 이동 33, 대기 8, 여유 5, 준비 60, 기상 14 → 출발 08:14, 준비 07:14, 알람 07:00', () => {
    const s = computeSchedule({ arriveAt: at(9, 0), rideMin: 33, waitMin: 8, buffer: 5, prepMin: 60, latency: 14 });
    expect(fmtClock(s.leaveAt)).toBe('08:14');
    expect(fmtClock(s.prepStartAt)).toBe('07:14');
    expect(fmtClock(s.alarmAt)).toBe('07:00');
    expect(s.travelTotal).toBe(41);
  });
});

describe('rec (명세 15-2)', () => {
  it('기록이 없으면 입력값', () => expect(rec(40, []).val).toBe(40));
  it('1~2회는 입력값과 섞는다', () => {
    expect(rec(40, [70]).val).toBe(50); // 40·(2/3) + 70·(1/3)
    expect(rec(40, [70, 70]).val).toBe(60);
  });
  it('3회 이상은 최근 5회 평균 + 표본 표준편차의 절반', () => {
    expect(rec(40, [58, 52, 61, 55, 49, 63, 57]).val).toBe(60);
    expect(rec(10, [12, 8, 15, 5, 10, 18, 9]).val).toBe(14);
    expect(rec(30, [34, 38, 31, 41, 33, 45, 36]).val).toBe(41);
  });
});

describe('judgeArrival (명세 15-3)', () => {
  it.each([
    [0.4, 'ontime'],
    [0.6, 'late'],
    [-5.1, 'early'],
    [-5, 'ontime'],
  ])('%f분 → %s', (diff, expected) => expect(judgeArrival(diff)).toBe(expected));
});

describe('scaleSteps, rollForward', () => {
  it('추천 총시간에 맞춰 비율대로 나눈다', () => {
    const steps = scaleSteps(
      [
        { id: 'a', name: '씻기', est: 30 },
        { id: 'b', name: '옷', est: 10 },
      ],
      60,
    );
    expect(steps.map((s) => s.est)).toEqual([45, 15]);
    expect(steps.map((s) => s.userEst)).toEqual([30, 10]);
  });
  it('지난 일정은 하루 단위로 앞으로 옮긴다', () => {
    expect(rollForward(at(9, 0), at(8, 0))).toBe(at(9, 0));
    expect(rollForward(at(9, 0), at(10, 0))).toBe(at(9, 0) + DAY);
    expect(rollForward(at(9, 0), at(10, 0) + 3 * DAY)).toBe(at(9, 0) + 4 * DAY);
  });
});

const plan: Plan = {
  title: 'A사 면접',
  arriveAt: at(9, 0),
  rideMin: 33,
  waitMin: 8,
  kind: 'interview',
  steps: [
    { id: 's1', name: '씻기', est: 20 },
    { id: 's2', name: '옷 입기', est: 20 },
  ],
};

describe('calcPlan', () => {
  it('기록이 없으면 입력값 그대로 계산한다', () => {
    const c = calcPlan(plan, SETTINGS, [], [])!;
    expect(fmtClock(c.leaveAt)).toBe('08:14');
    expect(fmtClock(c.prepStartAt)).toBe('07:34');
    expect(fmtClock(c.alarmAt)).toBe('07:24');
  });
  it('시연·제외 기록은 추천에 쓰지 않는다', () => {
    const row = (over: Partial<RecordRow>): RecordRow => ({
      id: 'r', date: 0, title: '', latency: 30, snoozeCount: 0, prepActual: 90, userPrep: 40,
      steps: [], leaveDiff: 0, demo: false, excluded: false, ...over,
    });
    const c = calcPlan(plan, SETTINGS, [row({ demo: true }), row({ excluded: true })], [])!;
    expect(c.prep.val).toBe(40);
    expect(c.wake.val).toBe(10);
  });
  it('단계가 없으면 null', () => expect(calcPlan({ ...plan, steps: [] }, SETTINGS, [], [])).toBeNull());
});

describe('세션 흐름', () => {
  const c = calcPlan(plan, SETTINGS, [], [])!;
  const armed = createSession(c, plan.title, at(6, 0), false);

  it('알람 시각이 되면 울리고, 미루면 다시 울린다', () => {
    expect(tickSession(armed, at(7, 23))).toBe(armed);
    const ringing = tickSession(armed, at(7, 24));
    expect(ringing.state).toBe('ringing');
    const snoozed = snooze(ringing, at(7, 25), 5);
    expect(tickSession(snoozed, at(7, 29)).state).toBe('snoozed');
    expect(tickSession(snoozed, at(7, 30)).state).toBe('ringing');
  });

  it('기상 시간은 첫 울림부터 준비 시작까지(미룬 시간 포함)', () => {
    const ringing = tickSession(armed, at(7, 24));
    const prep = startPrep(snooze(ringing, at(7, 25), 5), at(7, 36));
    expect(prep.latency).toBe(12);
  });

  it('끝까지 진행하면 기록이 만들어진다', () => {
    let s = startPrep(tickSession(armed, at(7, 24)), at(7, 30));
    s = completeStep(s, at(7, 55));
    expect(s.state).toBe('prep');
    s = completeStep(s, at(8, 20));
    expect(s.state).toBe('check');
    s = arrive(depart(s, at(8, 20)), at(9, 4));
    const r = toRecord(s, 'id1', false);
    expect(r.prepActual).toBe(50);
    expect(r.leaveDiff).toBe(6);
    expect(r.travelActual).toBe(44);
    expect(r.arrival).toBe('late');
    expect(r.steps.map((x) => x.act)).toEqual([25, 25]);
    expect(JSON.stringify(r)).not.toMatch(/"lat"|"lon"/); // 도착 좌표를 남기지 않는다
  });
});

describe('toRecord: 준비 시간', () => {
  it('마지막 단계를 끝낸 뒤 출발까지 기다린 시간은 준비 시간에 넣지 않는다', () => {
    const c = calcPlan(plan, SETTINGS, [], [])!;
    let s = startPrep(tickSession(createSession(c, '', at(6, 0), false), at(7, 24)), at(7, 30));
    s = completeStep(completeStep(s, at(7, 50)), at(8, 5)); // 준비 35분
    const r = toRecord(depart(s, at(8, 14)), 'id', false); // 9분 기다렸다가 출발
    expect(r.prepActual).toBe(35);
    expect(r.leaveDiff).toBe(0);
  });
});

describe('isGlowOn (명세 15-7)', () => {
  const c = calcPlan(plan, SETTINGS, [], [])!;
  const prep = startPrep(tickSession(createSession(c, '', at(6, 0), false), at(7, 24)), at(7, 30));
  it('출발 5분 전부터 켜지고 늦어져도 유지', () => {
    expect(isGlowOn(prep, c.leaveAt - 6 * MIN, 5)).toBe(false);
    expect(isGlowOn(prep, c.leaveAt - 5 * MIN, 5)).toBe(true);
    expect(isGlowOn(prep, c.leaveAt + 10 * MIN, 5)).toBe(true);
  });
  it('출발하면 꺼진다', () => {
    expect(isGlowOn(depart(prep, c.leaveAt), c.leaveAt, 5)).toBe(false);
    expect(isGlowOn(null, c.leaveAt, 5)).toBe(false);
  });
});

describe('이동 시간 재확인', () => {
  const c = calcPlan(plan, SETTINGS, [], [])!; // 이동 33 + 대기 8, 출발 08:14
  const armed = createSession(c, '', at(6, 0), false);
  const prep = startPrep(tickSession(armed, at(7, 24)), at(7, 30));
  it('알람 전에는 확인하지 않고, 울린 뒤 1번, 출발 30분·10분 전에 1번씩', () => {
    expect(transitChecksDue(armed, at(7, 0))).toBe(0);
    expect(transitChecksDue(prep, at(7, 30))).toBe(1);
    expect(transitChecksDue(prep, at(7, 44))).toBe(2);
    expect(transitChecksDue(prep, at(8, 4))).toBe(3);
    expect(transitChecksDue(depart(prep, at(8, 14)), at(8, 20))).toBe(0);
  });
  it('이동 시간이 늘면 출발을 당기고 안내를 남긴다', () => {
    const s = applyTransitCheck(prep, 38, 1); // 33 → 38분
    expect(s.travelMin).toBe(46);
    expect(fmtClock(s.leaveAt)).toBe('08:09');
    expect(s.transitNote).toBe('지금 기준으로 이동 시간이 5분 늘었어요. 출발을 08:09로 당겼어요.');
    expect(s.transitChecked).toBe(1);
  });
  it('같으면 그대로, 조회에 실패해도 횟수만 올린다', () => {
    expect(applyTransitCheck(prep, 33, 1).leaveAt).toBe(prep.leaveAt);
    expect(applyTransitCheck(prep, 33, 1).transitNote).toBeUndefined();
    const failed = applyTransitCheck(prep, null, 2);
    expect(failed.transitChecked).toBe(2);
    expect(failed.leaveAt).toBe(prep.leaveAt);
  });
});

describe('overBy', () => {
  const t0 = new Date(2026, 10, 27, 8, 0).getTime();
  const c = (arriveMin: number) => ({ arriveAt: t0 + arriveMin * 60_000, prep: { val: 40, n: 0, basis: '' }, ride: { val: 30, n: 0, basis: '' }, waitMin: 0 });
  it('준비와 이동을 더해 도착 시각을 넘기면 넘는 분을 돌려준다', () => {
    expect(overBy(c(60), t0)).toBe(10); // 70분이 필요한데 60분 남음
    expect(overBy(c(70), t0)).toBe(0); // 딱 맞음
    expect(overBy(c(120), t0)).toBeLessThan(0); // 여유 있음
  });
});
