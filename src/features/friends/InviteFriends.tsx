import { useState } from 'react';
import type { RoomView } from '../../domain/room';
import { hasAccount } from '../../infra/account';
import { inviteToRoom } from '../../infra/rooms';
import { useFriends } from '../room/useRoomView';
import '../quick/quick.css';

// 방을 만든 뒤 친구 목록에서 골라 바로 공유한다(코드나 링크를 보낼 필요가 없다).
// 목록에 없는 사람에게는 위의 초대 링크를 보낸다
export function InviteFriends({ roomId, view, onDone }: { roomId: string; view: RoomView | null; onDone: () => void }) {
  const inRoom = new Set(view?.members.map((m) => m.userId) ?? []);
  const friends = useFriends(hasAccount()).filter((f) => !inRoom.has(f.userId));
  const [msg, setMsg] = useState('');
  if (friends.length === 0) return null;
  const invite = async (id: string, name: string) => {
    setMsg('공유하는 중…');
    const ok = await inviteToRoom(roomId, id);
    setMsg(ok ? `${name}님에게 공유했어요. ${name}님이 앱을 열면 보여요.` : '공유하지 못했어요. 잠시 뒤 다시 눌러 주세요.');
    if (ok) onDone();
  };
  return (
    <section className="m-card">
      <h2 className="m-sec-title" id="invite-friends">
        친구에게 바로 공유
      </h2>
      <div className="q-chips" role="group" aria-labelledby="invite-friends">
        {friends.map((f) => (
          <button key={f.userId} type="button" className="q-chip" onClick={() => invite(f.userId, f.name)}>
            {f.name}
          </button>
        ))}
      </div>
      <p className="f-status" role="status">
        {msg}
      </p>
    </section>
  );
}
