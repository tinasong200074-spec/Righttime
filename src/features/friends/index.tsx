import { useState } from 'react';
import '../today/fields.css';
import '../today/main.css';
import { FriendDetail } from './FriendDetail';
import { FriendList } from './FriendList';
import './friends.css';
import { RoomCreate } from './RoomCreate';
import { RoomLive } from './RoomLive';
import { SAMPLE_FRIENDS } from './sample';

type View = { name: 'list' } | { name: 'add' } | { name: 'live' } | { name: 'friend'; id: string };

// 친구: 목록 → 친구 상태(목업 3·4·5번) / 친구 추가 → 약속 방 만들기(1번) → 공유 중(2번).
// 계정과 서버가 없어서 예시 데이터로 보여 준다
export function FriendsScreen({ onExit }: { onExit?: () => void }) {
  const [view, setView] = useState<View>({ name: 'list' });
  const toList = () => setView({ name: 'list' });

  if (view.name === 'add') return <RoomCreate onBack={toList} onStart={() => setView({ name: 'live' })} />;
  if (view.name === 'live') return <RoomLive onBack={toList} />;
  if (view.name === 'friend') {
    const f = SAMPLE_FRIENDS.find((x) => x.id === view.id);
    if (f) return <FriendDetail friend={f} onBack={toList} />;
  }
  return <FriendList friends={SAMPLE_FRIENDS} onOpen={(id) => setView({ name: 'friend', id })} onAdd={() => setView({ name: 'add' })} onExit={onExit} />;
}
