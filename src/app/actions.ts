import { setPlaceTag } from '../domain/repeat';
import * as S from '../domain/session';
import { setHome, toggleFav, touchSpot, type Spot } from '../domain/spots';
import { addTransitLog } from '../domain/transitLog';
import type { Arrival, GeoResult, MemoItem, Place, Plan, RainChoice, Settings, Tone, WeatherResult } from '../domain/types';
import type { AskItem, HelperResult } from '../domain/ai';
import { endDraftState, removeParkedState, startEditState, startNewPlanState } from './queueState';
import { addMemoItemsState, addMemosState, applyRecentState, armState, defaultState, endDemoState, loadSampleState, saveRecordState, startDemoState, type AppState, type RoomState, type ShareState } from './state';

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
    // 알람을 켜면 대기 목록과 함께 다시 줄을 세운다(가장 이른 약속이 맨 앞)
    arm: () =>
      set((s) => {
        const next = armState(s, clock.now(), false);
        return next.session ? endDraftState(next) : next;
      }),
    snooze: () => set((s) => (s.session ? { ...s, session: S.snooze(s.session, clock.now(), s.settings.snooze) } : s)),
    startPrep: () => onSession(set, (x) => S.startPrep(x, clock.now())),
    completeStep: () => onSession(set, (x) => S.completeStep(x, clock.now())),
    skipStep: () => onSession(set, (x) => S.completeStep(x, clock.now(), true)),
    finishEarly: () => onSession(set, (x) => S.finishEarly(x, clock.now())),
    depart: () => onSession(set, (x) => S.depart(x, clock.now())),
    arrive: () => onSession(set, (x) => S.arrive(x, clock.now())),
    setGeo: (geo: GeoResult) => onSession(set, (x) => S.setGeo(x, geo)),
    skipArrival: (arrival: Arrival) => onSession(set, (x) => S.skipArrival(x, arrival)),
    applyTransit: (rideMin: number | null, checked: number) => onSession(set, (x) => S.applyTransitCheck(x, rideMin, checked)),
    toggleCheck: (key: string) => onSession(set, (x) => ({ ...x, checked: { ...x.checked, [key]: !x.checked[key] } })),
    cancelSession: () => set((s) => endDraftState({ ...s, session: null })),
    startNewPlan: () => set((s) => startNewPlanState(s, clock.now())),
    cancelDraft: () => set(endDraftState),
    startEdit: (id?: string) => set((s) => startEditState(s, id)),
    removeParked: (id: string) => set((s) => removeParkedState(s, id)),
    saveRecord: (excluded: boolean) =>
      set((s) => {
        if (s.session?.demo) clock.setSpeed(1);
        return endDraftState(saveRecordState(s, clock.now(), excluded));
      }),
  };
}

function dataActions(set: SetState, clock: Clock) {
  return {
    updatePlan: (p: Partial<Plan>) => set((s) => ({ ...s, plan: { ...s.plan, ...p } })),
    updateSettings: (p: Partial<Settings>) => set((s) => ({ ...s, settings: { ...s.settings, ...p } })),
    savePlace: (p: Place) =>
      set((s) => ({ ...s, places: s.places.some((x) => x.id === p.id) ? s.places.map((x) => (x.id === p.id ? p : x)) : [...s.places, p] })),
    setPlaceTag: (placeId: string, tag: string) => set((s) => ({ ...s, places: setPlaceTag(s.places, placeId, tag) })),
    removePlace: (id: string) =>
      set((s) => ({
        ...s,
        places: s.places.filter((x) => x.id !== id),
        plan: s.plan.placeId === id ? { ...s.plan, placeId: undefined } : s.plan,
      })),
    applyRecent: (id: string) => set((s) => applyRecentState(s, id, clock.now())),
    addMemos: (text: string) => set((s) => addMemosState(s, text)),
    addMemoItems: (items: AskItem[], src: NonNullable<MemoItem['src']>) => set((s) => addMemoItemsState(s, items, src)),
    setHelper: (helper: HelperResult | null) => set((s) => ({ ...s, helper, helperDone: {} })),
    toggleHelperDone: (key: string) => set((s) => ({ ...s, helperDone: { ...s.helperDone, [key]: !s.helperDone[key] } })),
    removeMemo: (id: string) => set((s) => ({ ...s, memos: s.memos.filter((m) => m.id !== id) })),
    // 체크리스트에서 지우기: 내가 적은 것은 메모를 지우고, 날씨 항목은 이번 약속에서만 숨긴다
    removeCheck: (key: string) =>
      set((s) =>
        s.memos.some((m) => m.id === key)
          ? { ...s, memos: s.memos.filter((m) => m.id !== key) }
          : { ...s, hiddenChecks: [...(s.hiddenChecks ?? []), key] },
      ),
    toggleMemoPin: (id: string) => set((s) => ({ ...s, memos: s.memos.map((m) => (m.id === id ? { ...m, pin: !m.pin } : m)) })),
    // 대중교통 시간을 조회할 때마다 부른다. 실제 시각으로 남긴다(시연 시계가 아니라)
    logTransit: (placeId: string, rideMin: number) =>
      set((s) => ({ ...s, transitLog: addTransitLog(s.transitLog ?? [], { placeId, at: Date.now(), rideMin }) })),
    setOrigin: (origin: AppState['origin']) => set((s) => ({ ...s, origin })),
    // 검색 기록은 실제 시각으로 남긴다(시연 시계가 아니라)
    touchSpot: (spot: Omit<Spot, 'usedAt' | 'fav' | 'home'>) => set((s) => ({ ...s, spots: touchSpot(s.spots ?? [], spot, Date.now()) })),
    toggleSpotFav: (key: string) => set((s) => ({ ...s, spots: toggleFav(s.spots ?? [], key) })),
    setSpotHome: (key: string) => set((s) => ({ ...s, spots: setHome(s.spots ?? [], key) })),
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

function shareActions(set: SetState) {
  return {
    removeRecent: (id: string) => set((s) => ({ ...s, recentPlans: (s.recentPlans ?? []).filter((r) => r.id !== id) })),
    setPushEndpoint: (pushEndpoint: string | null) => set((s) => ({ ...s, pushEndpoint })),
    setRoom: (room: RoomState | null) => set((s) => ({ ...s, room })),
    setShareName: (shareName: string) => set((s) => ({ ...s, shareName })),
    startShare: (share: ShareState) => set((s) => ({ ...s, share })),
    updateShare: (p: Partial<Pick<ShareState, 'showStage' | 'showEta'>>) => set((s) => (s.share ? { ...s, share: { ...s.share, ...p } } : s)),
    stopShare: () => set((s) => ({ ...s, share: null })),
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
      set((s) => endDraftState(endDemoState(s, clock.now())));
    },
  };
}

export function makeActions(set: SetState, clock: Clock) {
  return { ...sessionActions(set, clock), ...dataActions(set, clock), ...shareActions(set), ...demoActions(set, clock) };
}

export type Actions = ReturnType<typeof makeActions>;
