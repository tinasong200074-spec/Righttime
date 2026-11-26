import { useApp } from '../../app/store';
import { roundCoord } from '../../domain/geo';
import { Card, Icon, Pill } from '../../ui';
import { WEATHER_CREDIT } from '../../infra/weather';
import { readPositionOnce } from '../../infra/geo';
import { useWeather, useWeatherBasis, type WeatherMode } from './useWeather';

const NOTES: Partial<Record<WeatherMode, string>> = {
  demo: '시연 모드에서는 날씨를 불러오지 않아요.',
  manual: '직접 고른 값을 쓰고 있어요.',
  off: '날씨 자동 추천이 꺼져 있어요. 설정에서 켤 수 있어요.',
  'too-far': '날씨 예보는 15일 이내 일정만 볼 수 있어요.',
  loading: '날씨를 불러오는 중이에요…',
  error: '날씨를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.',
};

function LocationButton() {
  const { actions } = useApp();
  const ask = async () => {
    const pos = await readPositionOnce();
    if (pos) actions.setWeatherCoord({ lat: roundCoord(pos.lat, 2), lon: roundCoord(pos.lon, 2) }); // 약 1km 단위로 줄인다
  };
  return (
    <div>
      <p className="f-sub">날씨를 자동으로 보려면 위치가 필요해요. 장소에 위치를 저장하면 그 장소의 날씨를 봐요.</p>
      <button type="button" className="f-btn" onClick={ask}>
        내 위치로 날씨 보기
      </button>
    </div>
  );
}

// 어느 위치의 날씨인지 보여 주고, 내 위치 기준일 때는 다시 읽거나 지울 수 있게 한다
function BasisRow() {
  const { actions } = useApp();
  const basis = useWeatherBasis();
  if (basis.kind === 'none') return null;
  const reread = async () => {
    const pos = await readPositionOnce();
    if (pos) actions.setWeatherCoord({ lat: roundCoord(pos.lat, 2), lon: roundCoord(pos.lon, 2) });
  };
  return (
    <div>
      <p className="f-sub">
        {basis.label}
        {basis.kind === 'place' && ' · 도착 장소를 바꾸면 날씨도 바뀌어요.'}
        {basis.kind === 'origin' && ' · 도착 장소에 위치가 없어서 출발지 날씨를 보여 줘요.'}
      </p>
      {basis.kind === 'mine' && (
        <div className="f-chips">
          <button type="button" className="f-btn" onClick={reread}>
            새로고침
          </button>
        </div>
      )}
    </div>
  );
}

function Summary() {
  const { weather, checklist } = useApp();
  const items = checklist.filter((c) => c.src === 'weather');
  return (
    <div>
      <p className="t-weather-line">{weather?.line}</p>
      <ul className="f-chips" aria-label="날씨로 챙길 것">
        {items.map((c) => (
          <li key={c.key}>
            <Pill tone="soft">{c.text}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManualItems() {
  const { checklist } = useApp();
  const items = checklist.filter((c) => c.src === 'weather');
  if (items.length === 0) return null;
  return (
    <ul className="f-chips" aria-label="날씨로 챙길 것">
      {items.map((c) => (
        <li key={c.key}>
          <Pill tone="soft">{c.text}</Pill>
        </li>
      ))}
    </ul>
  );
}

export function WeatherCard() {
  const { rain, weather } = useApp();
  const mode = useWeather();
  const wet = mode === 'ok' ? weather?.rain : rain === 'yes' || rain === 'maybe';

  return (
    <Card>
      <div className="f-row">
        <Icon name={wet ? 'rain' : 'temp'} main="var(--ink)" det="var(--surface)" size={32} />
        <h2 className="f-title">날씨</h2>
      </div>
      {mode === 'ok' && <Summary />}
      <BasisRow />
      {mode === 'need-location' && <LocationButton />}
      {mode === 'manual' && <ManualItems />}
      {NOTES[mode] && <p className="f-sub" aria-live="polite">{NOTES[mode]}</p>}
      <p className="f-credit">{WEATHER_CREDIT}</p>
    </Card>
  );
}
