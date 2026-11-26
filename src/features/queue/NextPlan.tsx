import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { dayLabel } from '../today/model';
import '../today/main.css';
import './plans.css';

// 가장 급한 일정 말고 나머지 약속은 그 아래에 작게 세로로 나열한다
function RestList() {
  const { parked, now, actions } = useApp();
  const rest = parked ?? [];
  if (rest.length === 0) return null;
  return (
    <ul className="np-rest" aria-label="그다음 약속">
      {rest.map((b) => (
        <li key={b.id}>
          <span className="np-rest-name">{b.session.title || b.session.placeName || '일정'}</span>
          <span className="np-rest-time">
            {dayLabel(b.session.arriveAt, now)} {fmtClock(b.session.arriveAt)} 도착 · 알람 {fmtClock(b.session.alarmAt)}
          </span>
          <button type="button" className="np-del" onClick={() => actions.removeParked(b.id)}>
            삭제
          </button>
        </li>
      ))}
    </ul>
  );
}

// 오늘 화면 맨 위: 가장 곧 시작될 일정 하나만 크게 보여 준다(이름, 도착 시각, 시작시간).
// 뒤에 잡아 둔 약속은 이 일정이 끝나면 차례로 올라온다
export function NextPlan({ onNew }: { onNew: () => void }) {
  const { session: s, now, actions } = useApp();
  if (!s) {
    return (
      <section className="m-card np-empty">
        <p>잡아 둔 약속이 없어요.</p>
        <button type="button" className="f-btn" onClick={onNew}>
          새 약속 잡기
        </button>
      </section>
    );
  }
  return (
    <>
      <section className="np" aria-label="곧 있을 일정">
        <p className="np-day">{dayLabel(s.arriveAt, now)} · 곧 있을 일정</p>
        <h2 className="np-title">{s.title || s.placeName || '일정'}</h2>
        <dl className="np-times">
          <div>
            <dt>도착</dt>
            <dd>{fmtClock(s.arriveAt)}</dd>
          </div>
          <div className="is-wake">
            <dt>시작시간(알람)</dt>
            <dd>{fmtClock(s.alarmAt)}</dd>
          </div>
        </dl>
        <div className="np-foot">
          <span />
          <button type="button" className="np-del" onClick={actions.cancelSession}>
            일정 삭제
          </button>
        </div>
      </section>
      <RestList />
    </>
  );
}
