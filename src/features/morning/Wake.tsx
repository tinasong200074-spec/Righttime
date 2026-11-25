import { fmtClock, fmtMin } from '../../domain/format';
import { MIN } from '../../domain/types';
import { useApp } from '../../app/store';
import { FillBar, HeroCard, Icon, OutlineButton, Pill, PrimaryButton, StageBar } from '../../ui';
import { fmtTimer, wakeBar, wakeStartAt } from './progress';

// ② 기상(알람). 울린 뒤 지난 시간을 잰다. 미루는 동안에도 계속 잰다.
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
            {fmtClock(start)} 알람
          </span>
          <Pill tone="dark">
            <span className="morning-live" aria-hidden="true" />
            기록 중
          </Pill>
        </div>
        <p className="ui-hero-num" aria-label="알람이 울린 뒤 지난 시간">
          {fmtTimer(now - start)}
        </p>
        <p className="ui-hero-label">알람 후 지난 시간</p>
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
