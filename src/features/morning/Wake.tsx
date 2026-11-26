import { fmtClock, fmtMin } from '../../domain/format';
import { MIN } from '../../domain/types';
import { useApp } from '../../app/store';
import { FillBar, HeroCard, Icon, OutlineButton, Pill, PrimaryButton, StageBar } from '../../ui';
import { fmtTimer, leavePillText, wakeBar, wakeStartAt } from './progress';

// ② 시작시간(알람). 큰 숫자는 출발까지 남은 시간이다. 울린 뒤 지난 시간은 작게 보이고, 미루는 동안에도 계속 잰다.
export function Wake() {
  const { session: s, now, settings, actions } = useApp();
  if (!s) return null;
  const start = wakeStartAt(s);
  const bar = wakeBar(s, now);
  const isSnoozed = s.state === 'snoozed';

  return (
    <>
      <StageBar
        current="wake"
        notes={{ wake: fmtMin((now - start) / MIN), prep: fmtClock(s.prepStartPlanAt), leave: fmtClock(s.leaveAt) }}
      />
      <HeroCard>
        <div className="morning-head">
          <span className="morning-head-label">
            <Icon name="bell" main="var(--on-dark)" det="var(--on-dark)" size={18} />
            출발까지
          </span>
          <Pill tone="dark">{leavePillText(s.leaveAt, now, settings.preLeave)}</Pill>
        </div>
        <p className="ui-hero-num" aria-label="출발까지 남은 시간">
          {fmtTimer(s.leaveAt - now)}
        </p>
        <p className="ui-hero-label">
          {fmtClock(s.leaveAt)} 출발 · 알람 후 {fmtMin((now - start) / MIN)} 지남
        </p>
        <FillBar segments={bar.segments} progress={bar.progress} label="알람 시각에서 평소 준비 시작 시각까지 진행" />
        <div className="morning-axis">
          <span>{fmtClock(start)} 알람</span>
          <span>평소 {fmtClock(s.prepStartPlanAt)} 시작</span>
        </div>
      </HeroCard>
      {isSnoozed && s.nextRingAt !== undefined && (
        <p className="morning-note" role="status">
          미룬 횟수 {s.snoozeCount}회 · 다음 알람 {fmtClock(s.nextRingAt)}
        </p>
      )}
      <div className="morning-actions">
        <PrimaryButton onClick={actions.startPrep}>{isSnoozed ? '준비 시작했어요' : '알람 끄고 준비 시작'}</PrimaryButton>
        {!isSnoozed && <OutlineButton onClick={actions.snooze}>{settings.snooze}분 더</OutlineButton>}
      </div>
    </>
  );
}
