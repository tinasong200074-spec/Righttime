import { fmtClock, fmtHMS, fmtMin } from '../../domain/format';
import { useApp } from '../../app/store';
import { Card, HeroCard, Icon, Pill, PrimaryButton, StageBar } from '../../ui';
import { NotifyCard } from '../notify';
import { Checklist } from './Checklist';
import { leavePillText, prepElapsedMs } from './progress';
import { MIN } from '../../domain/types';

// ④ 출발. 출발 시각이 지나도 "출발했어요"를 누를 때까지 카운트다운이 0에서 멈추고 조명은 유지된다.
export function Depart() {
  const { session: s, now, settings, weather, demo, actions } = useApp();
  if (!s) return null;

  return (
    <>
      <StageBar
        current="leave"
        notes={{ wake: fmtMin(s.latency ?? 0), prep: fmtMin(prepElapsedMs(s, now) / MIN), leave: '지금' }}
      />
      <HeroCard>
        <p className="ui-hero-label">
          출발까지 <Pill tone="dark">{leavePillText(s.leaveAt, now, settings.preLeave)}</Pill>
        </p>
        <p className="ui-hero-num" aria-label="출발까지 남은 시간">
          {fmtHMS(s.leaveAt - now)}
        </p>
        <p className="ui-hero-label">출발 목표 {fmtClock(s.leaveAt)}</p>
      </HeroCard>
      <Card>
        <div className="morning-weather">
          <Icon name={weather?.rain ? 'rain' : 'temp'} main="var(--ink)" det="var(--ink)" size={28} />
          <p>{weather?.ok ? weather.line : demo ? '시연 중에는 날씨를 불러오지 않아요.' : '날씨 정보가 없어요.'}</p>
        </div>
      </Card>
      <Checklist />
      <NotifyCard />
      <div className="morning-actions">
        <PrimaryButton onClick={actions.depart}>출발했어요</PrimaryButton>
      </div>
    </>
  );
}
