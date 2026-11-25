import { describe, expect, it } from 'vitest';
import { MIN, type Session } from '../../domain/types';
import { diffText, fmtTimer, leavePillText, prepBar, stepOverMin, verdictOf, wakeBar, weatherParts } from './progress';

const T0 = 7 * 60 * MIN; // 07:00
const base: Session = {
  state: 'prep',
  title: '',
  arriveAt: T0 + 120 * MIN,
  alarmAt: T0,
  leaveAt: T0 + 74 * MIN,
  prepStartPlanAt: T0 + 14 * MIN,
  travelMin: 40,
  buffer: 5,
  wakeMin: 14,
  placeName: '',
  steps: [{ id: 'a', name: '옷 입기', est: 10, userEst: 10 }],
  userPrep: 10,
  firstRingAt: T0,
  snoozeCount: 0,
  prepStartAt: T0 + 14 * MIN,
  stepIdx: 0,
  stepStartAt: T0 + 14 * MIN,
  log: [],
  checked: {},
  demo: false,
};

describe('wakeBar', () => {
  it('알람부터 평소 준비 시작까지 중간이면 절반', () => {
    expect(wakeBar({ ...base, state: 'ringing' }, T0 + 7 * MIN).progress).toBeCloseTo(0.5);
  });
  it('평소 시작 시각을 넘기면 1을 넘지 않는다', () => {
    expect(wakeBar(base, T0 + 60 * MIN).progress).toBe(1);
  });
});

describe('prepBar', () => {
  it('기상 구간과 준비 구간 비율이 실제 경과와 맞는다', () => {
    const bar = prepBar(base, T0 + 42 * MIN); // 기상 14분 + 준비 28분, 전체 74분
    expect(bar.segments[0]?.ratio).toBeCloseTo(14 / 74);
    expect(bar.segments[1]?.ratio).toBeCloseTo(28 / 74);
    expect(bar.progress).toBeCloseTo(42 / 74);
  });
  it('출발 목표가 지나면 가득 찬다', () => {
    expect(prepBar(base, T0 + 90 * MIN).progress).toBeCloseTo(1);
  });
});

describe('stepOverMin', () => {
  it('예상 10분 단계를 12분째 하고 있으면 2분 초과', () => {
    expect(stepOverMin(base, T0 + 26 * MIN)).toBeCloseTo(2);
  });
  it('예상 안이면 0', () => {
    expect(stepOverMin(base, T0 + 20 * MIN)).toBe(0);
  });
});

describe('fmtTimer · weatherParts', () => {
  it('두 자리로 채운다', () => {
    expect(fmtTimer(161_000)).toBe('02:41');
    expect(fmtTimer(3_761_000)).toBe('1:02:41');
    expect(fmtTimer(-5)).toBe('00:00');
  });
  it('날씨 줄을 제목과 설명으로 나눈다', () => {
    expect(weatherParts('춥고 비가 와요 · 체감 4°C · 비 70%', ['우산', '겉옷'])).toEqual({
      title: '춥고 비가 와요',
      detail: '체감 4°C · 비 70% · 우산, 겉옷 챙기세요',
    });
  });
});

describe('문구', () => {
  it('diffText', () => {
    expect(diffText(3)).toBe('목표보다 3분 늦게');
    expect(diffText(-4)).toBe('목표보다 4분 일찍');
    expect(diffText(0)).toBe('목표 시각에 맞게');
  });
  it('leavePillText', () => {
    expect(leavePillText(T0 + 30 * MIN, T0, 5)).toBe('여유 30분');
    expect(leavePillText(T0 + 3 * MIN, T0, 5)).toBe('곧 출발');
    expect(leavePillText(T0 - MIN, T0, 5)).toBe('출발 시각이 지났어요');
  });
});

describe('verdictOf', () => {
  const done: Session = { ...base, state: 'summary', latency: 14, leftAt: T0 + 74 * MIN, arrivedAt: T0 + 120 * MIN };
  it('계획대로면 정시 도착이고 늦어진 구간이 없다', () => {
    const v = verdictOf({ ...done, userPrep: 60, travelMin: 46 });
    expect(v.headline).toBe('정시 도착!');
    expect(v.prepText).toBe('평소만큼 준비했어요');
    expect(v.culprit).toBeNull();
  });
  it('준비가 가장 많이 늦어졌으면 준비를 짚는다', () => {
    const v = verdictOf({ ...done, arrivedAt: T0 + 128 * MIN, userPrep: 52, travelMin: 46 });
    expect(v.headline).toBe('지각이에요. 8분 늦게 도착했어요');
    expect(v.prepText).toBe('평소보다 8분 더 준비했어요');
    expect(v.culprit).toEqual({ label: '준비', diff: 8 });
  });
  it('도착 버튼 대신 직접 고른 값도 문장이 된다', () => {
    expect(verdictOf({ ...done, arrivedAt: undefined, arrival: 'late' }).headline).toBe('지각이에요');
  });
});
