import { useEffect, useRef } from 'react';
import { createRoom, inviteToRoom } from '../infra/rooms';
import type { Actions } from './actions';
import type { AppState } from './state';

// 약속을 잡을 때 친구를 골랐으면, 알람을 켠 뒤 그 친구와의 방을 자동으로 만들고 친구를 넣는다.
// 그러면 내 상태가 방에 올라가고, 친구는 앱을 열었을 때 초대를 본다. 시연에서는 하지 않는다
export function useFriendInvite(state: AppState, actions: Actions): void {
  const done = useRef('');
  const { session, plan, room, shareName } = state;
  const friends = plan.friends;

  useEffect(() => {
    if (!session || session.demo || !friends?.length) return;
    if (room?.joined) return; // 남의 방에 들어가 있을 때는 건드리지 않는다
    const key = `${session.arriveAt}|${friends.map((f) => f.userId).join(',')}`;
    if (done.current === key) return;
    done.current = key;
    void (async () => {
      const ref = room ?? (await createRoom(shareName || '나', session.title, session.arriveAt));
      if (!ref) {
        done.current = ''; // 만들지 못했으면 다음에 다시 해 본다
        return;
      }
      if (!room) actions.setRoom({ roomId: ref.roomId, code: ref.code, sharing: true, arriveMs: session.arriveAt });
      for (const f of friends) await inviteToRoom(ref.roomId, f.userId);
    })();
  }, [session, friends, room, shareName, actions]);
}
