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
