import type { RoomState } from '../../app/state';
import type { Friend } from '../../domain/room';
import { ActiveMark } from './ActiveMark';

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style={{ flex: 'none' }}>
      <path d="M9 5l7 7-7 7" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// 친구 이름만 보이는 한 줄. 누르면 그 친구의 지켰어요/늦었어요 기록이 열린다
function FriendRow({ f, onOpen }: { f: Friend; onOpen: () => void }) {
  return (
    <button type="button" className="fr-name-row" onClick={onOpen} aria-label={`${f.name}${f.active ? ', 활성' : ''}, 약속 기록 보기`}>
      <span className={`fr-avatar ${f.active ? 'is-live' : ''}`}>{f.name.slice(0, 1)}</span>
      <span className="fr-grow" style={{ fontWeight: 800 }}>
        {f.name}
        {f.active && <ActiveMark />}
      </span>
      <Chevron />
    </button>
  );
}

interface Props {
  friends: Friend[];
  room: RoomState | null;
  onAdd: () => void;
  onOpenRoom: () => void;
  onOpenFriend: (userId: string) => void;
}

// 친구 목록(목업 15번): 이름만 보인다. 들어가 있는 약속 방이 있으면 맨 위에 보여 준다
export function FriendList({ friends, room, onAdd, onOpenRoom, onOpenFriend }: Props) {
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
      {friends.length > 0 && (
        <section className="m-card fr-names">
          {[...friends]
            .sort((a, b) => Number(b.active) - Number(a.active)) // 활성 친구를 위로
            .map((f) => (
              <FriendRow key={f.userId} f={f} onOpen={() => onOpenFriend(f.userId)} />
            ))}
        </section>
      )}
      <p className="fr-small">{friends.length > 0 ? '이름을 누르면 함께한 약속 기록이 보여요.' : '약속 방에서 함께한 친구가 여기에 쌓여요.'}</p>
    </div>
  );
}
