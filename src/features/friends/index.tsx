import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import type { Friend } from '../../domain/room';
import { accountAvailable, callRpc, hasAccount } from '../../infra/account';
import { cheerInRoom } from '../../infra/rooms';
import { useFriends, useRoomView } from '../room/useRoomView';
import '../today/fields.css';
import '../today/main.css';
import './friends.css';
import { FriendList } from './FriendList';
import { FriendRecord } from './FriendRecord';
import { MemberView } from './MemberView';
import { RoomLive } from './RoomLive';
import { RoomSetup } from './RoomSetup';

type View = { name: 'list' } | { name: 'setup' } | { name: 'live' } | { name: 'member'; id: string } | { name: 'record'; id: string };

// 친구 기록 화면. 끊기는 서버 함수 friend_remove가 내 참여 기록을 지운다(양쪽 목록에서 함께 사라진다)
function RecordRoute({ friend, toList, onGone }: { friend: Friend; toList: () => void; onGone: (id: string) => void }) {
  const cut = async () => {
    // true=끊음, false=지울 기록이 없음(다른 기기에서 이미 끊음), null=서버 오류. 앞의 둘은 목록에서 뺀다
    const res = await callRpc<boolean>('friend_remove', { p_other: friend.userId });
    const ok = res !== null;
    if (ok) {
      onGone(friend.userId);
      toList();
    }
    return ok;
  };
  return <FriendRecord friend={friend} onBack={toList} onCut={cut} />;
}

// 친구 탭: 목록 → 친구 추가(방 만들기·들어가기, 목업 1번) → 내 화면(2번) → 친구 상태(3·4·5번)
export function FriendsScreen() {
  const { room, now } = useApp();
  const { view: roomView, refresh } = useRoomView(room?.roomId ?? null);
  const [gone, setGone] = useState<string[]>([]); // 방금 끊은 친구는 바로 목록에서 뺀다
  const friends = useFriends(hasAccount()).filter((f) => !gone.includes(f.userId));
  const [view, setView] = useState<View>(() => (location.hash.startsWith('#r=') ? { name: 'setup' } : { name: 'list' }));
  const toList = () => setView({ name: 'list' });

  // 방에 들어가면 내 화면으로, 방에서 나가면 목록으로 옮긴다
  const hasRoom = room !== null;
  useEffect(() => {
    setView((v) => (hasRoom && v.name === 'setup' ? { name: 'live' } : !hasRoom && (v.name === 'live' || v.name === 'member') ? { name: 'list' } : v));
  }, [hasRoom]);

  if (!accountAvailable) {
    return (
      <div className="m-screen">
        <h1 className="m-h1">친구</h1>
        <section className="m-card">
          <p className="m-muted" style={{ margin: 0 }}>친구 기능이 아직 연결되지 않았어요.</p>
        </section>
      </div>
    );
  }
  if (view.name === 'setup') return <RoomSetup onBack={toList} />;
  if (view.name === 'live' && room) return <RoomLive room={room} view={roomView} onBack={toList} onOpen={(id) => setView({ name: 'member', id })} />;
  if (view.name === 'member' && room && roomView) {
    const m = roomView.members.find((x) => x.userId === view.id);
    if (m) {
      const cheer = () => void cheerInRoom(room.roomId, m.userId, m.lateMin ? 'ok' : 'slow').then(refresh);
      return <MemberView m={m} arriveMs={roomView.arriveMs} now={now} onBack={() => setView({ name: 'live' })} onCheer={cheer} />;
    }
  }
  if (view.name === 'record') {
    const f = friends.find((x) => x.userId === view.id);
    if (f) return <RecordRoute friend={f} toList={toList} onGone={(id) => setGone((g) => [...g, id])} />;
  }
  return (
    <FriendList
      friends={friends}
      room={room}
      onAdd={() => setView(room ? { name: 'live' } : { name: 'setup' })}
      onOpenRoom={() => setView({ name: 'live' })}
      onOpenFriend={(id) => setView({ name: 'record', id })}
    />
  );
}
