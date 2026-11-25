import type { Friend, RoomView } from '../../domain/room';
import type { ShareStatus } from '../../domain/share';
import { callRpc } from '../account';

// 친구 약속 방 호출부. 모두 기기 계정으로 로그인한 상태에서 DB 함수를 부른다.

export interface RoomRef {
  roomId: string;
  code: string;
}

export const createRoom = (name: string, title: string, arriveMs: number) =>
  callRpc<RoomRef>('room_create', { p_name: name, p_title: title, p_arrive_ms: Math.round(arriveMs) });

// 코드가 틀렸거나 끝난 방이면 null
export const joinRoom = (code: string, name: string) => callRpc<RoomRef | null>('room_join', { p_code: code, p_name: name });

export const fetchRoom = (roomId: string) => callRpc<RoomView | null>('room_get', { p_room: roomId });

export const pushRoomStatus = (roomId: string, st: ShareStatus) =>
  callRpc<boolean>('room_push', {
    p_room: roomId,
    p_stage: st.stage,
    p_step_idx: st.stepIdx,
    p_step_count: st.stepCount,
    p_eta_ms: st.etaMs,
    p_late_min: st.lateMin,
  });

export const sayInRoom = (roomId: string, message: string) => callRpc<boolean>('room_say', { p_room: roomId, p_message: message });

export const cheerInRoom = (roomId: string, toUserId: string, kind: 'slow' | 'ok') =>
  callRpc<boolean>('room_cheer', { p_room: roomId, p_to: toUserId, p_kind: kind });

export const setRoomSharing = (roomId: string, on: boolean) => callRpc<boolean>('room_sharing', { p_room: roomId, p_on: on });

export const finishRoom = (roomId: string, result: 'kept' | 'late') => callRpc<boolean>('room_finish', { p_room: roomId, p_result: result });

export const fetchFriends = async () => (await callRpc<Friend[]>('my_friends', {})) ?? [];

export const roomUrl = (code: string) => `${location.origin}/#r=${code}`;
