import { fmtClock, fmtHMS, fmtMin } from '../../domain/format';
import { MIN, type Session } from '../../domain/types';
import { useApp } from '../../app/store';
import { Card, FillBar, HeroCard, Icon, OutlineButton, Pill, PrimaryButton, StageBar } from '../../ui';
import { NotifyCard } from '../notify';
import { prepBar, prepElapsedMs, stepElapsedMs, stepOverMin, wakeStartAt } from './progress';

function StepList({ s, now }: { s: Session; now: number }) {
  const over = stepOverMin(s, now);
  return (
    <Card>
      <ol className="morning-steps" aria-label="준비 단계">
        {s.steps.map((step, i) => {
          const log = s.log[i];
          if (i < s.stepIdx) {
            return (
              <li key={step.id} className="is-done">
                <Icon name="check" main="var(--ink)" size={20} />
                <span>{step.name}</span>
                <span>{log?.act == null ? '건너뜀' : fmtMin(log.act)}</span>
              </li>
            );
          }
          if (i === s.stepIdx) {
            return (
              <li key={step.id} className="is-now" aria-current="step">
                <span className="morning-dot" aria-hidden="true" />
                <span>{step.name}</span>
                <span>{fmtHMS(stepElapsedMs(s, now))}</span>
                {over > 0 && (
                  <span className="morning-over" role="status">
                    <Pill tone="chip">예상보다 {Math.ceil(over)}분 지났어요</Pill>
                  </span>
                )}
              </li>
            );
          }
          return (
            <li key={step.id}>
              <span className="morning-empty" aria-hidden="true" />
              <span>{step.name}</span>
              <span>예상 {fmtMin(step.est)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
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
  const step = s.steps[s.stepIdx];
  const bar = prepBar(s, now);
  const start = wakeStartAt(s);

  return (
    <>
      <StageBar
        current="prep"
        notes={{ wake: fmtMin(s.latency ?? 0), prep: '지금', leave: fmtClock(s.leaveAt) }}
      />
      <HeroCard>
        <p className="ui-hero-label">
          준비 · {step?.name} <Pill tone="dark">기록 중</Pill>
        </p>
        <p className="ui-hero-num" aria-label="준비한 시간">
          {fmtHMS(prepElapsedMs(s, now))}
        </p>
        <p className="ui-hero-label">준비한 시간</p>
        <FillBar segments={bar.segments} progress={bar.progress} label="기상과 준비로 지난 시간" />
        <div className="morning-axis">
          <span>{fmtClock(start)}</span>
          <span>{fmtClock(s.prepStartAt ?? now)}</span>
          <span>지금 {fmtClock(now)}</span>
          <span>{fmtClock(s.leaveAt)} 출발</span>
        </div>
        <Stats s={s} now={now} />
      </HeroCard>
      <StepList s={s} now={now} />
      <div className="morning-actions">
        <PrimaryButton onClick={actions.completeStep}>다 했어요</PrimaryButton>
        <OutlineButton onClick={actions.skipStep}>이 단계 건너뛰기</OutlineButton>
      </div>
      <NotifyCard />
    </>
  );
}
