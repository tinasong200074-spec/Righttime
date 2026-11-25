import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { OutlineButton, Pill, PrimaryButton } from '../../ui';

// 하단 "알람 켜기". 웹이라 화면이 열려 있을 때만 울린다는 한계를 바로 알려 준다
export function ArmBar() {
  const { calc, session, now, actions } = useApp();

  if (session) {
    return (
      <div className="f-stack">
        <p>
          <Pill tone="accent">알람 켜짐 · {fmtClock(session.alarmAt)}</Pill>
        </p>
        <OutlineButton onClick={actions.cancelSession}>알람 끄기</OutlineButton>
      </div>
    );
  }

  const past = calc ? calc.alarmAt <= now : false;
  return (
    <div className="f-stack">
      <PrimaryButton disabled={!calc || calc.arriveAt <= now} onClick={actions.arm}>
        알람 켜기
      </PrimaryButton>
      <p className="f-sub">
        {calc ? `알람은 ${fmtClock(calc.alarmAt)}에 울려요. ` : ''}
        {past ? '알람 시각이 이미 지났어요. 도착 시각을 확인해 주세요. ' : ''}
        웹 앱이라 화면이 열려 있을 때만 울려요.
      </p>
    </div>
  );
}
