import { fmtClock, fmtHMS, fmtMin } from '../../domain/format';
import { MIN, type Session } from '../../domain/types';
import { useApp } from '../../app/store';
import { FillBar, HeroCard, Icon, Pill, PrimaryButton, StageBar } from '../../ui';
import { fmtTimer, prepBar, prepElapsedMs, stepElapsedMs, stepOverMin, wakeStartAt } from './progress';

function StepList({ s, now }: { s: Session; now: number }) {
  const over = stepOverMin(s, now);
  return (
    <section className="ui-card morning-steps-card">
      <ol className="morning-steps" aria-label="준비 단계">
        {s.steps.map((step, i) => {
          const log = s.log[i];
          const isNow = i === s.stepIdx;
          return (
            <li key={step.id} className={i < s.stepIdx ? 'is-done' : isNow ? 'is-now' : ''} aria-current={isNow ? 'step' : undefined}>
              {i < s.stepIdx && (
                <span className="morning-done" aria-hidden="true">
                  <Icon name="check" main="#fff" size={14} />
                </span>
              )}
              {isNow && <span className="morning-dot" aria-hidden="true" />}
              {i > s.stepIdx && <span className="morning-empty" aria-hidden="true" />}
              <span className="morning-step-name">{step.name}</span>
              <span>
                {i < s.stepIdx && (log?.act == null ? '건너뜀' : fmtMin(log.act))}
                {isNow && fmtHMS(stepElapsedMs(s, now))}
                {i > s.stepIdx && `예상 ${fmtMin(step.est)}`}
              </span>
              {isNow && over > 0 && (
                <span className="morning-over" role="status">
                  <Pill tone="chip">예상보다 {Math.ceil(over)}분 지났어요</Pill>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

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
  const { session: s, now, actions } = useApp();
  if (!s) return null;
  const bar = prepBar(s, now);
  const prepMin = prepElapsedMs(s, now) / MIN;

  return (
    <>
      <StageBar current="prep" notes={{ wake: fmtMin(s.latency ?? 0), prep: fmtMin(prepMin), leave: fmtClock(s.leaveAt) }} />
      <HeroCard>
        <div className="morning-head">
          <span className="morning-head-label">준비 · {s.steps[s.stepIdx]?.name}</span>
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
      <StepList s={s} now={now} />
      <div className="morning-actions">
        <PrimaryButton onClick={actions.completeStep}>다 했어요</PrimaryButton>
      </div>
    </>
  );
}
