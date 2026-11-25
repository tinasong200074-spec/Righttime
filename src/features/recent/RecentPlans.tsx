import { useApp } from '../../app/store';
import { recentLabel } from '../../domain/recent';
import { Icon } from '../../ui';
import './recent.css';

// 최근 일정(지도 앱의 검색 기록처럼). 누르면 제목·도착 시각·장소·이동 시간·준비 단계가 그대로 채워진다
export function RecentPlans() {
  const { recentPlans, session, actions } = useApp();
  if (session || recentPlans.length === 0) return null;
  return (
    <section className="recent" aria-label="최근 일정">
      <h2 className="recent-title">최근 일정</h2>
      <ul className="recent-list">
        {recentPlans.map((r) => {
          const { title, sub } = recentLabel(r);
          return (
            <li key={r.id} className="recent-item">
              <button type="button" className="recent-pick" onClick={() => actions.applyRecent(r.id)}>
                <Icon name="clock" main="var(--muted)" det="var(--surface)" size={22} />
                <span className="recent-text">
                  <strong>{title}</strong>
                  <span>{sub}</span>
                </span>
              </button>
              <button type="button" className="recent-remove" aria-label={`${title} 기록 지우기`} onClick={() => actions.removeRecent(r.id)}>
                지우기
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
