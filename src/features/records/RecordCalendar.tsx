import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtMin } from '../../domain/format';
import type { RecordRow } from '../../domain/types';
import { arriveText, dayMark, monthCells, type DayMark } from './model';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
// 색이 아니라 기호로 알린다. 이모지는 명세가 허용한 두 개만 쓴다
const MARK: Record<DayMark, { icon: string; label: string }> = {
  kept: { icon: '✅', label: '제시간에 도착' },
  late: { icon: '⏰', label: '지각' },
  none: { icon: '·', label: '도착 기록 없음' },
};

function DayDetail({ day, rows }: { day: Date; rows: RecordRow[] }) {
  return (
    <div className="r-detail" aria-live="polite">
      <h3>
        {day.getMonth() + 1}월 {day.getDate()}일
      </h3>
      {rows.length === 0 && <p className="m-muted">이 날은 기록이 없어요.</p>}
      {rows.map((r) => (
        <div key={r.id} className="r-detail-row">
          <span className="r-detail-mark" aria-hidden="true">
            {MARK[dayMark([r])].icon}
          </span>
          <div>
            <div className="m-name">
              {r.title || '일정'}
              {r.placeName ? ` · ${r.placeName} 도착` : ''}
            </div>
            <div className="m-sub">
              {arriveText(r)} · 알람 {r.snoozeCount}번 미룸 · 준비 {fmtMin(r.prepActual)}
              {r.travelActual !== undefined ? ` · 이동 ${fmtMin(r.travelActual)}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 한 달 달력. 날짜마다 제시간(✅)·지각(⏰)을 표시하고, 누르면 그날 일정을 보여 준다
export function RecordCalendar() {
  const { records, now } = useApp();
  const today = new Date(now);
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [picked, setPicked] = useState<number | null>(null);

  const rows = records.filter((r) => !r.demo);
  const rowsOf = (d: number) => rows.filter((r) => new Date(r.date).toDateString() === new Date(ym.y, ym.m, d).toDateString());
  const move = (step: number) => {
    const next = new Date(ym.y, ym.m + step, 1);
    setYm({ y: next.getFullYear(), m: next.getMonth() });
    setPicked(null);
  };

  return (
    <section className="m-card">
      <div className="r-cal-head">
        <button type="button" className="r-cal-nav" aria-label="이전 달" onClick={() => move(-1)}>
          ‹
        </button>
        <h2>
          {ym.y}년 {ym.m + 1}월
        </h2>
        <button type="button" className="r-cal-nav" aria-label="다음 달" onClick={() => move(1)}>
          ›
        </button>
      </div>
      <div className="r-cal" role="group" aria-label={`${ym.m + 1}월 기록 달력`}>
        {WEEK.map((w) => (
          <span key={w} className="r-cal-week" aria-hidden="true">
            {w}
          </span>
        ))}
        {monthCells(ym.y, ym.m).map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const dayRows = rowsOf(d);
          const mark = dayRows.length ? MARK[dayMark(dayRows)] : null;
          return (
            <button key={d} type="button" className="r-cal-day" aria-pressed={picked === d} aria-label={`${ym.m + 1}월 ${d}일${mark ? ` ${mark.label}` : ' 기록 없음'}`} onClick={() => setPicked(d)}>
              <span>{d}</span>
              <span className="r-cal-mark" aria-hidden="true">
                {mark?.icon ?? ''}
              </span>
            </button>
          );
        })}
      </div>
      <p className="m-muted r-cal-legend">✅ 제시간 · ⏰ 지각 · 날짜를 누르면 그날 일정이 나와요</p>
      {picked !== null && <DayDetail day={new Date(ym.y, ym.m, picked)} rows={rowsOf(picked)} />}
    </section>
  );
}
