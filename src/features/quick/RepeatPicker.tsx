import { useApp } from '../../app/store';
import { fmtClock, fmtDay } from '../../domain/format';
import { DAY_NAMES, minuteOfDay, nextRepeatArrive, repeatLabel, toggleDay, WEEK_ORDER } from '../../domain/repeat';
import './quick.css';

// 한 번만 울릴지, 고른 요일마다 다시 울릴지 정한다. 요일을 고르면 도착 날짜가 다음 그 요일로 맞춰진다
export function RepeatPicker() {
  const { plan, now, actions } = useApp();
  const days = plan.repeatDays ?? [];

  const toggle = (day: number) => {
    const next = toggleDay(days, day);
    const arriveAt = nextRepeatArrive(minuteOfDay(plan.arriveAt), next, now) ?? plan.arriveAt;
    actions.updatePlan({ repeatDays: next.length ? next : undefined, arriveAt });
  };

  return (
    <div className="q-block">
      <span className="f-label" id="repeat-label">
        반복
      </span>
      <div className="q-days" role="group" aria-labelledby="repeat-label">
        {WEEK_ORDER.map((d) => (
          <button key={d} type="button" className="q-day" aria-pressed={days.includes(d)} aria-label={`${DAY_NAMES[d]}요일`} onClick={() => toggle(d)}>
            {DAY_NAMES[d]}
          </button>
        ))}
      </div>
      <p className="f-status" aria-live="polite">
        {days.length === 0
          ? '한 번만 울려요. 요일을 고르면 그 요일마다 다시 울려요.'
          : `${repeatLabel(days)} 반복 · 다음은 ${fmtDay(plan.arriveAt)} ${fmtClock(plan.arriveAt)} · 도착을 기록하면 다음 알람이 자동으로 켜져요.`}
      </p>
    </div>
  );
}
