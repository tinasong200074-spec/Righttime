import { isNativeApp } from '../../infra/nativeAlarm';
import { WEATHER_CREDIT } from '../../infra/weather';
import { NextPlan } from '../queue/NextPlan';
import { ChecklistCard } from './ChecklistCard';
import { useWeather } from './useWeather';
import { WeatherRow } from './WeatherRow';

export type View = 'main' | 'weather' | 'carry' | 'helper';
type Go = (v: View) => void;

// ① 오늘: 가장 곧 시작될 일정 하나(이름, 도착 시각, 시작시간)와 챙길 체크리스트.
// 약속을 만들고 고치는 일은 "새 약속" 탭에서 한다
export function TodayMain({ go, edit }: { go: Go; edit: () => void }) {
  const mode = useWeather();
  return (
    <div className="m-screen">
      <WeatherRow mode={mode} go={go} />
      <div className="m-titlerow">
        <h1 className="m-h1">오늘</h1>
      </div>
      <NextPlan onNew={edit} />
      <ChecklistCard onHelper={() => go('helper')} />
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
