import { useApp } from '../../app/store';
import './fields.css';
import './main.css';
import { PlaceField, PlanFields } from './PlanCard';
import { StepsEditor } from './StepsEditor';
import './today.css';

// 새 약속: 일정 이름, 시각(날짜·시각·요일 반복), 출발·도착, 준비 단계를 한곳에서 정하고 알람을 켠다
export function NewPlanScreen({ onDone }: { onDone: () => void }) {
  const { session, calc, now, drafting, parked, actions } = useApp();
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
          <p style={{ margin: '0 0 8px' }}>알람이 켜진 약속이 있어요. 그대로 두고 새 약속을 더 잡을 수 있어요.</p>
          <div className="f-chips">
            <button type="button" className="f-btn" onClick={actions.startNewPlan}>
              새 약속 추가하기
            </button>
            <button type="button" className="f-btn" onClick={actions.cancelSession}>
              알람 끄기
            </button>
          </div>
        </section>
      )}
      {drafting && (
        <section className="m-card">
          <p style={{ margin: '0 0 8px' }}>약속 {parked.length}개는 알람이 켜진 채로 기다리고 있어요. 아래에 새 약속을 적어 주세요.</p>
          <button type="button" className="f-btn" onClick={actions.cancelDraft}>
            그만두고 돌아가기
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
        {drafting ? '약속 추가하고 알람 켜기' : '알람 켜기'}
      </button>
      {calc && calc.alarmAt <= now && !locked && <p className="m-note">알람 시각이 이미 지났어요. 도착 시각을 확인해 주세요.</p>}
    </div>
  );
}
