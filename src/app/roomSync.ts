import { useEffect, useRef } from 'react';
import { judgeArrival } from '../domain/recommend';
import { resultOf } from '../domain/room';
import { buildShareStatus, shareKey } from '../domain/share';
import { MIN, type SessionState } from '../domain/types';
import { finishRoom, pushRoomStatus } from '../infra/rooms';
import type { Actions } from './actions';
import type { AppState, RoomState } from './state';

const HEARTBEAT_MS = 60_000;
const KEEP_AFTER_MS = 60 * MIN; // 약속 한 시간 뒤에 방에서 나온다

export const shouldLeaveRoom = (room: RoomState, sessionState: SessionState | null) => room.finished === true && sessionState !== 'summary';

// 약속 방에 들어가 있으면 내 단계·도착 예정을 올리고, 도착하면 결과(지켰어요/늦었어요)를 남긴다
export function useRoomSync(state: AppState, now: number, actions: Actions): void {
  const last = useRef({ key: '', at: 0, finished: '' });
  const { room, session, shareName } = state;

  useEffect(() => {
    if (!room) return;
    if (Date.now() > room.arriveMs + KEEP_AFTER_MS) {
      actions.setRoom(null);
      return;
    }
    // 방은 약속 하나에만 쓴다. 결과를 남긴 뒤 다음 일정으로 넘어가면(기록 저장, 반복 알람) 방에서 나온다.
    // 그러지 않으면 지난 약속의 "도착 · 지켰어요"가 새 일정에도 계속 보인다
    if (shouldLeaveRoom(room, session?.state ?? null)) {
      actions.setRoom(null);
      return;
    }
    if (!room.sharing) {
      last.current.key = ''; // 다시 켜면 1분을 기다리지 않고 바로 올리게 한다
      return;
    }
    if (!session) return;

    if (session.state === 'summary') {
      // 도착을 눌렀을 때만 결과를 남긴다. 건너뛴 약속은 집계하지 않는다
      const arrival = session.arrivedAt !== undefined ? judgeArrival((session.arrivedAt - session.arriveAt) / MIN) : undefined;
      const result = resultOf(arrival);
      // 시연은 약속 기록(지켰어요/늦었어요)에 남기지 않는다
      if (result && !session.demo && last.current.finished !== room.roomId) {
        last.current.finished = room.roomId;
        void finishRoom(room.roomId, result);
        actions.setRoom({ ...room, finished: true });
      }
      return;
    }

    const status = buildShareStatus(session, now, { name: shareName, showStage: true, showEta: true });
    const key = room.roomId + shareKey(status);
    const realNow = Date.now();
    if (key === last.current.key && realNow - last.current.at < HEARTBEAT_MS) return;
    last.current = { ...last.current, key, at: realNow };
    void pushRoomStatus(room.roomId, status);
  }, [room, session, shareName, now, actions]);
}
