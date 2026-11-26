import { describe, expect, it } from 'vitest';
import { homeOf, orderSpots, setHome, spotKey, toggleFav, touchSpot, type Spot } from './spots';

const spot = (name: string, i = 0) => ({ name, address: `${name} 주소`, lat: 37.5 + i / 100, lon: 127 });
const build = (...names: string[]): Spot[] => names.reduce<Spot[]>((list, n, i) => touchSpot(list, spot(n, i), i + 1), []);

describe('touchSpot', () => {
  it('처음 고른 곳은 넣고, 다시 고르면 시각만 새로 적는다', () => {
    const list = touchSpot(build('강남역', '서울역'), spot('강남역', 0), 99);
    expect(list.length).toBe(2);
    expect(list.find((s) => s.name === '강남역')?.usedAt).toBe(99);
  });
  it('다시 골라도 즐겨찾기 표시는 남는다', () => {
    const key = spotKey(spot('강남역', 0));
    const list = touchSpot(toggleFav(build('강남역'), key), spot('강남역', 0), 50);
    expect(list[0].fav).toBe(true);
  });
  it('일반 기록은 최근 10개만 두고, 즐겨찾기와 집은 버리지 않는다', () => {
    let list = build('A');
    list = toggleFav(list, spotKey(spot('A', 0)));
    for (let i = 1; i <= 14; i++) list = touchSpot(list, spot(`P${i}`, i), 100 + i);
    expect(list.filter((s) => !s.fav).length).toBe(10);
    expect(list.some((s) => s.name === 'A')).toBe(true);
    expect(list.some((s) => s.name === 'P1')).toBe(false); // 가장 오래된 것부터 빠진다
  });
});

describe('즐겨찾기와 집', () => {
  it('즐겨찾기는 맨 위에, 나머지는 최근 순으로 온다', () => {
    const list = toggleFav(build('오래된 곳', '중간', '최근'), spotKey(spot('오래된 곳', 0)));
    expect(orderSpots(list).map((s) => s.name)).toEqual(['오래된 곳', '최근', '중간']);
  });
  it('집은 하나만 둔다', () => {
    let list = build('우리집', '새집');
    list = setHome(list, spotKey(spot('우리집', 0)));
    list = setHome(list, spotKey(spot('새집', 1)));
    expect(list.filter((s) => s.home).map((s) => s.name)).toEqual(['새집']);
    expect(homeOf(list)?.name).toBe('새집');
  });
  it('집을 다시 누르면 집 표시를 뗀다', () => {
    const key = spotKey(spot('우리집', 0));
    expect(homeOf(setHome(setHome(build('우리집'), key), key))).toBeNull();
  });
});
