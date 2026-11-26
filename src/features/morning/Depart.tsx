import { fmtClock, fmtMin } from '../../domain/format';
import { MIN } from '../../domain/types';
import { useApp } from '../../app/store';
import { HeroCard, Icon, Pill, PrimaryButton, StageBar } from '../../ui';
import { fmtTimer, leavePillText, prepElapsedMs, weatherParts } from './progress';

// 날씨 카드. 아이콘 타일 + 제목 + 설명(체감·강수·챙길 것)
function WeatherCard() {
  const { weather, checklist, demo } = useApp();
  if (!weather?.ok) {
    return <p className="morning-note">{demo ? '시연 중에는 날씨를 불러오지 않아요.' : '날씨 정보가 없어요.'}</p>;
  }
  const items = checklist.filter((c) => c.src === 'weather').map((c) => c.text);
  const { title, detail } = weatherParts(weather.line, items);
  return (
    <section className="ui-card morning-weather">
      <span className="morning-tile" aria-hidden="true">
        <Icon name={weather.rain ? 'rain' : 'temp'} main="var(--ink)" det="var(--ink)" size={28} />
      </span>
      <div>
        <p className="morning-weather-title">{title}</p>
        <p className="morning-weather-detail">{detail}</p>
      </div>
    </section>
  );
}

// ④ 출발. 출발 시각이 지나도 "출발했어요"를 누를 때까지 카운트다운은 0에서 멈추고 조명은 유지된다.
export function Depart() {
  const { session: s, now, settings, actions } = useApp();
  if (!s) return null;

  return (
    <>
      <StageBar
        current="leave"
        notes={{ wake: fmtMin(s.latency ?? 0), prep: fmtMin(prepElapsedMs(s, now) / MIN), leave: fmtClock(s.leaveAt) }}
      />
      <HeroCard>
        <div className="morning-head">
          <span className="morning-head-label">출발까지</span>
          <Pill tone="dark">
            <span className="morning-live" aria-hidden="true" />
            {leavePillText(s.leaveAt, now, settings.preLeave)}
          </Pill>
        </div>
        <p className="ui-hero-num" aria-label="출발까지 남은 시간">
          {fmtTimer(s.leaveAt - now)}
        </p>
      </HeroCard>
      <WeatherCard />
      <div className="morning-actions">
        <PrimaryButton onClick={actions.depart}>출발했어요</PrimaryButton>
      </div>
    </>
  );
}
