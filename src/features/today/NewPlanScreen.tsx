import { useApp } from '../../app/store';
import './fields.css';
import './main.css';
import { PlaceField, PlanFields } from './PlanCard';
import { StepsEditor } from './StepsEditor';
import './today.css';

// 새 약속: 일정 이름, 시각(날짜·시각·요일 반복), 출발·도착, 준비 단계를 한곳에서 정하고 알람을 켠다
export function NewPlanScreen({ onDone }: { onDone: () => void }) {
  const { session, calc, now, actions } = useApp();
  const locked = session !== null;

  const arm = () => {
    actions.arm();
    onDone(); // 알람을 켜면 오늘 화면으로 간다
  };

  return (
    <div className="m-screen">
      <div className="m-titlerow">
        <h1 className="m-h1">새 약속</h1>
      </div>
      {locked && (
        <section className="m-card">
          <p style={{ margin: '0 0 8px' }}>알람이 켜져 있어서 고칠 수 없어요. 고치려면 알람을 끄세요.</p>
          <button type="button" className="f-btn" onClick={actions.cancelSession}>
            알람 끄기
          </button>
        </section>
      )}
      <fieldset className="f-fieldset" disabled={locked}>
        <PlanFields />
        <section className="m-card">
          <h2 className="f-title" style={{ marginBottom: 10 }}>
            출발 · 도착
          </h2>
          <PlaceField />
        </section>
        <StepsEditor />
      </fieldset>
      <button type="button" className="m-cta" disabled={locked || !calc || calc.arriveAt <= now} onClick={arm}>
        알람 켜기
      </button>
      {calc && calc.alarmAt <= now && !locked && <p className="m-note">알람 시각이 이미 지났어요. 도착 시각을 확인해 주세요.</p>}
    </div>
  );
}
