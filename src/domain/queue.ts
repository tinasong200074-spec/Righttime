import type { Plan, Session } from './types.js';

// 약속을 여러 개 잡아 둘 때의 규칙. 진행은 한 번에 하나만 하고, 나머지는 대기 목록에 둔다.
// 맨 앞(front)은 항상 알람이 가장 이른 약속이다.

export interface Booked {
  id: string;
  plan: Plan;
  session: Session; // 알람을 켠 순간의 계산 결과
}

export interface Lineup {
  front: Booked | null;
  parked: Booked[];
}

const byAlarm = (a: Booked, b: Booked) => a.session.alarmAt - b.session.alarmAt;

// 맨 앞과 대기 목록을 알람이 이른 순서로 다시 세운다.
// 맨 앞이 이미 진행 중(알람이 울린 뒤)이면 건드리지 않고 대기 목록만 정렬한다
export function arrange(front: Booked | null, parked: Booked[]): Lineup {
  const sorted = [...parked].sort(byAlarm);
  if (front && front.session.state !== 'armed') return { front, parked: sorted };
  const all = front ? [front, ...sorted].sort(byAlarm) : sorted;
  return { front: all[0] ?? null, parked: all.slice(1) };
}

// 맨 앞 약속의 도착 시각이 지났는데 다음 약속의 알람 시각이 됐으면, 맨 앞을 접고 다음으로 넘긴다
export function shouldSkipFront(front: Session, parked: Booked[], now: number): boolean {
  const next = [...parked].sort(byAlarm)[0];
  return !!next && next.session.alarmAt <= now && front.arriveAt <= now;
}

// 새 약속을 적는 중에도 대기 중인 알람 시각이 되면 울려야 한다
export const parkedDue = (parked: Booked[], now: number) => parked.some((b) => b.session.alarmAt <= now);
