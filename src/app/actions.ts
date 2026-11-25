import * as S from '../domain/session';
import type { Arrival, GeoResult, MemoItem, Place, Plan, RainChoice, Settings, Tone, WeatherResult } from '../domain/types';
import type { AskItem, HelperResult } from '../domain/ai';
import { addMemoItemsState, addMemosState, armState, defaultState, endDemoState, loadSampleState, saveRecordState, startDemoState, type AppState } from './state';

type SetState = (fn: (s: AppState) => AppState) => void;

export interface Clock {
  now(): number;
  setSpeed(speed: number): void;
}

export const DEMO_SPEED = 60; // 시연: 1초가 1분

// 세션이 있을 때만 바꾼다
const onSession = (set: SetState, fn: (x: NonNullable<AppState['session']>) => AppState['session']) =>
  set((s) => (s.session ? { ...s, session: fn(s.session) } : s));

function sessionActions(set: SetState, clock: Clock) {
  return {
    arm: () => set((s) => armState(s, clock.now(), false)),
    snooze: () => set((s) => (s.session ? { ...s, session: S.snooze(s.session, clock.now(), s.settings.snooze) } : s)),
    startPrep: () => onSession(set, (x) => S.startPrep(x, clock.now())),
    completeStep: () => onSession(set, (x) => S.completeStep(x, clock.now())),
    skipStep: () => onSession(set, (x) => S.completeStep(x, clock.now(), true)),
    finishEarly: () => onSession(set, (x) => S.finishEarly(x, clock.now())),
    depart: () => onSession(set, (x) => S.depart(x, clock.now())),
    arrive: () => onSession(set, (x) => S.arrive(x, clock.now())),
    setGeo: (geo: GeoResult) => onSession(set, (x) => S.setGeo(x, geo)),
    skipArrival: (arrival: Arrival) => onSession(set, (x) => S.skipArrival(x, arrival)),
    toggleCheck: (key: string) => onSession(set, (x) => ({ ...x, checked: { ...x.checked, [key]: !x.checked[key] } })),
    cancelSession: () => set((s) => ({ ...s, session: null })),
    saveRecord: (excluded: boolean) =>
      set((s) => {
        if (s.session?.demo) clock.setSpeed(1);
        return saveRecordState(s, clock.now(), excluded);
      }),
  };
}

function dataActions(set: SetState, clock: Clock) {
  return {
    updatePlan: (p: Partial<Plan>) => set((s) => ({ ...s, plan: { ...s.plan, ...p } })),
    updateSettings: (p: Partial<Settings>) => set((s) => ({ ...s, settings: { ...s.settings, ...p } })),
    savePlace: (p: Place) =>
      set((s) => ({ ...s, places: s.places.some((x) => x.id === p.id) ? s.places.map((x) => (x.id === p.id ? p : x)) : [...s.places, p] })),
    removePlace: (id: string) =>
      set((s) => ({
        ...s,
        places: s.places.filter((x) => x.id !== id),
        plan: s.plan.placeId === id ? { ...s.plan, placeId: undefined } : s.plan,
      })),
    addMemos: (text: string) => set((s) => addMemosState(s, text)),
    addMemoItems: (items: AskItem[], src: NonNullable<MemoItem['src']>) => set((s) => addMemoItemsState(s, items, src)),
    setHelper: (helper: HelperResult | null) => set((s) => ({ ...s, helper, helperDone: {} })),
    toggleHelperDone: (key: string) => set((s) => ({ ...s, helperDone: { ...s.helperDone, [key]: !s.helperDone[key] } })),
    removeMemo: (id: string) => set((s) => ({ ...s, memos: s.memos.filter((m) => m.id !== id) })),
    toggleMemoPin: (id: string) => set((s) => ({ ...s, memos: s.memos.map((m) => (m.id === id ? { ...m, pin: !m.pin } : m)) })),
    setRain: (rain: RainChoice) => set((s) => ({ ...s, rain })),
    setWeather: (weather: WeatherResult | null) => set((s) => ({ ...s, weather })),
    setWeatherCoord: (weatherCoord: AppState['weatherCoord']) => set((s) => ({ ...s, weatherCoord, weather: null })),
    setTone: (p: Partial<Tone>) => set((s) => ({ ...s, tone: { ...s.tone, ...p } })),
    toggleRecordExcluded: (id: string) =>
      set((s) => ({ ...s, records: s.records.map((r) => (r.id === id ? { ...r, excluded: !r.excluded } : r)) })),
    removeRecord: (id: string) => set((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) })),
    loadSampleData: () => set((s) => loadSampleState(s, clock.now())),
    clearSampleData: () => set((s) => ({ ...s, records: s.records.filter((r) => !r.sample) })),
    clearAllData: () => {
      clock.setSpeed(1);
      set(() => defaultState(clock.now()));
    },
  };
}

function demoActions(set: SetState, clock: Clock) {
  return {
    startDemo: () => {
      clock.setSpeed(DEMO_SPEED);
      set((s) => startDemoState(s, clock.now()));
    },
    endDemo: () => {
      clock.setSpeed(1);
      set((s) => endDemoState(s, clock.now()));
    },
  };
}

export function makeActions(set: SetState, clock: Clock) {
  return { ...sessionActions(set, clock), ...dataActions(set, clock), ...demoActions(set, clock) };
}

export type Actions = ReturnType<typeof makeActions>;
