import { describe, expect, it } from 'vitest';
import { applyRecentState, armState, defaultState, restoreState, saveRecordState, type AppState } from './state';

const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime();
const now = at(26, 20, 0);

function planned(): AppState {
  const s = defaultState(now);
  return {
    ...s,
    places: [{ id: 'p1', name: 'A사', travelMin: 33, geo: { lat: 37.5, lon: 127, r: 150 } }],
    plan: { ...s.plan, title: 'A사 면접', arriveAt: at(27, 10, 0), placeId: 'p1', rideMin: 33, waitMin: 8 },
    rain: 'yes',
    weatherCoord: { lat: 37.5, lon: 127 },
  };
}

// 저장했다가 다시 여는 것을 흉내 낸다
const reopen = (s: AppState, t: number) => restoreState(JSON.parse(JSON.stringify(s)), t);

describe('앱을 다시 열었을 때', () => {
  it('진행 중인 알람이 없으면 일정·장소·날씨 선택을 비운다', () => {
    const s = reopen(planned(), now + 60_000);
    expect(s.plan.title).toBe('');
    expect(s.plan.placeId).toBeUndefined();
    expect(s.plan.arriveAt).toBe(at(27, 9, 0));
    expect(s.rain).toBe('auto');
    expect(s.weatherCoord).toBeNull();
  });
  it('준비 단계와 저장한 장소 목록은 그대로 둔다', () => {
    const before = planned();
    const s = reopen(before, now + 60_000);
    expect(s.plan.steps).toEqual(before.plan.steps);
    expect(s.places).toHaveLength(1);
  });
  it('알람이 진행 중이면 일정을 그대로 둔다', () => {
    const armed = armState(planned(), now, false);
    const s = reopen(armed, now + 60_000);
    expect(s.session?.state).toBe('armed');
    expect(s.plan.title).toBe('A사 면접');
    expect(s.plan.placeId).toBe('p1');
  });
});

describe('최근 일정', () => {
  it('알람을 켜면 최근 일정에 남고, 다시 열어도 남아 있다', () => {
    const armed = armState(planned(), now, false);
    expect(armed.recentPlans).toHaveLength(1);
    expect(armed.recentPlans[0]).toMatchObject({ title: 'A사 면접', placeId: 'p1', placeName: 'A사', arriveMin: 600 });
    const later = reopen({ ...armed, session: null }, at(28, 7, 0));
    expect(later.plan.title).toBe('');
    expect(later.recentPlans).toHaveLength(1);
  });
  it('누르면 제목·장소·이동 시간·준비 단계가 다시 채워지고 도착은 다음 그 시각이 된다', () => {
    const armed = armState(planned(), now, false);
    const later = reopen({ ...armed, session: null }, at(28, 7, 0));
    const filled = applyRecentState(later, later.recentPlans[0].id, at(28, 7, 0));
    expect(filled.plan).toMatchObject({ title: 'A사 면접', placeId: 'p1', rideMin: 33, waitMin: 0, arriveAt: at(28, 10, 0) });
    expect(filled.plan.steps).toEqual(planned().plan.steps);
  });
  it('시연은 최근 일정에 남기지 않는다', () => {
    expect(armState(planned(), now, true).recentPlans).toHaveLength(0);
  });
  it('같은 일정으로 알람을 다시 켜도 한 줄만 남는다', () => {
    const once = armState(planned(), now, false);
    const twice = armState({ ...once, session: null }, now + 1000, false);
    expect(twice.recentPlans).toHaveLength(1);
  });
});

describe('요일 반복', () => {
  // 11월 26일은 목요일. 월·수·금 10:00 반복
  const repeating = (): AppState => {
    const s = planned();
    return { ...s, plan: { ...s.plan, repeatDays: [1, 3, 5] } };
  };
  it('알람을 켜면 도착 날짜가 다음 그 요일로 맞춰진다', () => {
    const armed = armState(repeating(), now, false); // 목 20:00 → 금 10:00
    expect(armed.session?.arriveAt).toBe(at(27, 10, 0));
    expect(armed.plan.arriveAt).toBe(at(27, 10, 0));
  });
  it('기록을 저장하면 다음 그 요일로 알람이 다시 켜진다', () => {
    const armed = armState(repeating(), now, false);
    const session = { ...armed.session!, state: 'summary' as const, prepStartAt: at(27, 8, 0), leftAt: at(27, 9, 0), arrivedAt: at(27, 9, 55) };
    const next = saveRecordState({ ...armed, session }, at(27, 9, 56), false);
    expect(next.records).toHaveLength(1);
    expect(next.session?.state).toBe('armed');
    expect(next.session?.arriveAt).toBe(at(30, 10, 0)); // 금 → 다음 월(같은 날 10:00으로 다시 잡지 않는다)
  });
  it('한 번만이면 저장한 뒤 알람이 다시 켜지지 않는다', () => {
    const armed = armState(planned(), now, false);
    const session = { ...armed.session!, state: 'summary' as const, prepStartAt: at(27, 8, 0), leftAt: at(27, 9, 0), arrivedAt: at(27, 9, 55) };
    expect(saveRecordState({ ...armed, session }, at(27, 9, 56), false).session).toBeNull();
  });
  it('최근 일정에 반복 요일이 남고, 다시 고르면 함께 채워진다', () => {
    const armed = armState(repeating(), now, false);
    const later = reopen({ ...armed, session: null }, at(28, 7, 0)); // 토요일 아침
    expect(later.plan.repeatDays).toBeUndefined();
    const filled = applyRecentState(later, later.recentPlans[0].id, at(28, 7, 0));
    expect(filled.plan.repeatDays).toEqual([1, 3, 5]);
    expect(filled.plan.arriveAt).toBe(at(30, 10, 0)); // 다음 월요일
  });
});

describe('기본값', () => {
  it('새 계획은 배차 대기 0분, 도착 여유는 10분', () => {
    const s = defaultState(now);
    expect(s.plan.waitMin).toBe(0);
    expect(s.settings.buffer).toBe(10);
    expect(reopen(planned(), now + 60_000).plan.waitMin).toBe(0);
  });
});
