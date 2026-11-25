import { lateInfo, projArrive, roundUp5 } from './message.js';
import { MIN, type Session } from './types.js';

// 준비 현황 링크 공유(명세 12.1, 12.3). 올리는 것은 단계와 도착 예정뿐이다.
// 위치, 알람 미루기, 개인 기록은 어떤 경우에도 올리지 않는다.

export type ShareStage = 'woke' | 'prep' | 'depart' | 'travel' | 'arrived';

export interface ShareOptions {
  name: string;
  showStage: boolean;
  showEta: boolean;
}

export interface ShareStatus {
  name: string;
  stage: ShareStage | null; // 단계를 숨기면 null
  stepIdx: number | null;
  stepCount: number | null;
  etaMs: number | null; // 도착 예정을 숨기면 null
  arriveMs: number;
  lateMin: number | null;
}

// 미루는 중이어도 상대에게는 "일어남"까지만 보인다
export function stageOf(s: Session): ShareStage {
  if (s.state === 'prep') return 'prep';
  if (s.state === 'check') return 'depart';
  if (s.state === 'travel') return 'travel';
  if (s.state === 'summary') return 'arrived';
  return 'woke';
}

export function buildShareStatus(s: Session, now: number, o: ShareOptions): ShareStatus {
  const stage = stageOf(s);
  const proj = stage === 'arrived' ? (s.arrivedAt ?? now) : projArrive(s, now);
  const late = lateInfo(proj, s.arriveAt);
  const inPrep = stage === 'prep';
  return {
    name: o.name.trim().slice(0, 20) || '친구',
    stage: o.showStage && s.state !== 'armed' ? stage : null, // 알람 전에는 단계가 없다
    stepIdx: o.showStage && inPrep ? s.stepIdx : null, // 단계 이름은 올리지 않고 몇 번째인지만
    stepCount: o.showStage && inPrep ? s.steps.length : null,
    etaMs: o.showEta ? (stage === 'arrived' ? proj : roundUp5(proj)) : null,
    arriveMs: s.arriveAt,
    lateMin: o.showEta && late.isLate ? late.lateN : null,
  };
}

// 값이 바뀌었을 때만 서버에 올리려고 만드는 비교용 문자열
export const shareKey = (st: ShareStatus) => JSON.stringify(st);

const STALE_MIN = 15;
// 마지막 갱신이 오래되면 "확인 안 됨"으로 보여 준다(앱을 닫았거나 인터넷이 끊겼을 수 있다)
export const isStale = (updatedAtMs: number, now: number) => now - updatedAtMs > STALE_MIN * MIN;

const KEEP_AFTER_MIN = 60;
// 약속이 끝나고 한 시간 뒤에 링크가 닫힌다
export const shareExpiresAt = (arriveMs: number) => arriveMs + KEEP_AFTER_MIN * MIN;

// 추측할 수 없는 128비트 토큰(16바이트 → 32자)
export function randomToken(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const STAGE_ROWS: Array<{ id: ShareStage; label: string }> = [
  { id: 'woke', label: '일어남' },
  { id: 'prep', label: '준비 중' },
  { id: 'depart', label: '곧 출발' },
  { id: 'travel', label: '이동 중' },
  { id: 'arrived', label: '도착' },
];
