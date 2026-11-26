import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { PlanCalc } from '../domain/schedule';
import { isGlowOn, tickSession } from '../domain/session';
import type { ChecklistItem } from '../domain/types';
import { buildChecklist } from '../domain/weather';
import { loadRaw, saveRaw } from '../infra/storage';
import { makeActions, type Actions, type Clock } from './actions';
import { useNativeAlarmSync } from './nativeAlarmSync';
import { endDraftState, tickQueueState } from './queueState';
import { usePushSync } from './pushSync';
import { useRoomSync } from './roomSync';
import { useShareSync } from './shareSync';
import { useTransitRecheck } from './transitRecheck';
import { calcOf, restoreState, type AppState } from './state';

export interface AppValue extends AppState {
  now: number; // 화면에서는 Date.now() 대신 이것을 쓴다(시연이면 60배로 흐른다)
  demo: boolean;
  calc: PlanCalc | null; // 지금 계획으로 계산한 알람·준비·출발 시각
  checklist: ChecklistItem[]; // 내가 적은 것 + 날씨 항목
  glow: boolean; // 붉은 조명을 켤지
  actions: Actions;
}

const Ctx = createContext<AppValue | null>(null);
const TICK_MS = 1000;
const DEMO_TICK_MS = 250;

// 시연 속도를 지원하는 시계. 속도를 바꿔도 시각이 튀지 않게 기준점을 다시 잡는다
function useClock(): Clock & { speed: () => number } {
  const ref = useRef({ s0: Date.now(), t0: Date.now(), speed: 1 });
  return useMemo(() => {
    const now = () => ref.current.s0 + (Date.now() - ref.current.t0) * ref.current.speed;
    return {
      now,
      speed: () => ref.current.speed,
      setSpeed: (speed: number) => {
        ref.current = { s0: now(), t0: Date.now(), speed };
      },
    };
  }, []);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const clock = useClock();
  const [state, setState] = useState<AppState>(() => endDraftState(restoreState(loadRaw(), Date.now())));
  const [now, setNow] = useState(() => clock.now());
  const [demo, setDemo] = useState(false);
  const actions = useMemo(() => makeActions(setState, clock), [clock]);

  useEffect(() => {
    const tick = () => {
      const t = clock.now();
      setNow(t);
      setDemo(clock.speed() !== 1);
      setState((s) => {
        const next = s.session ? tickSession(s.session, t) : null;
        const ticked = next === s.session ? s : { ...s, session: next };
        // 시연 시계(60배)로는 대기 중인 실제 약속을 건드리지 않는다
        return clock.speed() === 1 ? tickQueueState(ticked, t) : ticked;
      });
    };
    const id = setInterval(tick, demo ? DEMO_TICK_MS : TICK_MS);
    return () => clearInterval(id);
  }, [clock, demo]);

  useEffect(() => saveRaw(state), [state]);
  useShareSync(state, now, actions);
  useTransitRecheck(state, now, actions);
  usePushSync(state);
  useNativeAlarmSync(state);
  useRoomSync(state, now, actions);

  const calc = useMemo(() => calcOf(state), [state]);
  const checklist = useMemo(
    () => buildChecklist(state.memos, state.rain, state.weather, state.settings).filter((c) => !(state.hiddenChecks ?? []).includes(c.key)),
    [state.memos, state.rain, state.weather, state.settings, state.hiddenChecks],
  );
  const glow = state.settings.glow && isGlowOn(state.session, now, state.settings.preLeave);

  return <Ctx.Provider value={{ ...state, now, demo, calc, checklist, glow, actions }}>{children}</Ctx.Provider>;
}

export function useApp(): AppValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp은 AppProvider 안에서만 쓸 수 있어요');
  return v;
}
