import { useApp } from '../../app/store';
import { fmtClock, fmtMin } from '../../domain/format';
import { Icon, type IconName } from '../../ui';
import '../today/fields.css';
import '../today/main.css';
import { alarmCompare, averages, insights, type Insight } from './model';
import { RecordCalendar } from './RecordCalendar';
import './records.css';

function AlarmCard() {
  const { calc, plan, settings } = useApp();
  if (!calc) return null;
  const { before, after, diffMin } = alarmCompare(calc, plan, settings);
  const change = diffMin > 0 ? `알람이 ${diffMin}분 빨라요` : diffMin < 0 ? `알람이 ${-diffMin}분 늦어요` : '알람 시각이 그대로예요';
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
      <Stat value={fmtMin(a.wake)} label="시작시간 평균" />
      <Stat value={fmtMin(a.prep)} label="준비 평균" />
      <Stat value={signed(a.leave)} label="출발 평균" />
    </section>
  );
}

const TILE_ICON: Record<Insight['key'], IconName> = { arrive: 'check', snooze: 'bell', wake: 'wake', prep: 'prep', leave: 'leave' };
const TONE_MARK: Record<Insight['tone'], string> = { good: '✓', warn: '!', flat: '' };

function Tile({ t }: { t: Insight }) {
  return (
    <li className={`r-tile is-${t.tone}`}>
      <span className="r-tile-top">
        <Icon name={TILE_ICON[t.key]} size={22} main="currentColor" det={t.tone === 'warn' ? 'var(--ink)' : 'var(--surface)'} />
        {TONE_MARK[t.tone] && (
          <span className="r-tile-mark" aria-hidden="true">
            {TONE_MARK[t.tone]}
          </span>
        )}
      </span>
      <span className="r-tile-num">{t.value}</span>
      <span className="r-tile-label">{t.label}</span>
    </li>
  );
}

// 기록을 한눈에: 큰 숫자 타일, 최근 도착 결과 줄, 가장 효과가 큰 한 가지
function Insights() {
  const { records } = useApp();
  const view = insights(records);
  if (!view) return null;
  return (
    <section className="m-card">
      <div className="r-chart-head">
        <h2>내 기록을 보면</h2>
        {view.trail.length > 0 && (
          <span className="r-trail" aria-label={`최근 도착 ${view.trail.map((t) => (t === 'kept' ? '제시간' : '지각')).join(', ')}`}>
            {view.trail.map((t, i) => (
              <span key={i} aria-hidden="true">
                {t === 'kept' ? '✅' : '⏰'}
              </span>
            ))}
          </span>
        )}
      </div>
      <ul className="r-tiles">
        {view.tiles.map((t) => (
          <Tile key={t.key} t={t} />
        ))}
      </ul>
      {view.tip && <p className="r-tip">{view.tip}</p>}
    </section>
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
          <Insights />
          <Averages />
          <RecordCalendar />
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
