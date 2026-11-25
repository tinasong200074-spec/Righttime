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

// 카드의 큰 숫자용. 분과 초를 두 자리로 채운다(02:41). 한 시간이 넘으면 1:02:41
export function fmtTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(total % 60)}` : `${pad(m)}:${pad(total % 60)}`;
}

// 날씨 한 줄("춥고 비가 와요 · 체감 4°C · 비 70%")을 제목과 설명으로 나누고, 날씨로 들어온 챙길 것을 덧붙인다
export function weatherParts(line: string, itemTexts: string[]): { title: string; detail: string } {
  const [title = '', ...rest] = line.split(' · ');
  if (itemTexts.length) rest.push(`${itemTexts.join(', ')} 챙기세요`);
  return { title, detail: rest.join(' · ') };
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

export interface Leg {
  label: '기상' | '준비' | '이동';
  diff: number; // 예상보다 늦으면 +분
}

export interface Verdict {
  headline: string;
  prepText: string;
  legs: Leg[];
  culprit: Leg | null; // 1분 이상 늦어진 구간 중 가장 큰 것
}

const round = Math.round;

function headlineOf(s: Session): string {
  if (s.arrivedAt !== undefined) {
    const d = (s.arrivedAt - s.arriveAt) / MIN;
    if (d > 0.5) return `지각이에요. ${round(d)}분 늦게 도착했어요`;
    return d < -0.5 ? `일찍 도착! ${round(-d)}분 여유가 있었어요` : '정시 도착!';
  }
  if (s.arrival) return { early: '일찍 도착!', ontime: '정시 도착!', late: '지각이에요' }[s.arrival];
  return '도착 기록은 없어요';
}

// 오늘 기록을 한눈에 보는 문장. 예상은 알람을 켠 순간의 계획이다.
export function verdictOf(s: Session): Verdict {
  const left = s.leftAt ?? s.leaveAt;
  const prep = (left - (s.prepStartAt ?? left)) / MIN;
  const legs: Leg[] = [
    { label: '기상', diff: round((s.latency ?? 0) - s.wakeMin) },
    { label: '준비', diff: round(prep - s.userPrep) },
  ];
  if (s.arrivedAt !== undefined) legs.push({ label: '이동', diff: round((s.arrivedAt - left) / MIN - s.travelMin) });
  const worst = legs.reduce((a, b) => (b.diff > a.diff ? b : a));
  const p = round(prep - s.userPrep);
  const prepText = p === 0 ? '평소만큼 준비했어요' : p > 0 ? `평소보다 ${p}분 더 준비했어요` : `평소보다 ${-p}분 덜 준비했어요`;
  return { headline: headlineOf(s), prepText, legs, culprit: worst.diff >= 1 ? worst : null };
}
