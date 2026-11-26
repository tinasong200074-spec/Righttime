import { useApp } from '../../app/store';
import { fmtClock, fmtMin } from '../../domain/format';
import { Icon } from '../../ui';
import '../today/fields.css';
import '../today/main.css';
import { alarmCompare, averages, lastDays, placeStats } from './model';
import './records.css';

function AlarmCard() {
  const { calc, plan, settings } = useApp();
  if (!calc) return null;
  const { before, after, diffMin } = alarmCompare(calc, plan, settings);
  const change = diffMin > 0 ? `알람이 ${diffMin}분 앞당겨져요` : diffMin < 0 ? `알람이 ${-diffMin}분 늦춰져요` : '알람 시각이 그대로예요';
  return (
    <section className="r-hero">
      <div className="r-hero-label">기록을 반영하면</div>
      <div className="r-hero-row">
        <span className="r-old" aria-label={`이전 알람 ${fmtClock(before)}`}>
          {fmtClock(before)}
        </span>
        <span className="r-new">{fmtClock(after)}</span>
      </div>
      <div className="r-hero-sub">{change}</div>
    </section>
  );
}

const signed = (n: number | null) => (n === null ? '-' : `${n > 0 ? '+' : ''}${Math.round(n)}분`);

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="r-stat-num">{value}</div>
      <div className="r-stat-label">{label}</div>
    </div>
  );
}

function Averages() {
  const { records } = useApp();
  const a = averages(records);
  return (
    <section className="m-card r-stats">
      <Stat value={fmtMin(a.wake)} label="시작시간" />
      <Stat value={fmtMin(a.prep)} label="준비" />
      <Stat value={signed(a.leave)} label="출발 시각" />
    </section>
  );
}

const PX_PER_MIN = 2.143; // 목업 비율: 63분 = 135px
const CHART_PX = 170;

function PrepChart() {
  const { records } = useApp();
  const rows = lastDays(records);
  const plan = rows[rows.length - 1]?.userPrep ?? 0;
  const maxVal = Math.max(1, plan, ...rows.map((r) => r.prepActual));
  const px = Math.min(PX_PER_MIN, (CHART_PX - 10) / maxVal);
  return (
    <section className="m-card" style={{ paddingBottom: 12 }}>
      <div className="r-chart-head">
        <h2>준비 시간</h2>
        <span className="m-muted">최근 7일 · 점선은 내 예상 {plan}분</span>
      </div>
      <ul className="r-chart" aria-label={`최근 준비 시간 막대 그래프. 내 예상은 ${plan}분`}>
        {rows.map((r, i) => {
          const d = new Date(r.date);
          return (
            <li key={r.id} className="r-col" aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 준비 ${Math.round(r.prepActual)}분`}>
              <span className={`r-bar ${i === rows.length - 1 ? 'is-last' : ''}`} style={{ height: r.prepActual * px }} />
            </li>
          );
        })}
        <span className="r-plan" style={{ bottom: plan * px }} />
      </ul>
      <ul className="r-days" aria-hidden="true">
        {rows.map((r, i) => (
          <li key={r.id} className={i === rows.length - 1 ? 'is-last' : ''}>
            {new Date(r.date).getDate()}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlaceList() {
  const { records, places } = useApp();
  return (
    <>
      {placeStats(records, places).map((p) => (
        <section key={p.id} className="m-card r-place">
          <span className="r-place-icon">
            <Icon name="place" main="var(--ink)" det="var(--chip)" size={24} />
          </span>
          <div>
            <div className="m-name">{p.name}</div>
            <div className="m-sub">
              이동 평균 {fmtMin(p.actual)}
              {p.input !== undefined && ` · 입력 ${p.input}분`}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

export function RecordsScreen() {
  const { records } = useApp();
  const hasData = averages(records).count > 0;
  return (
    <div className="m-screen">
      <div className="m-titlerow">
        <h1 className="m-h1">기록</h1>
        {records.some((r) => r.sample) && <span className="m-pill">샘플 데이터</span>}
      </div>
      <AlarmCard />
      {hasData ? (
        <>
          <Averages />
          <PrepChart />
          <PlaceList />
        </>
      ) : (
        <section className="m-card">
          <p className="f-sub" style={{ margin: 0 }}>
            아직 쓸 수 있는 기록이 없어요. 아침 준비를 한 번 마치면 여기에 쌓여요. 설정에서 샘플 데이터를 넣어 미리 볼 수도 있어요.
          </p>
        </section>
      )}
    </div>
  );
}
