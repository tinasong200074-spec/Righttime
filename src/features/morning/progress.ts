// 아침 진행 화면이 쓰는 시간 계산. 시계는 useApp().now만 받아서 쓴다.
import type { FillSegment } from '../../ui';
import { MIN, type Session } from '../../domain/types';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// 울린 순간부터 잰다. 알람 후 경과(기상 시간)의 기준점
export const wakeStartAt = (s: Session): number => s.firstRingAt ?? s.alarmAt;

// 준비가 끝난 시각. 준비 중이면 지금, 끝났으면 마지막 단계를 마친 순간
export function prepEndAt(s: Session, now: number): number {
  return s.state === 'prep' ? now : (s.stepStartAt ?? now);
}

export const prepElapsedMs = (s: Session, now: number): number =>
  Math.max(0, prepEndAt(s, now) - (s.prepStartAt ?? now));

export const stepElapsedMs = (s: Session, now: number): number => Math.max(0, now - (s.stepStartAt ?? now));

// 현재 단계가 예상 시간을 넘긴 분(넘기지 않았으면 0)
export function stepOverMin(s: Session, now: number): number {
  const step = s.steps[s.stepIdx];
  if (s.state !== 'prep' || !step) return 0;
  return Math.max(0, stepElapsedMs(s, now) / MIN - step.est);
}

export interface BarView {
  segments: FillSegment[];
  progress: number;
}

// ② 알람 시각 → 평소 준비 시작 시각까지 얼마나 왔는지
export function wakeBar(s: Session, now: number): BarView {
  const span = s.prepStartPlanAt - wakeStartAt(s);
  const progress = span <= 0 ? 1 : clamp01((now - wakeStartAt(s)) / span);
  return { segments: [{ ratio: progress, tone: 'accent' }], progress };
}

// ③ 기상 구간(회색) + 준비 구간(라임). 출발 목표를 넘기면 막대가 가득 찬다
export function prepBar(s: Session, now: number): BarView {
  const start = wakeStartAt(s);
  const total = Math.max(s.leaveAt, now) - start;
  const wake = Math.max(0, (s.prepStartAt ?? now) - start);
  const prep = prepElapsedMs(s, now);
  if (total <= 0) return { segments: [], progress: 1 };
  return {
    segments: [
      { ratio: wake / total, tone: 'gray' },
      { ratio: prep / total, tone: 'accent' },
    ],
    progress: clamp01((wake + prep) / total),
  };
}

// 목표 시각과 실제 시각의 차이를 말로
export function diffText(diffMin: number): string {
  if (diffMin > 0.5) return `목표보다 ${Math.round(diffMin)}분 늦게`;
  if (diffMin < -0.5) return `목표보다 ${Math.round(-diffMin)}분 일찍`;
  return '목표 시각에 맞게';
}

// 출발까지 남은 시간을 알약 문구로 (색 말고 글자로도 구분한다)
export function leavePillText(leaveAt: number, now: number, preLeave: number): string {
  const left = (leaveAt - now) / MIN;
  if (left <= 0) return '출발 시각이 지났어요';
  if (left <= preLeave) return '곧 출발';
  return `여유 ${Math.floor(left)}분`;
}
