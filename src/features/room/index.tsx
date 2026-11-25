import { useApp } from '../../app/store';
import type { Friend } from '../../domain/room';
import { accountAvailable, hasAccount } from '../../infra/account';
import { Card, Pill } from '../../ui';
import { RoomLive } from './RoomLive';
import { RoomSetup } from './RoomSetup';
import { useFriends, useRoomView } from './useRoomView';
import '../share/share.css';
import './room.css';

// 숫자 앞에 이모지를 붙인 알약(명세 ⑮). 0이면 회색. 늦은 횟수도 경고색 없이 중립으로 보여 준다
function Count({ emoji, label, n }: { emoji: string; label: string; n: number }) {
  return (
    <span className={`room-count ${n === 0 ? 'is-zero' : ''}`} aria-label={`${label} ${n}회`}>
      {emoji} {n}
    </span>
  );
}

function FriendCard({ f }: { f: Friend }) {
  return (
    <Card>
      <div className="room-friend-head">
        <span className="room-initial" aria-hidden="true">
          {f.name.slice(0, 1)}
        </span>
        <div className="room-friend-name">
          <strong>{f.name}</strong>
          <span className="share-note">함께한 약속 {f.together}회</span>
        </div>
        {f.active && <Pill tone="accent">지금 준비 중</Pill>}
      </div>
      <dl className="room-rows">
        <div>
          <dt>나</dt>
          <dd>
            <Count emoji="✅" label="지켰어요" n={f.myKept} />
            <Count emoji="⏰" label="늦었어요" n={f.myLate} />
          </dd>
        </div>
        <div>
          <dt>{f.name}</dt>
          <dd>
            <Count emoji="✅" label="지켰어요" n={f.theirKept} />
            <Count emoji="⏰" label="늦었어요" n={f.theirLate} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

// 친구 탭: 약속 방(만들기·들어가기·서로 보기)과 친구 목록
export function FriendsScreen() {
  const { room } = useApp();
  const { view, refresh } = useRoomView(room?.roomId ?? null);
  const friends = useFriends(hasAccount());

  if (!accountAvailable) {
    return (
      <Card>
        <p className="share-note">친구 기능이 아직 연결되지 않았어요.</p>
      </Card>
    );
  }

  return (
    <>
      <header className="room-title">
        <h1>친구</h1>
        <span className="share-note">✅ 지켰어요 / ⏰ 늦었어요</span>
      </header>
      {room ? <RoomLive room={room} view={view} refresh={refresh} /> : <RoomSetup />}
      {friends.map((f) => (
        <FriendCard key={f.userId} f={f} />
      ))}
      <p className="share-note">{friends.length > 0 ? '기록은 나와 그 친구에게만 보여요.' : '약속 방에서 함께한 친구가 여기에 쌓여요.'}</p>
    </>
  );
}
