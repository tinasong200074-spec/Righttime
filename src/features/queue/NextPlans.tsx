import { useApp } from '../../app/store';
import { fmtClock, fmtDay } from '../../domain/format';
import { Icon } from '../../ui';
import '../recent/recent.css';

// 알람을 켜 둔 다른 약속(대기 목록). 맨 앞 약속이 끝나면 위에서부터 차례로 올라온다
export function NextPlans() {
  const { parked, actions } = useApp();
  if (!parked || parked.length === 0) return null;
  return (
    <section className="m-card" aria-label="다음 약속">
      <h2 className="recent-title">다음 약속 · 알람 켜짐</h2>
      <ul className="recent-list">
        {parked.map((b) => {
          const name = b.session.title || b.session.placeName || '일정';
          return (
            <li key={b.id} className="recent-item">
              <div className="recent-pick">
                <span className="recent-tile">
                  <Icon name="clock" main="var(--ink)" det="var(--chip)" size={22} />
                </span>
                <span className="recent-text">
                  <strong>{name}</strong>
                  <span>
                    {fmtDay(b.session.arriveAt)} {fmtClock(b.session.arriveAt)} 도착 · 알람 {fmtClock(b.session.alarmAt)}
                  </span>
                </span>
              </div>
              <button type="button" className="recent-remove" aria-label={`${name} 약속 지우기`} onClick={() => actions.removeParked(b.id)}>
                지우기
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
