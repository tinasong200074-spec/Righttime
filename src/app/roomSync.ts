import { useEffect, useRef } from 'react';
import { judgeArrival } from '../domain/recommend';
import { resultOf } from '../domain/room';
import { buildShareStatus, shareKey } from '../domain/share';
import { MIN } from '../domain/types';
import { finishRoom, pushRoomStatus } from '../infra/rooms';
import type { Actions } from './actions';
import type { AppState } from './state';

const HEARTBEAT_MS = 60_000;
const KEEP_AFTER_MS = 60 * MIN; // 약속 한 시간 뒤에 방에서 나온다

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
    if (!session || session.demo || !room.sharing) return;

    if (session.state === 'summary') {
      // 도착을 눌렀을 때만 결과를 남긴다. 건너뛴 약속은 집계하지 않는다
      const arrival = session.arrivedAt !== undefined ? judgeArrival((session.arrivedAt - session.arriveAt) / MIN) : undefined;
      const result = resultOf(arrival);
      if (result && last.current.finished !== room.roomId) {
        last.current.finished = room.roomId;
        void finishRoom(room.roomId, result);
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
