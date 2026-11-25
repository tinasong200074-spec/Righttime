import { fmtClock, fmtHMS } from '../../domain/format';
import { useApp } from '../../app/store';
import { FillBar, HeroCard, OutlineButton, Pill, PrimaryButton, StageBar } from '../../ui';
import { wakeBar, wakeStartAt } from './progress';

// ② 기상(알람). 울린 뒤 지난 시간을 잰다. 미루는 동안에도 계속 잰다.
export function Wake() {
  const { session: s, now, settings, actions } = useApp();
  if (!s) return null;
  const start = wakeStartAt(s);
  const bar = wakeBar(s, now);
  const isSnoozed = s.state === 'snoozed';

  return (
    <>
      <StageBar current="wake" />
      <HeroCard>
        <p className="ui-hero-label">{fmtClock(start)} 알람</p>
        <p className="ui-hero-num" aria-label="알람이 울린 뒤 지난 시간">
          {fmtHMS(now - start)}
        </p>
        <p className="ui-hero-label">
          {isSnoozed && s.nextRingAt !== undefined ? `다음 알람 ${fmtClock(s.nextRingAt)}` : '일어날 시간이에요'}
          {s.snoozeCount > 0 && <Pill tone="dark">미룬 횟수 {s.snoozeCount}회</Pill>}
        </p>
        <FillBar segments={bar.segments} progress={bar.progress} label="알람 시각에서 평소 준비 시작 시각까지 진행" />
        <div className="morning-axis">
          <span>{fmtClock(start)} 알람</span>
          <span>평소 {fmtClock(s.prepStartPlanAt)} 시작</span>
        </div>
      </HeroCard>
      <p className="morning-note">미루는 동안에도 시간이 재져요. 준비를 시작한 순간까지가 기상 시간으로 기록돼요.</p>
      <div className="morning-actions">
        <PrimaryButton onClick={actions.startPrep}>{isSnoozed ? '준비 시작했어요' : '알람 끄고 준비 시작'}</PrimaryButton>
        {!isSnoozed && <OutlineButton onClick={actions.snooze}>{settings.snooze}분 더</OutlineButton>}
      </div>
    </>
  );
}
