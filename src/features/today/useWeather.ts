import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { judgeWeather } from '../../domain/weather';
import { DAY } from '../../domain/types';
import { fetchHourly } from '../../infra/weather';

const DEBOUNCE_MS = 600; // 입력을 고치는 동안 매번 부르지 않는다
const MAX_AHEAD_DAYS = 15;

export type WeatherMode = 'demo' | 'manual' | 'off' | 'need-location' | 'too-far' | 'loading' | 'error' | 'ok';

export type WeatherBasis = { kind: 'place' | 'origin' | 'mine' | 'none'; label: string; coord: { lat: number; lon: number } | null };

// 날씨를 어느 위치 기준으로 볼지 정한다: 도착 장소 → 출발지 → 따로 허용한 내 위치 순서
export function useWeatherBasis(): WeatherBasis {
  const { calc, origin, weatherCoord } = useApp();
  const place = calc?.place;
  if (place?.geo) return { kind: 'place', label: `${place.name || '도착 장소'} 기준`, coord: place.geo };
  if (origin) return { kind: 'origin', label: `출발지(${origin.name}) 기준`, coord: origin };
  if (weatherCoord) return { kind: 'mine', label: '내 위치 기준 (약 1km 단위)', coord: weatherCoord };
  return { kind: 'none', label: '', coord: null };
}

// 날씨를 불러와 판정 결과를 store에 넣고, 화면이 보여 줄 상태를 돌려준다
export function useWeather(): WeatherMode {
  const { calc, settings, rain, demo, now, weather, actions } = useApp();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { coord } = useWeatherBasis();
  const tooFar = calc ? calc.arriveAt - now > MAX_AHEAD_DAYS * DAY : false;
  const active = !demo && settings.weatherAuto && rain === 'auto' && !!calc && !!coord && !tooFar;
  const leaveAt = calc?.leaveAt ?? 0;
  const arriveAt = calc?.arriveAt ?? 0;

  useEffect(() => {
    if (!active || !coord) return;
    let stale = false;
    actions.setWeather(null); // 위치나 시간이 바뀌면 예전 결과를 바로 지운다(다른 지역 날씨가 남아 보이지 않게)
    const timer = setTimeout(() => {
      setBusy(true);
      setFailed(false);
      fetchHourly(coord.lat, coord.lon, leaveAt, arriveAt)
        .then((hours) => !stale && actions.setWeather(judgeWeather(hours, settings)))
        .catch(() => {
          if (stale) return;
          setFailed(true);
          actions.setWeather(null);
        })
        .finally(() => !stale && setBusy(false));
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // 판정에 쓰는 기준값이 바뀌면 같은 예보로 다시 판정한다(예보는 캐시에서 온다)
  }, [active, coord?.lat, coord?.lon, leaveAt, arriveAt, settings.rainTh, settings.coldTh, settings.hotTh, actions]);

  if (demo) return 'demo';
  if (rain !== 'auto') return 'manual';
  if (!settings.weatherAuto) return 'off';
  if (!coord) return 'need-location';
  if (tooFar) return 'too-far';
  if (busy) return 'loading';
  if (failed) return 'error';
  return weather?.ok ? 'ok' : 'loading';
}
