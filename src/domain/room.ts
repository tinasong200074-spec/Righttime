import type { ShareStage } from './share.js';
import type { Arrival } from './types.js';

// 친구 약속 방(명세 12.1, 12.2). 서로 보이는 것은 단계와 도착 예정, 직접 알린 문구뿐이다.

export interface RoomMember {
  userId: string;
  name: string;
  isMe: boolean;
  sharing: boolean;
  stage: ShareStage | null;
  stepIdx: number | null;
  stepCount: number | null;
  etaMs: number | null;
  lateMin: number | null;
  message: string | null;
  cheer: string | null; // 나에게 온 안심 메시지(내 행에만 온다)
  cheerFrom: string | null;
  cheerAtMs?: number | null; // 받은 시각(같은 말을 다시 받아도 알 수 있게)
  result: 'kept' | 'late' | null;
  updatedAtMs: number;
}

export interface RoomView {
  roomId: string;
  code: string;
  title: string;
  arriveMs: number;
  members: RoomMember[];
}

export interface Friend {
  userId: string;
  name: string;
  together: number; // 함께한 약속 수
  myKept: number;
  myLate: number;
  theirKept: number;
  theirLate: number;
  active: boolean; // 지금 준비 중
}

// "지켰어요" 기준: 늦지 않았으면 지킨 것으로 본다(일찍·제시간). 기준은 PRD의 미결 사항
export const resultOf = (arrival: Arrival | undefined): 'kept' | 'late' | null =>
  arrival === undefined ? null : arrival === 'late' ? 'late' : 'kept';

const CODE_RE = /^[A-Z2-9]{6}$/;

// 사람이 친 코드를 다듬는다(소문자, 공백, 하이픈 허용)
export function cleanCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(code) ? code : null;
}

// 주소의 #r=코드 부분을 읽는다
export const codeFromHash = (hash: string): string | null => cleanCode(hash.match(/^#r=([A-Za-z0-9-]{6,8})$/)?.[1] ?? '');

// 상대 한 줄 요약: "준비 중 · 3/4", "준비 전 · 알람 켜 둠", "공유를 껐어요"
export function memberLine(m: RoomMember, stageLabel: (s: ShareStage) => string): string {
  if (!m.sharing) return '공유를 껐어요';
  if (m.result) return m.result === 'kept' ? '도착 · 지켰어요' : '도착 · 늦었어요';
  // 알람을 켜면 도착 예정이 먼저 올라가고, 알람이 울린 뒤부터 단계가 올라간다
  if (!m.stage) return m.etaMs !== null ? '준비 전 · 알람 켜 둠' : '아직 알람을 켜지 않았어요';
  const steps = m.stage === 'prep' && m.stepCount ? ` · ${(m.stepIdx ?? 0) + 1}/${m.stepCount}` : '';
  return stageLabel(m.stage) + steps;
}

// 내가 초대받은 방(친구가 나를 골라 공유를 시작했다)
export interface Invite {
  roomId: string;
  code: string;
  title: string;
  arriveMs: number;
  from: string | null;
  sharing: boolean;
}

const STAGE_NEWS: Record<ShareStage, string> = {
  woke: '일어났어요',
  prep: '준비를 시작했어요',
  depart: '곧 출발해요',
  travel: '출발했어요',
  arrived: '도착했어요',
};

// 친구의 단계가 바뀌었을 때 띄우는 한 줄: "민수님이 준비를 시작했어요"
export const stageNews = (name: string, stage: ShareStage) => `${name || '친구'}님이 ${STAGE_NEWS[stage]}`;

// 방 사람들의 단계에서 바뀐 것만 고른다. 처음 본 사람(이전 값이 없는 사람)은 알리지 않는다
export function stageChanges(prev: Record<string, string | null>, members: RoomMember[]): Array<{ name: string; stage: ShareStage }> {
  return members
    .filter((m) => !m.isMe && m.stage && m.userId in prev && prev[m.userId] !== m.stage)
    .map((m) => ({ name: m.name, stage: m.stage as ShareStage }));
}

const isActive = (m: RoomMember) => m.sharing && !m.result && (m.stage !== null || m.etaMs !== null);

// 초대받아 들어온 사람에게 보여 줄 "보낸 친구". 방에 여럿이 있으면 지금 준비 중인 사람 가운데 가장 최근에 바뀐 사람을 고른다.
// (예전에 같이 있던, 지금은 아무것도 올리지 않는 사람을 보여 주면 단계가 영영 안 바뀐다)
export function hostOf(members: RoomMember[]): RoomMember | null {
  const others = members.filter((m) => !m.isMe);
  const active = others.filter(isActive).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return active[0] ?? others[0] ?? null;
}

// 들어와 있는 방의 약속이 끝났는지: 누군가는 결과를 남겼고, 지금 준비 중인 다른 사람은 없다
export function roomOver(members: RoomMember[]): boolean {
  const others = members.filter((m) => !m.isMe);
  return others.some((m) => m.result !== null) && !others.some(isActive);
}
