import { describe, expect, it } from 'vitest';
import { nextRepeatArrive, placeByTag, repeatLabel, setPlaceTag, tagsOf, toggleDay } from './repeat';
import type { Place } from './types';

// 2026-11-26은 목요일
const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime();

describe('nextRepeatArrive', () => {
  it('요일을 안 고르면 null(한 번만)', () => {
    expect(nextRepeatArrive(540, [], at(26, 8, 0))).toBeNull();
  });
  it('오늘이 고른 요일이고 아직 안 지났으면 오늘', () => {
    expect(nextRepeatArrive(540, [4], at(26, 8, 0))).toBe(at(26, 9, 0));
  });
  it('오늘 시각이 지났으면 다음 고른 요일', () => {
    expect(nextRepeatArrive(540, [4], at(26, 9, 0))).toBe(at(26 + 7, 9, 0));
    expect(nextRepeatArrive(540, [1, 3, 5], at(26, 10, 0))).toBe(at(27, 9, 0)); // 금
    expect(nextRepeatArrive(540, [1, 3, 5], at(27, 9, 30))).toBe(at(30, 9, 0)); // 월
  });
  it('방금 끝난 약속과 같은 시각은 다시 잡지 않는다', () => {
    // 08:55에 도착해 기록을 저장해도 오늘 09:00이 아니라 다음 날로 넘어간다
    expect(nextRepeatArrive(540, [4, 5], Math.max(at(26, 8, 55), at(26, 9, 0)))).toBe(at(27, 9, 0));
  });
});

describe('repeatLabel, toggleDay', () => {
  it('고른 요일을 쉬운 말로', () => {
    expect(repeatLabel(undefined)).toBe('한 번만');
    expect(repeatLabel([])).toBe('한 번만');
    expect(repeatLabel([0, 1, 2, 3, 4, 5, 6])).toBe('매일');
    expect(repeatLabel([5, 1, 3, 2, 4])).toBe('평일');
    expect(repeatLabel([0, 6])).toBe('주말');
    expect(repeatLabel([5, 1, 3])).toBe('매주 월·수·금');
  });
  it('요일을 켜고 끈다', () => {
    expect(toggleDay(undefined, 1)).toEqual([1]);
    expect(toggleDay([1, 3], 3)).toEqual([1]);
  });
});

describe('자주 가는 곳 분류', () => {
  const places: Place[] = [
    { id: 'a', name: '우리 집', travelMin: 0, tag: '집' },
    { id: 'b', name: 'A사', travelMin: 30 },
    { id: 'c', name: '수영장', travelMin: 15, tag: '운동' },
  ];
  it('기본 분류 뒤에 내가 붙인 분류가 온다', () => {
    expect(tagsOf(places)).toEqual(['집', '회사', '학원', '운동']);
    expect(placeByTag(places, '집')?.id).toBe('a');
    expect(placeByTag(places, '회사')).toBeUndefined();
  });
  it('한 분류에는 장소 하나만: 다시 고르면 옮겨 간다', () => {
    const next = setPlaceTag(places, 'b', '집');
    expect(next.map((p) => p.tag)).toEqual([undefined, '집', '운동']);
  });
  it('빈 이름이면 분류를 떼고, 이름은 6자까지', () => {
    expect(setPlaceTag(places, 'a', ' ')[0].tag).toBeUndefined();
    expect(setPlaceTag(places, 'b', '아주아주긴분류이름')[1].tag).toBe('아주아주긴분');
  });
});
