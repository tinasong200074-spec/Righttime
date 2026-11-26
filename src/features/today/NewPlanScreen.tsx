import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { overBy } from '../../domain/schedule';
import { RecentPlans } from '../recent/RecentPlans';
import './fields.css';
import { FriendPick } from './FriendPick';
import './main.css';
import { NumberField } from './NumberField';
import { PlaceField } from './PlaceField';
import { PlanFields } from './PlanCard';
import { PlanSummary } from './PlanSummary';
import './today.css';

// 알람이 켜진 약속이 있어도 이 탭에 들어오면 바로 새 약속을 적을 수 있게 한다.
// 켜 둔 약속은 대기 목록으로 잠깐 옮기고, 탭을 나가면(알람을 켰든 그만뒀든) 다시 줄을 세운다
function useKeepAdding(armedHere: boolean) {
  const { session, drafting, actions } = useApp();
  const canPark = session?.state === 'armed' && !session.demo;
  useEffect(() => {
    if (canPark && !drafting && !armedHere) actions.startNewPlan();
  }, [canPark, drafting, armedHere, actions]);
  // 탭을 나갈 때 정리한다. 개발 모드는 화면을 한 번 떼었다 다시 붙이므로, 바로 하지 않고 다시 붙으면 취소한다
  const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(leaving.current);
    return () => {
      leaving.current = setTimeout(actions.cancelDraft, 0);
    };
  }, [actions]);
}

// 맨 위 안내: 이미 잡아 둔 약속 수, 최근 일정에서 고르기. 진행 중이거나 시연 중이면 잠근다
function TopNotice({ locked }: { locked: boolean }) {
  const { drafting, editing, parked, recentPlans } = useApp();
  if (locked) {
    return (
      <section className="m-card">
        <p style={{ margin: 0 }}>진행 중인 일정이 있어서 지금은 새 약속을 잡을 수 없어요.</p>
      </section>
    );
  }
  return (
    <>
      {editing && <p className="m-note" style={{ margin: 0, textAlign: 'left' }}>잡아 둔 약속을 고치는 중이에요. 고친 뒤 아래 버튼을 눌러야 바뀌고, 그냥 나가면 원래대로 남아요.</p>}
      {!editing && drafting && parked.length > 0 && <p className="m-note" style={{ margin: 0, textAlign: 'left' }}>잡아 둔 약속 {parked.length}개는 그대로 있어요. 새 약속을 더 잡을 수 있어요.</p>}
      {recentPlans.length > 0 && (
        <section className="m-card">
          <RecentPlans />
        </section>
      )}
    </>
  );
}

// 준비 시간은 한 칸으로 받는다(단계를 세세하게 나누지 않는다).
// 기록이 있으면 실제로 걸린 시간으로 보정한 값을 아래에 추천하고, 누르면 그 값이 들어간다
function PrepField() {
  const { plan, calc, actions } = useApp();
  const total = Math.max(1, Math.round(plan.steps.reduce((a, s) => a + s.est, 0)));
  const set = (n: number) => actions.updatePlan({ steps: [{ id: 'prep', name: '준비', est: n }] });
  const rec = calc && calc.prep.n > 0 ? calc.prep : null;
  return (
    <section className="m-card">
      <NumberField label="준비 시간" value={total} min={1} max={480} onChange={set} />
      {rec && rec.val !== total && (
        <div className="ps-rec">
          <span>
            추천 <strong>{rec.val}분</strong> · {rec.basis}
          </span>
          <button type="button" className="f-btn" onClick={() => set(rec.val)}>
            {rec.val}분으로 넣기
          </button>
        </div>
      )}
      {rec && <p className="m-sub ps-note">알람은 내 기록으로 보정한 {rec.val}분으로 계산해요.</p>}
    </section>
  );
}

// 새 약속: 일정 이름, 시각(날짜·시각·요일 반복), 출발·도착, 준비 시간을 정하고 알람을 켠다
export function NewPlanScreen({ onDone }: { onDone: () => void }) {
  const { session, calc, now, editing, actions } = useApp();
  const [armedHere, setArmedHere] = useState(false);
  useKeepAdding(armedHere);
  const locked = session !== null && !armedHere;
  const padded = calc && calc.ride.n === 0 && calc.ride.basis !== '내 입력값';
  const over = calc ? overBy(calc, now) : 0; // 지금 시작해도 도착 시각을 넘기면 알람을 켜지 못하게 한다

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
        <FriendPick />
      </fieldset>
      {!locked && <PlanSummary />}
      <button type="button" className="m-cta" disabled={locked || !calc || calc.arriveAt <= now || over > 0} onClick={arm}>
        {editing ? '고친 대로 알람 켜기' : '알람 켜기'}
      </button>
      {over > 0 && !locked && (
        <p className="ps-over" role="alert">
          도착 시각보다 {over}분 넘어요. 준비 시간과 이동 시간을 더하면 지금 시작해도 늦어요. 도착 시각을 늦추거나 시간을 줄여 주세요.
        </p>
      )}
      {calc && calc.alarmAt <= now && over <= 0 && !locked && <p className="m-note">알람 시각이 이미 지났어요. 지금 바로 시작하면 맞출 수 있어요.</p>}
      {padded && !locked && <p className="m-note">처음 가는 시간대라 이동 시간을 넉넉하게 잡았어요({calc.ride.basis}). 알람이 울린 뒤 앱을 열면 다시 조회해요.</p>}
    </div>
  );
}
