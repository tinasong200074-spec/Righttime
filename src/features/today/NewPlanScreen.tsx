import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { RecentPlans } from '../recent/RecentPlans';
import './fields.css';
import './main.css';
import { NumberField } from './NumberField';
import { PlaceField } from './PlaceField';
import { PlanFields } from './PlanCard';
import './today.css';

// 알람이 켜진 약속이 있어도 이 탭에 들어오면 바로 새 약속을 적을 수 있게 한다.
// 켜 둔 약속은 대기 목록으로 잠깐 옮기고, 탭을 나가면(알람을 켰든 그만뒀든) 다시 줄을 세운다
function useKeepAdding(armedHere: boolean) {
  const { session, drafting, actions } = useApp();
  const canPark = session?.state === 'armed' && !session.demo;
  useEffect(() => {
    if (canPark && !drafting && !armedHere) actions.startNewPlan();
  }, [canPark, drafting, armedHere, actions]);
  useEffect(() => () => actions.cancelDraft(), [actions]);
}

// 맨 위 안내: 이미 잡아 둔 약속 수, 최근 일정에서 고르기. 진행 중이거나 시연 중이면 잠근다
function TopNotice({ locked }: { locked: boolean }) {
  const { drafting, parked, recentPlans } = useApp();
  if (locked) {
    return (
      <section className="m-card">
        <p style={{ margin: 0 }}>진행 중인 일정이 있어서 지금은 새 약속을 잡을 수 없어요.</p>
      </section>
    );
  }
  return (
    <>
      {drafting && parked.length > 0 && <p className="m-note" style={{ margin: 0, textAlign: 'left' }}>잡아 둔 약속 {parked.length}개는 그대로 있어요. 새 약속을 더 잡을 수 있어요.</p>}
      {recentPlans.length > 0 && (
        <section className="m-card">
          <RecentPlans />
        </section>
      )}
    </>
  );
}

// 준비 시간은 한 칸으로 받는다(단계를 세세하게 나누지 않는다)
function PrepField() {
  const { plan, actions } = useApp();
  const total = Math.max(1, Math.round(plan.steps.reduce((a, s) => a + s.est, 0)));
  return (
    <section className="m-card">
      <NumberField label="준비 시간" value={total} min={1} max={480} onChange={(n) => actions.updatePlan({ steps: [{ id: 'prep', name: '준비', est: n }] })} />
    </section>
  );
}

// 새 약속: 일정 이름, 시각(날짜·시각·요일 반복), 출발·도착, 준비 시간을 정하고 알람을 켠다
export function NewPlanScreen({ onDone }: { onDone: () => void }) {
  const { session, calc, now, actions } = useApp();
  const [armedHere, setArmedHere] = useState(false);
  useKeepAdding(armedHere);
  const locked = session !== null && !armedHere;
  const padded = calc && calc.ride.n === 0 && calc.ride.basis !== '내 입력값';

  const arm = () => {
    setArmedHere(true);
    actions.arm();
    onDone(); // 알람을 켜면 오늘 화면으로 간다
  };

  return (
    <div className="m-screen">
      <div className="m-titlerow">
        <h1 className="m-h1">새 약속</h1>
      </div>
      <TopNotice locked={locked} />
      <fieldset className="f-fieldset" disabled={locked}>
        <PlanFields />
        <section className="m-card">
          <h2 className="f-title" style={{ marginBottom: 10 }}>
            출발 · 도착
          </h2>
          <PlaceField />
        </section>
        <PrepField />
      </fieldset>
      <button type="button" className="m-cta" disabled={locked || !calc || calc.arriveAt <= now} onClick={arm}>
        알람 켜기
      </button>
      {calc && calc.alarmAt <= now && !locked && <p className="m-note">알람 시각이 이미 지났어요. 도착 시각을 확인해 주세요.</p>}
      {padded && !locked && <p className="m-note">처음 가는 시간대라 이동 시간을 넉넉하게 잡았어요({calc.ride.basis}). 알람이 울린 뒤 앱을 열면 다시 조회해요.</p>}
    </div>
  );
}
