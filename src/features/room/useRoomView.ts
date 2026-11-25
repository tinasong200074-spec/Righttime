import { useCallback, useEffect, useState } from 'react';
import type { Friend, RoomView } from '../../domain/room';
import { fetchFriends, fetchRoom } from '../../infra/rooms';

const POLL_MS = 5000;

// 방 상태를 5초마다 다시 불러온다. refresh()는 버튼을 누른 직후 바로 반영할 때 쓴다
export function useRoomView(roomId: string | null): { view: RoomView | null; refresh: () => void } {
  const [view, setView] = useState<RoomView | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!roomId) {
      setView(null);
      return;
    }
    let alive = true;
    const load = async () => {
      const v = await fetchRoom(roomId);
      if (alive && v) setView(v); // 실패하면 마지막 값을 그대로 둔다
    };
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [roomId, nonce]);

  return { view, refresh: useCallback(() => setNonce((n) => n + 1), []) };
}

export function useFriends(enabled: boolean): Friend[] {
  const [friends, setFriends] = useState<Friend[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void fetchFriends().then((f) => alive && setFriends(f));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return friends;
}
