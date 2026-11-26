import { useEffect, useState } from 'react';
import { daysWith, type FriendDay } from '../../domain/room';
import { fetchFriendHistory } from '../../infra/rooms';
import { monthCells } from '../records/model';
import '../records/records.css';
import './calendar.css';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const ICON = { kept: '✅', late: '⏰' } as const;
const WORD = { kept: '지켰어요', late: '늦었어요' } as const;

// 한 칸의 표시. 테두리 색으로 누구인지 가른다(빨강 = 나, 파랑 = 친구). 색을 못 보는 경우를 위해 글로도 읽힌다
function Mark({ who, result }: { who: 'me' | 'friend'; result: 'kept' | 'late' | null }) {
  if (!result) return null;
  return (
    <span className={`fc-mark is-${who}`} aria-hidden="true">
      {ICON[result]}
    </span>
  );
}

function Detail({ day, rows, name }: { day: Date; rows: FriendDay[]; name: string }) {
  return (
    <div className="fc-detail" aria-live="polite">
      <h3>
        {day.getMonth() + 1}월 {day.getDate()}일
      </h3>
      {rows.length === 0 && <p className="m-muted">이 날은 함께한 약속이 없어요.</p>}
      {rows.map((r) => (
        <p key={r.arriveMs + r.title}>
          <strong>{r.title || '약속'}</strong>
          <span className="fc-who is-me">나 {r.mine ? `${ICON[r.mine]} ${WORD[r.mine]}` : '기록 없음'}</span>
          <span className="fc-who is-friend">
            {name} {r.theirs ? `${ICON[r.theirs]} ${WORD[r.theirs]}` : '기록 없음'}
          </span>
        </p>
      ))}
    </div>
  );
}

interface GridProps {
  ym: { y: number; m: number };
  byDay: Record<number, FriendDay[]>;
  name: string;
  picked: number | null;
  onPick: (d: number) => void;
}

// 달력 칸들. 약속이 있는 날에는 내 결과와 친구 결과를 나란히 그린다
function Grid({ ym, byDay, name, picked, onPick }: GridProps) {
  const label = (d: number) => {
    const rows = byDay[d] ?? [];
    const said = rows.map((r) => `나 ${r.mine ? WORD[r.mine] : '기록 없음'}, ${name} ${r.theirs ? WORD[r.theirs] : '기록 없음'}`).join('; ');
    return `${ym.m + 1}월 ${d}일${said ? ` ${said}` : ' 약속 없음'}`;
  };
  return (
    <div className="r-cal" role="group" aria-label={`${name}님과 함께한 약속 달력`}>
      {WEEK.map((w) => (
        <span key={w} className="r-cal-week" aria-hidden="true">
          {w}
        </span>
      ))}
      {monthCells(ym.y, ym.m).map((d, i) =>
        d === null ? (
          <span key={`e${i}`} />
        ) : (
          <button key={d} type="button" className="r-cal-day fc-day" aria-pressed={picked === d} aria-label={label(d)} onClick={() => onPick(d)}>
            <span>{d}</span>
            <span className="fc-marks">
              {(byDay[d] ?? []).slice(0, 1).map((r) => (
                <span key={r.arriveMs} className="fc-pair">
                  <Mark who="me" result={r.mine} />
                  <Mark who="friend" result={r.theirs} />
                </span>
              ))}
            </span>
          </button>
        ),
      )}
    </div>
  );
}

function useHistory(friendId: string): FriendDay[] {
  const [list, setList] = useState<FriendDay[]>([]);
  useEffect(() => {
    let alive = true;
    void fetchFriendHistory(friendId).then((v) => alive && setList(v));
    return () => {
      alive = false;
    };
  }, [friendId]);
  return list;
}

// 친구와 함께한 약속을 달력에 표시한다. 날짜마다 내 결과(빨강 테두리)와 친구 결과(파랑 테두리)를 나란히 보여 준다
export function FriendCalendar({ friendId, name, now }: { friendId: string; name: string; now: number }) {
  const history = useHistory(friendId);
  const today = new Date(now);
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [picked, setPicked] = useState<number | null>(null);
  const byDay = daysWith(history, ym.y, ym.m);
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
      <Grid ym={ym} byDay={byDay} name={name} picked={picked} onPick={setPicked} />
      <p className="fc-legend">
        <span className="fc-who is-me">나</span>
        <span className="fc-who is-friend">{name}</span>
        <span>✅ 지켰어요 · ⏰ 늦었어요</span>
      </p>
      {picked !== null && <Detail day={new Date(ym.y, ym.m, picked)} rows={byDay[picked] ?? []} name={name} />}
    </section>
  );
}
