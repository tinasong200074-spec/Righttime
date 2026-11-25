import { fmtClock } from '../../domain/format';
import type { PlanCalc } from '../../domain/schedule';
import { Card, FillBar, Icon, type IconName } from '../../ui';
import { timetableParts, toSegments } from './model';

interface RowProps {
  icon: IconName;
  name: string;
  note: string;
  time: number;
  accent?: boolean;
}

function Row({ icon, name, note, time, accent = false }: RowProps) {
  const bg = accent ? 'var(--accent)' : 'var(--chip)';
  return (
    <li className="t-row">
      <span className={`t-circle ${accent ? 'is-accent' : ''}`}>
        <Icon name={icon} main="var(--ink)" det={bg} />
      </span>
      <span className="f-grow">
        <span className="t-row-name">{name}</span>
        <span className="t-row-note">{note}</span>
      </span>
      <span className="t-big-time">{fmtClock(time)}</span>
    </li>
  );
}

// 기상 / 준비 / 출발 세 행과 시간표 막대
export function ScheduleCard({ calc }: { calc: PlanCalc }) {
  const parts = timetableParts(calc);
  const travelAll = calc.ride.val + calc.waitMin + calc.buffer;
  const leaveNote = `이동 ${calc.ride.val} + 배차 ${calc.waitMin} + 여유 ${calc.buffer} = ${travelAll}분 전`;

  return (
    <Card>
      <ul className="f-list">
        <Row icon="wake" name="기상" note={`평소 ${calc.wake.val}분 · ${calc.wake.basis}`} time={calc.alarmAt} />
        <Row icon="prep" name="준비" note={`${calc.prep.val}분 · ${calc.steps.length}단계 · ${calc.prep.basis}`} time={calc.prepStartAt} accent />
        <Row icon="leave" name="출발" note={leaveNote} time={calc.leaveAt} />
      </ul>
      <FillBar label="알람부터 도착까지 시간표" segments={toSegments(parts)} />
      <div className="t-times">
        <span>{fmtClock(calc.alarmAt)} 알람</span>
        <span>{fmtClock(calc.leaveAt)} 출발</span>
        <span>{fmtClock(calc.arriveAt)} 도착</span>
      </div>
      <p className="t-legend">{parts.map((p) => `${p.name} ${Math.round(p.min)}분`).join(' · ')}</p>
    </Card>
  );
}
