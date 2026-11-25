import type { RoomState } from '../../app/state';
import type { Friend } from '../../domain/room';
import { ActiveMark } from './ActiveMark';

// 목업 15번의 ✅·⏰ 표시는 목업과 명세 7.3에 그대로 적힌 것이라 글자 그대로 쓴다(줄 늘어놓기는 하지 않는다)
function Count({ icon, n, label }: { icon: string; n: number; label: string }) {
  return (
    <span className={`fr-num ${n === 0 ? 'is-zero' : ''}`} aria-label={`${label} ${n}번`}>
      <span aria-hidden="true">{icon}</span>
      {n}
    </span>
  );
}

function Row({ who, kept, late }: { who: string; kept: number; late: number }) {
  return (
    <div className="fr-tally-row">
      <span className="m-muted" style={{ fontSize: '0.9375rem' }}>
        {who}
      </span>
      <span className="fr-pair">
        <Count icon="✅" n={kept} label="지켰어요" />
        <Count icon="⏰" n={late} label="늦었어요" />
      </span>
    </div>
  );
}

function FriendCard({ f }: { f: Friend }) {
  return (
    <section className="fr-card" style={{ cursor: 'default' }} aria-label={`${f.name}, 함께한 약속 ${f.together}회`}>
      <div className="fr-person">
        <span className={`fr-avatar ${f.active ? 'is-live' : ''}`}>{f.name.slice(0, 1)}</span>
        <span className="fr-grow">
          <div style={{ fontWeight: 800 }}>
            {f.name}
            {f.active && <ActiveMark />}
          </div>
          <div className="m-muted">함께한 약속 {f.together}회</div>
        </span>
        {f.active && <span className="fr-tag is-accent">지금 준비 중</span>}
      </div>
      <div className="fr-tally">
        <Row who="나" kept={f.myKept} late={f.myLate} />
        <Row who={f.name} kept={f.theirKept} late={f.theirLate} />
      </div>
    </section>
  );
}

interface Props {
  friends: Friend[];
  room: RoomState | null;
  onAdd: () => void;
  onOpenRoom: () => void;
}

// 친구 목록 · 약속 기록(목업 15번). 들어가 있는 약속 방이 있으면 맨 위에 보여 준다
export function FriendList({ friends, room, onAdd, onOpenRoom }: Props) {
  return (
    <div className="m-screen">
      <div className="fr-head">
        <h1 className="m-h1">친구</h1>
        <button type="button" className="fr-add" onClick={onAdd}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          </svg>
          친구 추가
        </button>
      </div>
      {room && (
        <button type="button" className="fr-card" onClick={onOpenRoom}>
          <span className="fr-person">
            <span className="fr-avatar is-live">방</span>
            <span className="fr-grow">
              <div style={{ fontWeight: 800 }}>지금 들어가 있는 약속 방</div>
              <div className="m-muted">코드 {room.code} · {room.sharing ? '공유 중' : '공유 꺼짐'}</div>
            </span>
            <span className="fr-tag is-accent">열기</span>
          </span>
        </button>
      )}
      <div className="fr-legend">
        <span>✅ 지켰어요</span>
        <span>⏰ 늦었어요</span>
      </div>
      {[...friends]
        .sort((a, b) => Number(b.active) - Number(a.active)) // 활성 친구를 위로
        .map((f) => (
        <FriendCard key={f.userId} f={f} />
      ))}
      <p className="fr-small">{friends.length > 0 ? '기록은 나와 그 친구에게만 보여요.' : '약속 방에서 함께한 친구가 여기에 쌓여요.'}</p>
    </div>
  );
}
