import { DAY, type Place } from './types.js';

// 요일 반복과 자주 가는 곳 분류. 요일은 Date.getDay() 값(0=일 … 6=토)이다.

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 화면에는 월요일부터 보여 준다
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const SEARCH_DAYS = 8; // 오늘 포함 8일 안에는 고른 요일이 반드시 있다

// 고른 요일 중 after보다 뒤에 오는 가장 가까운 도착 시각. 요일을 안 골랐으면 null(한 번만)
export function nextRepeatArrive(arriveMin: number, days: number[], after: number): number | null {
  if (days.length === 0) return null;
  const base = new Date(after);
  base.setHours(Math.floor(arriveMin / 60), arriveMin % 60, 0, 0);
  for (let i = 0; i < SEARCH_DAYS; i++) {
    const t = base.getTime() + i * DAY;
    if (t > after && days.includes(new Date(t).getDay())) return t;
  }
  return null;
}

export const minuteOfDay = (ms: number) => new Date(ms).getHours() * 60 + new Date(ms).getMinutes();

// "한 번만", "매일", "평일", "주말", "매주 월·수·금"
export function repeatLabel(days: number[] | undefined): string {
  const set = WEEK_ORDER.filter((d) => days?.includes(d));
  if (set.length === 0) return '한 번만';
  if (set.length === 7) return '매일';
  const key = set.join('');
  if (key === '12345') return '평일';
  if (key === '60') return '주말';
  return `매주 ${set.map((d) => DAY_NAMES[d]).join('·')}`;
}

export function toggleDay(days: number[] | undefined, day: number): number[] {
  const cur = days ?? [];
  return cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day];
}

// 자주 가는 곳 분류. 기본 세 가지에 사용자가 붙인 이름을 더한다
export const DEFAULT_TAGS = ['집', '회사', '학원'];
export const TAG_MAX_LEN = 6;

export function tagsOf(places: Place[]): string[] {
  const custom = places.map((p) => p.tag).filter((t): t is string => !!t && !DEFAULT_TAGS.includes(t));
  return [...DEFAULT_TAGS, ...new Set(custom)];
}

export const placeByTag = (places: Place[], tag: string) => places.find((p) => p.tag === tag);

// 한 분류에는 장소 하나만 둔다. 같은 분류를 다시 고르면 그 장소로 옮겨 간다. tag가 비면 분류를 뗀다
export function setPlaceTag(places: Place[], placeId: string, tag: string): Place[] {
  const clean = tag.trim().slice(0, TAG_MAX_LEN);
  return places.map((p) => {
    if (p.id === placeId) return { ...p, tag: clean || undefined };
    return clean && p.tag === clean ? { ...p, tag: undefined } : p;
  });
}
