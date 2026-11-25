import { fmtClock, fmtHMS, fmtMin } from '../../domain/format';
import { MIN, type Session } from '../../domain/types';
import { useApp } from '../../app/store';
import { FillBar, HeroCard, Pill, PrimaryButton, StageBar } from '../../ui';
import { fmtTimer, prepBar, prepElapsedMs, wakeStartAt } from './progress';

function Stats({ s, now }: { s: Session; now: number }) {
  return (
    <dl className="morning-stats">
      <div>
        <dt>기상</dt>
        <dd>{fmtMin(s.latency ?? 0)}</dd>
      </div>
      <div>
        <dt>준비</dt>
        <dd className="is-accent">{fmtMin(prepElapsedMs(s, now) / MIN)}</dd>
      </div>
      <div>
        <dt>출발까지</dt>
        <dd>{fmtHMS(s.leaveAt - now)}</dd>
      </div>
    </dl>
  );
}

// ③ 준비. 막대는 장식이 아니라 실제 경과에 맞춰 움직인다.
export function Prep() {
  const { session: s, now, settings, actions } = useApp();
  if (!s) return null;
  const bar = prepBar(s, now);
  const prepMin = prepElapsedMs(s, now) / MIN;

  return (
    <>
      <StageBar current="prep" notes={{ wake: fmtMin(s.latency ?? 0), prep: fmtMin(prepMin), leave: fmtClock(s.leaveAt) }} />
      <HeroCard>
        <div className="morning-head">
          <span className="morning-head-label">준비 중</span>
          <Pill tone="dark">
            <span className="morning-live" aria-hidden="true" />
            기록 중
          </Pill>
        </div>
        <p className="ui-hero-num" aria-label="준비한 시간">
          {fmtTimer(prepElapsedMs(s, now))}
        </p>
        <p className="ui-hero-label">준비한 시간</p>
        <FillBar segments={bar.segments} progress={bar.progress} label="기상과 준비로 지난 시간" />
        <div className="morning-axis">
          <span>{fmtClock(wakeStartAt(s))}</span>
          <span>{fmtClock(s.prepStartAt ?? now)}</span>
          <b>지금 {fmtClock(now)}</b>
          <span>{fmtClock(s.leaveAt)} 출발</span>
        </div>
        <Stats s={s} now={now} />
      </HeroCard>
      <p className="morning-note">출발 30분 전, 15분 전, {settings.preLeave}분 전에 알려 드려요. 준비 내용은 따로 적지 않아도 돼요.</p>
      <div className="morning-actions">
        <PrimaryButton onClick={actions.finishEarly}>준비 끝났어요</PrimaryButton>
      </div>
    </>
  );
}
