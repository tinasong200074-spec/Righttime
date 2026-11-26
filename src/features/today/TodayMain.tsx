import { useApp } from '../../app/store';
import { isNativeApp } from '../../infra/nativeAlarm';
import { WEATHER_CREDIT } from '../../infra/weather';
import { PlanList } from '../queue/PlanList';
import { Icon } from '../../ui';
import { useWeather } from './useWeather';
import { WeatherRow } from './WeatherRow';

export type View = 'main' | 'weather' | 'carry' | 'helper';
type Go = (v: View) => void;

function CarryRow({ go }: { go: Go }) {
  const { checklist } = useApp();
  return (
    <button type="button" className="m-card m-nav" onClick={() => go('carry')}>
      <span className="m-tile">
        <Icon name="bell" main="var(--ink)" det="var(--ink)" size={24} />
      </span>
      <span className="m-grow">
        <div className="m-name">출발할 때 알려줘요</div>
        <div className="m-sub">{checklist.length > 0 ? checklist.map((c) => c.text).join(' · ') : '눌러서 챙길 것을 적어요'}</div>
      </span>
    </button>
  );
}

// ① 오늘: 잡아 둔 약속을 세로로 나열한다. 약속을 누르면 시작·준비·출발 시각이 펼쳐진다.
// 약속을 만들고 고치는 일은 "새 약속" 탭에서 한다
export function TodayMain({ go, edit }: { go: Go; edit: () => void }) {
  const mode = useWeather();
  return (
    <div className="m-screen">
      <WeatherRow mode={mode} go={go} />
      <div className="m-titlerow">
        <h1 className="m-h1">오늘</h1>
      </div>
      <PlanList onNew={edit} />
      <CarryRow go={go} />
      <div className="m-spacer" />
      <button type="button" className="m-cta" onClick={edit}>
        새 약속 잡기
      </button>
      <p className="m-note">
        {isNativeApp() ? '앱을 닫아도 알람이 울려요' : '웹 앱이라 화면이 열려 있을 때만 울려요'} · {WEATHER_CREDIT}
      </p>
    </div>
  );
}
