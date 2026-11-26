import { arrange, parkedDue, shouldSkipFront, type Booked } from '../domain/queue';
import { freshPlan } from '../domain/recent';
import { uid, type AppState } from './state';

// 약속 여러 개: 화면에 보이는 plan·session이 "맨 앞"이고, 나머지는 parked에 대기한다.
const FRONT_ID = 'front';

// 맨 앞과 대기 목록을 알람이 이른 순서로 다시 세운다. 새 약속을 적는 중이거나 시연 중에는 건드리지 않는다
export function settleQueue(s: AppState): AppState {
  const parked = s.parked ?? [];
  if (s.drafting || parked.length === 0 || s.session?.demo) return s;
  const front: Booked | null = s.session ? { id: FRONT_ID, plan: s.plan, session: s.session } : null;
  const r = arrange(front, parked);
  if (!r.front) return s;
  if (r.front.id === FRONT_ID) return { ...s, parked: r.parked };
  // 맨 앞이 바뀌었다. 밀려난 약속은 번호를 새로 받아 대기 목록으로 간다
  const rest = r.parked.map((b) => (b.id === FRONT_ID ? { ...b, id: uid() } : b));
  return { ...s, plan: r.front.plan, session: r.front.session, parked: rest, weather: null };
}

// 알람이 켜진 약속을 대기 목록으로 옮기고, 빈 일정으로 새 약속을 적기 시작한다
export function startNewPlanState(s: AppState, now: number): AppState {
  if (s.session && (s.session.demo || s.session.state !== 'armed')) return s;
  const parked = s.session ? [...(s.parked ?? []), { id: uid(), plan: s.plan, session: s.session }] : (s.parked ?? []);
  if (parked.length === 0) return s;
  return { ...s, parked, session: null, plan: freshPlan(s.plan, now), drafting: true, weather: null, helper: null, helperDone: {} };
}

// 새 약속 적기를 끝낸다(알람을 켰거나 그만뒀을 때). 가장 이른 약속이 맨 앞으로 온다
export const endDraftState = (s: AppState): AppState => settleQueue({ ...s, drafting: false });

export const removeParkedState = (s: AppState, id: string): AppState => ({ ...s, parked: (s.parked ?? []).filter((b) => b.id !== id) });

// 1초마다: 대기 중인 알람 시각이 됐는데 화면이 다른 일을 하고 있으면 순서를 바로잡는다
export function tickQueueState(s: AppState, now: number): AppState {
  const parked = s.parked ?? [];
  if (parked.length === 0 || s.session?.demo) return s;
  if (s.drafting) return parkedDue(parked, now) ? endDraftState(s) : s; // 적던 새 약속은 버리고 알람을 울린다
  if (!s.session) return settleQueue(s);
  // 맨 앞 약속의 도착 시각이 지났고 다음 알람 시각이 됐으면, 기록 없이 접고 다음으로 넘긴다
  return shouldSkipFront(s.session, parked, now) ? settleQueue({ ...s, session: null }) : s;
}
