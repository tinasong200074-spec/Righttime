// 기록 화면에 보여 줄 값 모으기. 추천·역산은 domain 함수를 쓴다.
import { computeSchedule, type PlanCalc } from '../../domain/schedule';
import { average, recentValues, usable } from '../../domain/recommend';
import { MIN, type Place, type Plan, type RecordRow, type Settings } from '../../domain/types';

const CHART_DAYS = 7;

export interface AlarmCompare {
  before: number; // 입력값만으로 계산한 알람
  after: number; // 기록을 반영한 알람
  diffMin: number; // 양수면 앞당겨짐
}

export function alarmCompare(calc: PlanCalc, plan: Plan, settings: Settings): AlarmCompare {
  const before = computeSchedule({
    arriveAt: calc.arriveAt,
    rideMin: calc.place?.travelMin ?? plan.rideMin,
    waitMin: calc.waitMin,
    buffer: calc.buffer,
    prepMin: calc.userPrep,
    latency: settings.latency,
  }).alarmAt;
  return { before, after: calc.alarmAt, diffMin: Math.round((before - calc.alarmAt) / MIN) };
}

const avgOrNull = (a: number[]) => (a.length ? average(a) : null);

export function averages(records: RecordRow[]) {
  return {
    count: records.filter(usable).length,
    wake: avgOrNull(recentValues(records, 'latency')),
    prep: avgOrNull(recentValues(records, 'prepActual')),
    leave: avgOrNull(recentValues(records, 'leaveDiff')),
  };
}

export const lastDays = (records: RecordRow[]) => records.filter(usable).slice(-CHART_DAYS);

export interface PlaceStat {
  id: string;
  name: string;
  count: number;
  actual: number;
  input?: number;
}

export function placeStats(records: RecordRow[], places: Place[]): PlaceStat[] {
  const ids = [...new Set(records.filter(usable).map((r) => r.placeId).filter((id): id is string => !!id))];
  return ids
    .map((id) => {
      const vals = recentValues(records, 'travelActual', id);
      const place = places.find((p) => p.id === id);
      const name = place?.name ?? records.find((r) => r.placeId === id)?.placeName ?? '장소';
      return { id, name, count: vals.length, actual: average(vals), input: place?.travelMin };
    })
    .filter((p) => p.count > 0);
}

export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

const round = Math.round;
const NOTABLE_MIN = 3; // 이보다 작은 차이는 "거의 같다"로 본다

export type InsightTone = 'good' | 'warn' | 'flat';
export interface Insight {
  key: 'arrive' | 'snooze' | 'wake' | 'prep' | 'leave';
  value: string; // 크게 보여 줄 숫자
  label: string; // 숫자 아래 한 줄
  tone: InsightTone; // good=잘 맞음, warn=눈여겨볼 것, flat=참고
}
export interface InsightView {
  tiles: Insight[];
  trail: Array<'kept' | 'late'>; // 최근 도착 결과(오래된 것부터)
  tip: string | null; // 가장 효과가 큰 한 가지
}

const signedMin = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}분`;

function prepTile(over: number): Insight {
  const label = over >= NOTABLE_MIN ? '준비가 예상보다 김' : over <= -NOTABLE_MIN ? '준비가 예상보다 짧음' : '준비는 예상대로';
  return { key: 'prep', value: signedMin(over), label, tone: over >= NOTABLE_MIN ? 'warn' : 'good' };
}

function leaveTile(leave: number): Insight {
  const label = leave >= 1 ? '출발이 계획보다 늦음' : leave <= -1 ? '출발이 계획보다 빠름' : '출발은 계획대로';
  return { key: 'leave', value: signedMin(leave), label, tone: leave >= NOTABLE_MIN ? 'warn' : leave <= 0 ? 'good' : 'flat' };
}

// 기록을 한눈에 볼 숫자 타일로 정리한다. 탓하지 않고 사실과 고칠 수 있는 숫자만 말한다
export function insights(records: RecordRow[]): InsightView | null {
  const rows = records.filter(usable);
  if (rows.length === 0) return null;
  const arrived = rows.filter((r) => r.arrival !== undefined);
  const kept = arrived.filter((r) => r.arrival !== 'late').length;
  const snooze = round(average(rows.map((r) => r.snoozeCount)));
  const wake = round(average(rows.map((r) => r.latency)));
  const over = round(average(rows.map((r) => r.prepActual - r.userPrep)));
  const tiles: Insight[] = [];
  if (arrived.length > 0) {
    const tone = kept === arrived.length ? 'good' : kept * 2 < arrived.length ? 'warn' : 'flat';
    tiles.push({ key: 'arrive', value: `${kept}/${arrived.length}`, label: '제시간 도착', tone });
  }
  tiles.push({ key: 'snooze', value: `${snooze}번`, label: '알람 미룸', tone: snooze >= 2 ? 'warn' : snooze === 0 ? 'good' : 'flat' });
  tiles.push({ key: 'wake', value: `${wake}분`, label: '울린 뒤 시작까지', tone: wake >= 10 ? 'warn' : 'flat' });
  tiles.push(prepTile(over), leaveTile(round(average(rows.map((r) => r.leaveDiff)))));
  const tip = over >= NOTABLE_MIN ? `준비 시간을 ${over}분 늘려 잡으면 맞아요` : wake >= 10 ? `알람을 ${wake}분 일찍 맞추면 여유가 생겨요` : null;
  return { tiles, trail: arrived.slice(-7).map((r) => (r.arrival === 'late' ? 'late' : 'kept')), tip };
}

// 달력 한 달치 칸. 앞쪽 빈칸은 null. 한 주는 일요일부터
export function monthCells(year: number, month: number): Array<number | null> {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

export type DayMark = 'late' | 'kept' | 'none';

// 그날 기록의 표시. 하루에 여러 번이면 한 번이라도 늦은 날을 지각으로 본다
export function dayMark(rows: RecordRow[]): DayMark {
  if (rows.some((r) => r.arrival === 'late')) return 'late';
  return rows.some((r) => r.arrival !== undefined) ? 'kept' : 'none';
}

// 도착 결과 한 줄: "7분 늦음", "5분 일찍", "제시간"
export function arriveText(r: RecordRow): string {
  if (r.arriveDiff === undefined) return '도착 기록 없음';
  const d = round(r.arriveDiff);
  return d > 0 ? `${d}분 늦음` : d < 0 ? `${-d}분 일찍` : '제시간';
}
