// 시연용 사례 실행: npm run demo:cases. 실제 도메인 함수를 그대로 부르고 결과를 찍는다
import { it } from 'vitest';
import { fmtClock } from './domain/format';
import { judgeArrival, rec } from './domain/recommend';
import { cleanCode } from './domain/room';
import { calcPlan, rollForward } from './domain/schedule';
import { isStale } from './domain/share';
import { isValidCoord, parseTransit } from './domain/transit';
import { DEFAULT_SETTINGS, MIN, type Plan, type RecordRow } from './domain/types';

const at = (h: number, m: number) => new Date(2026, 10, 27, h, m).getTime();
const plan: Plan = {
  title: '회의', arriveAt: at(9, 0), rideMin: 30, waitMin: 0, kind: 'etc',
  steps: [{ id: 'a', name: '씻기', est: 15 }, { id: 'b', name: '옷 입기', est: 10 }, { id: 'c', name: '아침', est: 10 }, { id: 'd', name: '가방', est: 5 }],
} as Plan;
const row = (prep: number, latency: number, extra: Partial<RecordRow> = {}) => ({ id: String(Math.random()), prepActual: prep, latency, ...extra }) as RecordRow;
const show = (label: string, v: unknown) => console.log(`■ ${label}\n   ${typeof v === 'string' ? v : JSON.stringify(v)}`);
const times = (c: ReturnType<typeof calcPlan>) => (c ? `알람 ${fmtClock(c.alarmAt)} · 준비 시작 ${fmtClock(c.prepStartAt)} · 출발 ${fmtClock(c.leaveAt)} | 준비 ${c.prep.val}분(${c.prep.basis}) · 기상 ${c.wake.val}분(${c.wake.basis})` : '계산하지 않음(null)');

it('사례 실행', () => {
  console.log('\n===== 정상 사례 =====');
  show('정상1 기록 없음: 09:00 도착, 이동 30, 여유 10, 준비 40, 기상 10', times(calcPlan(plan, DEFAULT_SETTINGS, [], [])));
  const five = [row(48, 14), row(52, 18), row(45, 12), row(55, 20), row(50, 15)];
  show('정상2 기록 5회(준비 45~55분, 기상 12~20분)', times(calcPlan(plan, DEFAULT_SETTINGS, five, [])));
  show('정상3 도착 판정: -7분 / 0분 / +3분', [judgeArrival(-7), judgeArrival(0), judgeArrival(3)]);

  console.log('\n===== 예외 사례 =====');
  show('예외1 기록 1회뿐(준비 60분)', rec(40, [60]));
  show('예외2 시연 기록·제외한 기록 5회는 추천에 쓰지 않음', times(calcPlan(plan, DEFAULT_SETTINGS, [row(90, 40, { demo: true }), row(90, 40, { excluded: true }), row(90, 40, { demo: true }), row(90, 40, { excluded: true }), row(90, 40, { demo: true })], [])));
  show('예외3 준비 단계가 하나도 없음', times(calcPlan({ ...plan, steps: [] }, DEFAULT_SETTINGS, [], [])));
  show('예외4 도착 시각이 이미 지남(어제 09:00, 지금 오늘 08:00)', `다음 도착 시각 → ${new Date(rollForward(at(9, 0) - 24 * 60 * MIN, at(8, 0))).toLocaleString('ko-KR')}`);
  show('예외5 한 번 크게 늦은 기록(준비 40,42,41,120,43)', rec(40, [40, 42, 41, 120, 43]));
  show('예외6 대중교통 응답이 비었거나 깨짐', { empty: parseTransit({}), garbage: parseTransit('오류'), coord: isValidCoord(999, 127) });
  show('예외7 초대 코드 오타(AB0CD1, abc)', [cleanCode('AB0CD1'), cleanCode('abc'), cleanCode('k7m-9pq')]);
  show('예외8 공유 상태가 오래됨(3분 전 / 20분 전)', [isStale(at(8, 0) - 3 * MIN, at(8, 0)), isStale(at(8, 0) - 20 * MIN, at(8, 0))]);
});
