import { useApp } from '../../app/store';
import { Icon } from '../../ui';
import type { View } from './TodayMain';
import { useWeatherBasis, type WeatherMode } from './useWeather';

const BASIS_SHORT = { mine: '내 위치', place: '도착 장소', origin: '출발지' } as const;
const MANUAL_TITLE = { none: '비 없음', maybe: '비 올 수도 있어요', yes: '비가 와요', auto: '날씨' } as const;

const SUB: Partial<Record<WeatherMode, string>> = {
  demo: '시연 모드에서는 불러오지 않아요',
  off: '자동 추천이 꺼져 있어요',
  'need-location': '위치를 허용하면 날씨가 보여요',
  'too-far': '15일 이내 일정만 볼 수 있어요',
  loading: '날씨 불러오는 중…',
  error: '날씨를 불러오지 못했어요',
};

// 한 줄에 들어갈 글: 날씨가 있으면 "쌀쌀해요 · 체감 3°C · 비 3%" 전체
function useLineText(mode: WeatherMode): string {
  const { weather, rain } = useApp();
  const { kind } = useWeatherBasis();
  // 어느 위치의 날씨인지 눌러 보지 않아도 알 수 있게 앞에 붙인다
  if (mode === 'ok' && weather?.line) return kind === 'none' ? weather.line : `${BASIS_SHORT[kind]} · ${weather.line}`;
  if (mode === 'manual') return `${MANUAL_TITLE[rain]} · 직접 골랐어요`;
  return SUB[mode] ?? '날씨';
}

// 맨 위의 얇은 날씨 줄. 내 위치 날씨를 자동으로 보여 주고, 누르면 직접 고르는 화면이 열린다
export function WeatherRow({ mode, go }: { mode: WeatherMode; go: (v: View) => void }) {
  const { checklist, rain, weather } = useApp();
  const text = useLineText(mode);
  const wet = mode === 'ok' ? weather?.rain : rain === 'yes' || rain === 'maybe';
  const pills = checklist.filter((c) => c.src === 'weather');
  return (
    <button type="button" className="m-wx" onClick={() => go('weather')} aria-label={`날씨: ${text}. 누르면 직접 고를 수 있어요`}>
      <Icon name={wet ? 'rain' : 'temp'} main="var(--ink)" det="var(--accent-soft)" size={22} />
      <span className="m-wx-text">{text}</span>
      {pills.map((p) => (
        <span key={p.key} className="m-pill">
          {p.text}
        </span>
      ))}
    </button>
  );
}
