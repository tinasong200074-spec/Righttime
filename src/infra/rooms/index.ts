import type { Friend, FriendDay, Invite, RoomView } from '../../domain/room';
import type { ShareStatus } from '../../domain/share';
import { callRpc } from '../account';
import type { CheerKey } from '../../domain/cheer';

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

export const cheerInRoom = (roomId: string, toUserId: string, kind: CheerKey) =>
  callRpc<boolean>('room_cheer', { p_room: roomId, p_to: toUserId, p_kind: kind });

export const setRoomSharing = (roomId: string, on: boolean) => callRpc<boolean>('room_sharing', { p_room: roomId, p_on: on });

export const finishRoom = (roomId: string, result: 'kept' | 'late') => callRpc<boolean>('room_finish', { p_room: roomId, p_result: result });

// 친구(예전에 같은 방에 있었던 사람)를 내 방에 넣는다. 친구의 공유는 꺼진 채로 들어온다
export const inviteToRoom = (roomId: string, friendId: string) => callRpc<boolean>('room_invite', { p_room: roomId, p_friend: friendId });

// 내가 초대받은, 아직 끝나지 않은 방
export const fetchInvites = async () => (await callRpc<Invite[]>('my_rooms', {})) ?? [];

export const fetchFriends = async () => (await callRpc<Friend[]>('my_friends', {})) ?? [];

export const roomUrl = (code: string) => `${location.origin}/#r=${code}`;

// 그 친구와 함께한 약속의 날짜별 결과
export const fetchFriendHistory = async (friendId: string) => (await callRpc<FriendDay[]>('friend_history', { p_other: friendId })) ?? [];
