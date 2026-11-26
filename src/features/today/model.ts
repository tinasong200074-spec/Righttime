// 오늘 화면에서 보여 주기 위한 가벼운 가공. 시간 역산·추천·날씨 판정은 domain이 한다.
import { fmtDay } from '../../domain/format';
import type { PlanCalc } from '../../domain/schedule';
import { DAY, type Step } from '../../domain/types';
import type { FillSegment } from '../../ui';

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function dayLabel(arriveAt: number, now: number): string {
  const diff = Math.round((startOfDay(arriveAt) - startOfDay(now)) / DAY);
  const prefix = diff === 0 ? '오늘' : diff === 1 ? '내일' : '';
  return prefix ? `${prefix} · ${fmtDay(arriveAt)}` : fmtDay(arriveAt);
}

export const newId = () => Math.random().toString(36).slice(2, 9);

// 총 준비 시간을 단계별 입력 비율대로 나눈다. 반올림으로 생긴 차이는 가장 긴 단계에 더한다
export function splitTotal(steps: Step[], total: number): Step[] {
  if (steps.length === 0) return steps;
  const sum = steps.reduce((a, s) => a + s.est, 0);
  const next = steps.map((s) => ({ ...s, est: Math.max(1, Math.round(sum > 0 ? (s.est * total) / sum : total / steps.length)) }));
  const diff = total - next.reduce((a, s) => a + s.est, 0);
  const longest = next.reduce((bi, s, i, a) => (s.est > a[bi].est ? i : bi), 0);
  next[longest] = { ...next[longest], est: Math.max(1, next[longest].est + diff) };
  return next;
}

export interface Part {
  name: string;
  min: number;
  tone: FillSegment['tone'];
}

// 시간표 막대: 시작 지연 / 준비 단계들 / 이동 / 배차 대기 / 여유
export function timetableParts(c: PlanCalc): Part[] {
  const parts: Part[] = [{ name: '시작 지연', min: c.wake.val, tone: 'light' }];
  c.steps.forEach((s, i) => parts.push({ name: s.name, min: s.est, tone: i % 2 ? 'gray' : 'ink' }));
  parts.push({ name: '이동', min: c.ride.val, tone: 'ink' });
  parts.push({ name: '배차 대기', min: c.waitMin, tone: 'gray' });
  parts.push({ name: '여유', min: c.buffer, tone: 'light' });
  return parts.filter((p) => p.min > 0);
}

export const toSegments = (parts: Part[]): FillSegment[] => {
  const total = parts.reduce((a, p) => a + p.min, 0) || 1;
  return parts.map((p) => ({ ratio: p.min / total, tone: p.tone }));
};

