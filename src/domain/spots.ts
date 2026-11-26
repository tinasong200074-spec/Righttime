// 출발·도착 칸에서 찾아 쓴 장소의 기록(지도 앱의 검색 기록처럼). 기기에만 둔다.
// 즐겨찾기는 맨 위에, 집은 하나만 둔다.

export interface Spot {
  name: string;
  address: string;
  lat: number;
  lon: number;
  usedAt: number; // 마지막으로 고른 시각
  fav?: boolean;
  home?: boolean;
}

const PLAIN_MAX = 10; // 즐겨찾기·집이 아닌 기록은 10개까지

export const spotKey = (s: Pick<Spot, 'name' | 'lat' | 'lon'>) => `${s.name}|${s.lat.toFixed(4)},${s.lon.toFixed(4)}`;

const pinned = (s: Spot) => !!s.fav || !!s.home;

// 오래된 일반 기록부터 버린다(즐겨찾기와 집은 남긴다)
function trim(list: Spot[]): Spot[] {
  const plain = list.filter((s) => !pinned(s)).sort((a, b) => b.usedAt - a.usedAt).slice(0, PLAIN_MAX);
  return list.filter((s) => pinned(s) || plain.includes(s));
}

// 장소를 골랐을 때: 처음이면 넣고, 있던 것이면 시각만 새로 적는다(즐겨찾기·집 표시는 그대로)
export function touchSpot(list: Spot[], spot: Omit<Spot, 'usedAt' | 'fav' | 'home'>, now: number): Spot[] {
  const key = spotKey(spot);
  const old = list.find((s) => spotKey(s) === key);
  const next: Spot = { ...old, ...spot, usedAt: now };
  return trim([next, ...list.filter((s) => spotKey(s) !== key)]);
}

export const toggleFav = (list: Spot[], key: string): Spot[] => trim(list.map((s) => (spotKey(s) === key ? { ...s, fav: !s.fav } : s)));

// 집은 하나만. 이미 집인 곳을 다시 누르면 집 표시를 뗀다
export function setHome(list: Spot[], key: string): Spot[] {
  const wasHome = list.some((s) => spotKey(s) === key && s.home);
  return trim(list.map((s) => ({ ...s, home: spotKey(s) === key ? !wasHome : false })));
}

export const homeOf = (list: Spot[]): Spot | null => list.find((s) => s.home) ?? null;

// 보여 주는 순서: 즐겨찾기(최근 순) → 나머지(최근 순)
export function orderSpots(list: Spot[]): Spot[] {
  const recent = (a: Spot, b: Spot) => b.usedAt - a.usedAt;
  return [...list.filter((s) => s.fav).sort(recent), ...list.filter((s) => !s.fav).sort(recent)];
}
