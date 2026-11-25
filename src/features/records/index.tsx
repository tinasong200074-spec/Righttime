import { useApp } from '../../app/store';
import { fmtClock, fmtMin } from '../../domain/format';
import { Card, HeroCard, Pill } from '../../ui';
import '../today/fields.css';
import { alarmCompare, averages, lastDays, placeStats, sameDay } from './model';
import './records.css';

function AlarmCard() {
  const { calc, plan, settings } = useApp();
  if (!calc) return null;
  const { before, after, diffMin } = alarmCompare(calc, plan, settings);
  const change = diffMin > 0 ? `알람이 ${diffMin}분 앞당겨져요` : diffMin < 0 ? `알람이 ${-diffMin}분 늦춰져요` : '알람 시각이 그대로예요';
  return (
    <HeroCard>
      <p className="ui-hero-label">기록을 반영하면</p>
      <p style={{ margin: '8px 0 0' }}>
        <span className="r-old" aria-label={`이전 알람 ${fmtClock(before)}`}>
          {fmtClock(before)}
        </span>
      </p>
      <p className="ui-hero-num" style={{ margin: 0 }}>
        {fmtClock(after)}
      </p>
      <p className="r-line">
        {change}. 입력값만으로 계산한 알람은 {fmtClock(before)}예요.
        <br />
        준비 시간은 {calc.prep.basis}, 기상 시간은 {calc.wake.basis}으로 잡았어요.
      </p>
    </HeroCard>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="r-stat">
      <span className="r-stat-num">{value}</span>
      <span className="r-stat-label">{label}</span>
    </div>
  );
}

function leaveStat(avg: number | null): { value: string; label: string } {
  if (avg === null) return { value: '-', label: '출발 시각' };
  if (Math.abs(avg) < 1) return { value: '정시', label: '목표 출발 시각에' };
  return { value: fmtMin(Math.abs(avg)), label: avg > 0 ? '목표보다 늦게 출발' : '목표보다 일찍 출발' };
}

function Averages() {
  const { records } = useApp();
  const a = averages(records);
  const leave = leaveStat(a.leave);
  return (
    <Card>
      <div className="f-grid3">
        <Stat value={fmtMin(a.wake)} label="기상 평균" />
        <Stat value={fmtMin(a.prep)} label="준비 평균" />
        <Stat {...leave} />
      </div>
      <p className="f-sub">기록 {a.count}회 기준이에요. 시연·제외한 기록은 빼요.</p>
    </Card>
  );
}

function PrepChart() {
  const { records, now } = useApp();
  const rows = lastDays(records);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.prepActual, r.userPrep)));
  return (
    <Card>
      <h2 className="f-title">최근 준비 시간</h2>
      <p className="f-sub">점선은 내가 입력한 예상 시간이에요.</p>
      <ul className="r-chart" aria-label="최근 준비 시간 막대 그래프">
        {rows.map((r) => {
          const d = new Date(r.date);
          return (
            <li key={r.id} className="r-col" aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 준비 ${Math.round(r.prepActual)}분, 예상 ${r.userPrep}분`}>
              <span className="r-val">{Math.round(r.prepActual)}</span>
              <span className="r-plot">
                <span className={`r-bar ${sameDay(r.date, now) ? 'is-today' : ''}`} style={{ height: `${(r.prepActual / max) * 100}%` }} />
                <span className="r-plan" style={{ bottom: `${(r.userPrep / max) * 100}%` }} />
              </span>
              <span className="r-day">
                {d.getMonth() + 1}/{d.getDate()}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function PlaceList() {
  const { records, places } = useApp();
  const stats = placeStats(records, places);
  if (stats.length === 0) return null;
  return (
    <Card>
      <h2 className="f-title">장소별 이동 평균</h2>
      <ul className="f-list">
        {stats.map((p) => (
          <li key={p.id} className="f-row" style={{ justifyContent: 'space-between' }}>
            <span>
              {p.name} <span className="f-unit">({p.count}회)</span>
            </span>
            <span>
              {p.input !== undefined && <span className="f-unit">입력 {p.input}분 → </span>}
              <strong>실제 평균 {fmtMin(p.actual)}</strong>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function RecordsScreen() {
  const { records } = useApp();
  const hasData = averages(records).count > 0;
  return (
    <div className="f-stack">
      <div className="f-row" style={{ justifyContent: 'space-between' }}>
        <h1 className="f-title" style={{ fontSize: '1.5rem' }}>기록</h1>
        {records.some((r) => r.sample) && <Pill tone="soft">샘플 데이터</Pill>}
      </div>
      <AlarmCard />
      {hasData ? (
        <>
          <Averages />
          <PrepChart />
          <PlaceList />
        </>
      ) : (
        <Card>
          <p className="f-sub">아직 쓸 수 있는 기록이 없어요. 아침 준비를 한 번 마치면 여기에 쌓여요. 설정에서 샘플 데이터를 넣어 미리 볼 수도 있어요.</p>
        </Card>
      )}
    </div>
  );
}
