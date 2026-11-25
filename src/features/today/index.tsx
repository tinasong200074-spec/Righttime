import { useApp } from '../../app/store';
import { Card } from '../../ui';
import { ArmBar } from './ArmBar';
import { CarryCard } from './CarryCard';
import './fields.css';
import { HelperCard } from './HelperCard';
import { MemoBar } from './MemoBar';
import { PlanCard } from './PlanCard';
import { ScheduleCard } from './ScheduleCard';
import { StepsEditor } from './StepsEditor';
import './today.css';
import { TravelCard } from './TravelCard';
import { WeatherCard } from './WeatherCard';

// ① 오늘: 도착 시각에서 거꾸로 알람·준비·출발 시각을 보여 준다
export function TodayScreen() {
  const { calc, session } = useApp();
  return (
    <div className="f-stack">
      <MemoBar />
      <fieldset className="f-fieldset" disabled={session !== null}>
        <PlanCard />
        {calc ? (
          <>
            <TravelCard calc={calc} />
            <ScheduleCard calc={calc} />
          </>
        ) : (
          <Card>
            <p className="f-sub">준비 단계를 하나 이상 넣으면 알람 시각을 계산해 줘요.</p>
          </Card>
        )}
        <StepsEditor />
      </fieldset>
      {session && <p className="f-sub">알람이 켜져 있는 동안은 일정을 바꿀 수 없어요. 바꾸려면 알람을 끄세요.</p>}
      <WeatherCard />
      <CarryCard />
      <HelperCard />
      <ArmBar />
    </div>
  );
}
