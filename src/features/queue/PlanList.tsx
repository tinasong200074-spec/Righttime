import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import type { Session } from '../../domain/types';
import { Icon, type IconName } from '../../ui';
import { dayLabel } from '../today/model';
import '../today/main.css';
import './plans.css';

interface Item {
  id: string;
  session: Session;
  off: () => void; // 이 약속의 알람을 끈다
}

function TimeRow({ icon, name, note, time, accent = false }: { icon: IconName; name: string; note: string; time: number; accent?: boolean }) {
  return (
    <div className="m-row">
      <span className={`m-circle ${accent ? 'is-accent' : ''}`}>
        <Icon name={icon} main="var(--ink)" det={accent ? 'var(--accent)' : 'var(--chip)'} size={24} />
      </span>
      <span className="m-grow">
        <div className="m-name">{name}</div>
        <div className="m-sub">{note}</div>
      </span>
      <span className="m-big">{fmtClock(time)}</span>
    </div>
  );
}

// 펼쳤을 때: 언제 시작하고, 언제 준비하고, 언제 나가야 하는지
function Times({ s, off }: { s: Session; off: () => void }) {
  const prep = Math.round(s.steps.reduce((a, x) => a + x.est, 0));
  return (
    <div className="pl-body">
      <TimeRow icon="wake" name="시작시간" note={`평소 ${Math.round(s.wakeMin)}분 뒤 준비 시작`} time={s.alarmAt} />
      <TimeRow icon="prep" name="준비" note={`${prep}분 · ${s.steps.length}단계`} time={s.prepStartPlanAt} accent />
      <TimeRow icon="leave" name="출발" note={`이동 ${Math.round(s.travelMin)}분 + 여유 ${s.buffer}분 전`} time={s.leaveAt} />
      <button type="button" className="m-ghost pl-off" onClick={off}>
        알람 끄기
      </button>
    </div>
  );
}

function PlanItem({ item, first, now }: { item: Item; first: boolean; now: number }) {
  const [open, setOpen] = useState(false);
  const s = item.session;
  const name = s.title || s.placeName || '일정';
  return (
    <li className="m-card pl-item">
      <button type="button" className="pl-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="m-grow">
          <span className="m-muted">
            {dayLabel(s.arriveAt, now)}
            {first ? ' · 다음 알람' : ''}
          </span>
          <span className="pl-title">{name}</span>
          <span className="m-sub">{s.title && s.placeName ? `${s.placeName} · ` : ''}알람 {fmtClock(s.alarmAt)}</span>
        </span>
        <span className="pl-arrive">
          <span className="m-muted">도착</span>
          <span className="pl-clock">{fmtClock(s.arriveAt)}</span>
        </span>
        <span className="pl-caret" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && <Times s={s} off={item.off} />}
    </li>
  );
}

// 잡아 둔 약속을 세로로 나열한다. 알람이 가장 이른 약속이 맨 위다. 누르면 시작·준비·출발 시각이 펼쳐진다
export function PlanList({ onNew }: { onNew: () => void }) {
  const { session, parked, now, actions } = useApp();
  const items: Item[] = [
    ...(session ? [{ id: 'front', session, off: actions.cancelSession }] : []),
    ...(parked ?? []).map((b) => ({ id: b.id, session: b.session, off: () => actions.removeParked(b.id) })),
  ];
  if (items.length === 0) {
    return (
      <section className="m-card pl-empty">
        <p>잡아 둔 약속이 없어요.</p>
        <button type="button" className="f-btn" onClick={onNew}>
          새 약속 잡기
        </button>
      </section>
    );
  }
  return (
    <ul className="pl-list" aria-label="잡아 둔 약속">
      {items.map((it, i) => (
        <PlanItem key={it.id} item={it} first={i === 0} now={now} />
      ))}
    </ul>
  );
}
