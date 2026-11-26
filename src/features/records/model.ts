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

// 기록을 문장으로 풀어 준다. 탓하지 않고 사실과 고칠 수 있는 숫자만 말한다
export function insights(records: RecordRow[]): string[] {
  const rows = records.filter(usable);
  if (rows.length === 0) return [];
  const out: string[] = [];
  const arrived = rows.filter((r) => r.arrival !== undefined);
  if (arrived.length > 0) {
    const kept = arrived.filter((r) => r.arrival !== 'late').length;
    out.push(`기록한 ${arrived.length}번 중 ${kept}번 제시간에 도착했어요.`);
  }
  const snooze = average(rows.map((r) => r.snoozeCount));
  out.push(snooze >= 0.5 ? `알람을 평균 ${round(snooze)}번 미뤄요.` : '알람을 거의 미루지 않아요.');
  const wake = average(rows.map((r) => r.latency));
  out.push(`알람이 울리고 평균 ${round(wake)}분 뒤에 준비를 시작해요.${wake >= 10 ? ' 알람을 그만큼 일찍 맞추면 여유가 생겨요.' : ''}`);
  const over = round(average(rows.map((r) => r.prepActual - r.userPrep)));
  if (over >= NOTABLE_MIN) out.push(`준비가 예상보다 평균 ${over}분 더 걸려요. 준비 시간을 ${over}분 늘려 잡으면 맞아요.`);
  else if (over <= -NOTABLE_MIN) out.push(`준비가 예상보다 평균 ${-over}분 빨리 끝나요.`);
  else out.push('준비 시간은 예상과 거의 같아요.');
  const leave = round(average(rows.map((r) => r.leaveDiff)));
  if (leave >= 1) out.push(`출발은 계획보다 평균 ${leave}분 늦어요.`);
  else if (leave <= -1) out.push(`출발은 계획보다 평균 ${-leave}분 빨라요.`);
  else out.push('출발은 계획한 시각에 맞추는 편이에요.');
  return out;
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
