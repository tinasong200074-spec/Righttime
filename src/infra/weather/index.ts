// Open-Meteo 시간별 예보 불러오기 (명세 9.4). 키가 없어 브라우저에서 직접 부른다.
// 시연 모드에서는 호출하지 않는다: 호출하는 쪽(화면)이 demo일 때 fetchHourly를 부르지 않는다.
import type { HourWeather } from '../../domain/types';

const OK_TTL_MS = 60 * 60 * 1000; // 성공은 1시간
const FAIL_TTL_MS = 10 * 60 * 1000; // 실패는 10분
const MAX_DAYS_AHEAD = 15; // 예보는 최대 16일, 여유를 두고 15일 이내만 부른다

type CacheEntry = { at: number; ttl: number; hours: HourWeather[] | null };
const cache = new Map<string, CacheEntry>();

type HourlyResponse = {
  hourly?: {
    time: string[];
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    apparent_temperature: (number | null)[];
    weather_code: (number | null)[];
  };
};

/** 로컬 날짜를 YYYY-MM-DD로 만든다. timezone=auto 응답과 같은 기준이다. */
function dateKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function buildUrl(lat: number, lon: number, fromMs: number, toMs: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(2), // 약 1km 단위로 줄여서 보낸다
    longitude: lon.toFixed(2),
    hourly: 'precipitation_probability,precipitation,apparent_temperature,weather_code',
    timezone: 'auto',
    start_date: dateKey(fromMs),
    end_date: dateKey(toMs),
  });
  return `https://api.open-meteo.com/v1/forecast?${q.toString()}`;
}

function parse(json: HourlyResponse, fromMs: number, toMs: number): HourWeather[] {
  const h = json.hourly;
  if (!h) throw new Error('응답에 hourly가 없어요');
  const out: HourWeather[] = [];
  h.time.forEach((t, i) => {
    const ms = new Date(t).getTime(); // 응답 시각은 현지 시각 문자열이다
    // 출발~도착 창에 걸친 시간대를 고른다(그 시간의 시작 ~ +1시간이 창과 겹치면 포함).
    if (ms + 3600_000 <= fromMs || ms >= toMs) return;
    out.push({
      timeMs: ms,
      prob: h.precipitation_probability[i] ?? null,
      precip: h.precipitation[i] ?? null,
      apparent: h.apparent_temperature[i] ?? null,
      code: h.weather_code[i] ?? null,
    });
  });
  return out;
}

/**
 * 출발~도착 창의 시간별 날씨를 돌려준다. 실패하면 빈 배열이 아니라 예외를 던진다.
 * 같은 요청은 성공 1시간, 실패 10분 동안 캐시한다.
 */
export async function fetchHourly(
  lat: number,
  lon: number,
  fromMs: number,
  toMs: number,
): Promise<HourWeather[]> {
  if (fromMs - Date.now() > MAX_DAYS_AHEAD * 86_400_000) {
    throw new Error('날씨 예보는 15일 이내 일정만 불러와요');
  }
  const url = buildUrl(lat, lon, fromMs, toMs);
  const key = `${url}|${fromMs}|${toMs}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) {
    if (hit.hours) return hit.hours;
    throw new Error('날씨를 잠시 전에 불러오지 못했어요');
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000); // 느린 망에서 무한 대기하지 않게
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`날씨 서버 응답 ${res.status}`);
    const hours = parse((await res.json()) as HourlyResponse, fromMs, toMs);
    if (hours.length === 0) throw new Error('해당 시간의 예보가 없어요');
    cache.set(key, { at: Date.now(), ttl: OK_TTL_MS, hours });
    return hours;
  } catch (e) {
    cache.set(key, { at: Date.now(), ttl: FAIL_TTL_MS, hours: null });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const WEATHER_CREDIT = '날씨 데이터: Open-Meteo.com';
