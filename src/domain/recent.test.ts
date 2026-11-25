import { describe, expect, it } from 'vitest';
import { addRecent, applyRecent, freshPlan, nextOccurrence, recentLabel, toRecent } from './recent';
import type { Place, Plan } from './types';

const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime();
const plan: Plan = {
  title: 'A사 면접', arriveAt: at(27, 10, 0), placeId: 'p1', rideMin: 33, waitMin: 8, kind: 'interview',
  steps: [{ id: 's1', name: '씻기', est: 20 }],
};
const places: Place[] = [{ id: 'p1', name: 'A사', travelMin: 33 }];

describe('toRecent, addRecent', () => {
  it('날짜는 버리고 도착 시각(분)만 남긴다', () => {
    const r = toRecent(plan, 'A사', at(26, 22, 0), 'r1');
    expect(r.arriveMin).toBe(600);
    expect(r).not.toHaveProperty('arriveAt');
  });
  it('같은 일정은 하나만 두고 맨 위로 올린다', () => {
    const a = toRecent(plan, 'A사', 1, 'a');
    const b = toRecent({ ...plan, title: '스터디' }, 'A사', 2, 'b');
    const again = toRecent(plan, 'A사', 3, 'c');
    expect(addRecent(addRecent([a], b), again).map((r) => r.id)).toEqual(['c', 'b']);
  });
  it('8개까지만 둔다', () => {
    let list = [toRecent(plan, '', 0, 'x')];
    for (let i = 0; i < 10; i++) list = addRecent(list, toRecent({ ...plan, title: `일정${i}` }, '', i, `r${i}`));
    expect(list).toHaveLength(8);
    expect(list[0].id).toBe('r9');
  });
});

describe('nextOccurrence, applyRecent', () => {
  it('오늘 아직 안 지났으면 오늘, 지났으면 내일', () => {
    expect(nextOccurrence(600, at(26, 8, 0))).toBe(at(26, 10, 0));
    expect(nextOccurrence(600, at(26, 10, 0))).toBe(at(27, 10, 0));
    expect(nextOccurrence(600, at(26, 22, 0))).toBe(at(27, 10, 0));
  });
  it('기록을 누르면 일정이 그대로 채워진다', () => {
    const r = toRecent(plan, 'A사', at(26, 22, 0), 'r1');
    expect(applyRecent(r, at(28, 7, 0), places)).toEqual({ ...plan, waitMin: 0, arriveAt: at(28, 10, 0) }); // 배차 대기는 다시 채우지 않는다
  });
  it('그사이 지운 장소는 빼고 채운다', () => {
    const r = toRecent(plan, 'A사', 0, 'r1');
    expect(applyRecent(r, at(28, 7, 0), []).placeId).toBeUndefined();
  });
});

describe('freshPlan', () => {
  it('제목·장소·이동 시간은 비우고 준비 단계는 둔다', () => {
    const f = freshPlan(plan, at(26, 23, 30));
    expect(f).toEqual({ title: '', arriveAt: at(27, 9, 0), rideMin: 30, waitMin: 0, steps: plan.steps, kind: 'interview' });
    expect(f.placeId).toBeUndefined();
  });
});

describe('recentLabel', () => {
  it('제목이 있으면 제목, 없으면 장소 이름', () => {
    expect(recentLabel(toRecent(plan, 'A사', 0, 'r'))).toEqual({ title: 'A사 면접', sub: '10:00 도착 · A사 · 이동 41분' });
    expect(recentLabel(toRecent({ ...plan, title: '' }, 'A사', 0, 'r'))).toEqual({ title: 'A사', sub: '10:00 도착 · 이동 41분' });
    expect(recentLabel(toRecent({ ...plan, title: '', placeId: undefined }, '', 0, 'r')).title).toBe('장소 없음');
  });
});
