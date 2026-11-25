// 카카오 응답을 앱에서 쓰는 모양으로 바꾼다. 응답은 믿지 않고 필요한 값만 꺼낸다.
// 카카오 대중교통 경로 조회는 "지금 출발" 기준 소요 시간만 준다. 도착 시각 기준 조회와
// 배차 간격은 문서에 없어서, 배차 대기는 사용자가 직접 넣는 값을 그대로 쓴다.

export interface FoundPlace {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

const field = (o: unknown, key: string): unknown => (o && typeof o === 'object' ? (o as Record<string, unknown>)[key] : undefined);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const text = (v: unknown, max = 60) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const PLACE_MAX = 8;

// 키워드 장소 검색 응답(documents[].place_name, x=경도, y=위도)
export function parsePlaces(raw: unknown): FoundPlace[] {
  return list(field(raw, 'documents'))
    .map((d) => {
      const lat = num(field(d, 'y'));
      const lon = num(field(d, 'x'));
      const name = text(field(d, 'place_name'));
      if (lat === null || lon === null || !name) return null;
      return { name, address: text(field(d, 'road_address_name')) || text(field(d, 'address_name')), lat, lon };
    })
    .filter((p): p is FoundPlace => p !== null)
    .slice(0, PLACE_MAX);
}

export interface TransitRoute {
  rideMin: number; // 걷기 포함 전체 소요(분, 올림)
  walkMin: number;
  transfers: number;
  summary: string; // "걷기 5분 → 버스 472 → 지하철 2호선"
  landingUrl: string; // 카카오맵에서 경로 보기
}

function stepLabel(step: unknown): string | null {
  const p = field(step, 'properties');
  const type = field(p, 'type');
  if (type === 'WALKING') return null;
  const vehicle = text(field(list(field(p, 'vehicles'))[0], 'name'), 20);
  if (type === 'BUS') return vehicle ? `버스 ${vehicle}` : '버스';
  if (type === 'SUBWAY') return vehicle ? `지하철 ${vehicle}` : '지하철';
  return null;
}

function routeOf(route: unknown, landingUrl: string): TransitRoute | null {
  const props = field(route, 'properties');
  const totalSec = num(field(props, 'totalTime'));
  if (totalSec === null || totalSec <= 0) return null;
  const steps = list(field(route, 'steps'));
  const walkSec = steps
    .filter((s) => field(field(s, 'properties'), 'type') === 'WALKING')
    .reduce<number>((a, s) => a + (num(field(field(s, 'properties'), 'time')) ?? 0), 0);
  const walkMin = Math.round(walkSec / 60);
  const rides = steps.map(stepLabel).filter((s): s is string => s !== null);
  return {
    rideMin: Math.ceil(totalSec / 60),
    walkMin,
    transfers: num(field(props, 'transfers')) ?? Math.max(0, rides.length - 1),
    summary: [walkMin > 0 ? `걷기 ${walkMin}분` : null, ...rides].filter(Boolean).join(' → '),
    landingUrl,
  };
}

// 대중교통 경로 조회 응답에서 가장 빨리 도착하는 경로를 고른다. 없으면 null
export function parseTransit(raw: unknown): TransitRoute | null {
  if (field(raw, 'status') !== 'OK') return null;
  const url = text(field(field(raw, 'properties'), 'landingURL'), 500);
  const landingUrl = /^https:\/\//.test(url) ? url : '';
  const routes = list(field(raw, 'routes'))
    .map((r) => routeOf(r, landingUrl))
    .filter((r): r is TransitRoute => r !== null);
  return routes.sort((a, b) => a.rideMin - b.rideMin)[0] ?? null;
}

// 한국 근처 좌표인지 확인한다(엉뚱한 값을 서버로 보내지 않게)
export function isValidCoord(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 32 && lat <= 39.5 && lon >= 124 && lon <= 132;
}
