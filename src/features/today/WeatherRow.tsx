import { useApp } from '../../app/store';
import { Icon } from '../../ui';
import type { View } from './TodayMain';
import type { WeatherMode } from './useWeather';

const MANUAL_TITLE = { none: '비 없음', maybe: '비 올 수도 있어요', yes: '비가 와요', auto: '날씨' } as const;

const SUB: Partial<Record<WeatherMode, string>> = {
  demo: '시연 모드에서는 불러오지 않아요',
  off: '자동 추천이 꺼져 있어요',
  'need-location': '눌러서 위치를 정해요',
  'too-far': '15일 이내 일정만 볼 수 있어요',
  loading: '불러오는 중이에요…',
  error: '불러오지 못했어요 · 눌러서 직접 고르기',
};

function useRowText(mode: WeatherMode): { title: string; sub: string } {
  const { weather, rain } = useApp();
  if (mode === 'ok' && weather?.line) {
    const [title, ...rest] = weather.line.split(' · ');
    return { title, sub: rest.join(' · ') };
  }
  if (mode === 'manual') return { title: MANUAL_TITLE[rain], sub: '직접 골랐어요' };
  return { title: '날씨', sub: SUB[mode] ?? '' };
}

// 날씨 한 줄: 제목, 체감·강수, 우산·겉옷 알약. 눌러서 직접 고르거나 위치를 정한다
export function WeatherRow({ mode, go }: { mode: WeatherMode; go: (v: View) => void }) {
  const { checklist, rain, weather } = useApp();
  const { title, sub } = useRowText(mode);
  const wet = mode === 'ok' ? weather?.rain : rain === 'yes' || rain === 'maybe';
  const pills = checklist.filter((c) => c.src === 'weather');
  return (
    <>
      <button type="button" className="m-card m-nav" onClick={() => go('weather')}>
        <span className="m-tile is-soft">
          <Icon name={wet ? 'rain' : 'temp'} main="var(--ink)" det="var(--accent-soft)" size={26} />
        </span>
        <span className="m-grow">
          <div className="m-name">{title}</div>
          <div className="m-sub">{sub}</div>
        </span>
        <span className="m-pills">
          {pills.map((p) => (
            <span key={p.key} className="m-pill">
              {p.text}
            </span>
          ))}
        </span>
      </button>
    </>
  );
}
