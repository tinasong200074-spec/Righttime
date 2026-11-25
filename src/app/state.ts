import { buildSampleRecords, SAMPLE_PLACE } from '../domain/sample';
import { calcPlan, rollForward } from '../domain/schedule';
import { createSession, toRecord } from '../domain/session';
import { splitMemoText } from '../domain/weather';
import type { AskItem, HelperResult } from '../domain/ai';
import {
  DEFAULT_SETTINGS, MIN,
  type MemoItem, type Place, type Plan, type RainChoice, type RecordRow, type Session, type Settings, type Tone, type WeatherResult,
} from '../domain/types';

// 기기에 저장되는 전체 상태. 서버로 보내는 것은 없다
export interface AppState {
  settings: Settings;
  plan: Plan;
  places: Place[];
  memos: MemoItem[];
  records: RecordRow[];
  rain: RainChoice;
  weather: WeatherResult | null;
  weatherCoord: { lat: number; lon: number } | null; // 약 1km 단위로 줄인 내 위치(날씨용)
  tone: Tone;
  session: Session | null;
  planBackup: Plan | null; // 시연이 끝나면 되돌릴 원래 계획
  share: ShareState | null; // 준비 현황 링크 공유 중이면 값이 있다
  shareName: string; // 상대에게 보일 내 이름
  helper: HelperResult | null; // 일정 준비 도우미가 읽은 결과(사진·글 원본은 저장하지 않는다)
  helperDone: Record<string, boolean>; // 준비할 것·전날 할 일 체크
}

export interface ShareState {
  token: string;
  writeKey: string; // 이 기기만 아는 쓰기 키
  showStage: boolean;
  showEta: boolean;
  expiresAt: number;
}

export const uid = () => Math.random().toString(36).slice(2, 9);

function tomorrowNine(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

export function defaultState(now: number): AppState {
  return {
    settings: { ...DEFAULT_SETTINGS },
    plan: {
      title: '',
      arriveAt: tomorrowNine(now),
      rideMin: 30,
      waitMin: 5,
      kind: 'interview',
      steps: [
        { id: 's1', name: '씻기', est: 15 },
        { id: 's2', name: '옷 입기', est: 10 },
        { id: 's3', name: '머리·메이크업', est: 10 },
        { id: 's4', name: '짐 챙기기', est: 5 },
      ],
    },
    places: [],
    memos: [],
    records: [],
    rain: 'auto',
    weather: null,
    weatherCoord: null,
    tone: { mode: 'polite' },
    session: null,
    planBackup: null,
    share: null,
    shareName: '',
    helper: null,
    helperDone: {},
  };
}

// 저장된 값을 기본값 위에 덮는다. 시연 중에 닫혔으면 시연을 정리하고, 지난 일정은 앞으로 옮긴다
export function restoreState(raw: unknown, now: number): AppState {
  const base = defaultState(now);
  if (!raw || typeof raw !== 'object') return base;
  const saved = raw as Partial<AppState>;
  let s: AppState = { ...base, ...saved, settings: { ...base.settings, ...saved.settings }, plan: { ...base.plan, ...saved.plan } };
  if (s.session?.demo) s = { ...s, session: null, plan: s.planBackup ?? s.plan, planBackup: null };
  if (!s.session) s = { ...s, plan: { ...s.plan, arriveAt: rollForward(s.plan.arriveAt || base.plan.arriveAt, now) } };
  return s;
}

export const calcOf = (s: AppState) => calcPlan(s.plan, s.settings, s.records, s.places);

export function armState(s: AppState, now: number, demo: boolean): AppState {
  const c = calcOf(s);
  if (!c || c.arriveAt <= now) return s;
  return { ...s, session: createSession(c, s.plan.title, now, demo) };
}

export function addMemosState(s: AppState, text: string): AppState {
  const fresh = splitMemoText(text)
    .filter((m, i, arr) => arr.findIndex((x) => x.text === m.text) === i)
    .filter((m) => !s.memos.some((x) => x.text === m.text))
    .map((m) => ({ id: uid(), text: m.text, ask: m.ask, pin: false, src: 'user' as const }));
  return fresh.length ? { ...s, memos: [...s.memos, ...fresh] } : s;
}

// AI가 나눈 항목을 챙길 것에 담는다(이미 있는 것은 건너뛴다)
export function addMemoItemsState(s: AppState, items: AskItem[], src: NonNullable<MemoItem['src']>): AppState {
  const fresh = items
    .filter((m) => m.item && !s.memos.some((x) => x.text === m.item))
    .map((m) => ({ id: uid(), text: m.item, ask: m.ask, pin: false, src }));
  return fresh.length ? { ...s, memos: [...s.memos, ...fresh] } : s;
}

// 기록을 저장하고 세션을 끝낸다. "오늘만" 메모는 비우고 다음 날 일정으로 넘긴다
export function saveRecordState(s: AppState, now: number, excluded: boolean): AppState {
  if (!s.session) return s;
  const record = toRecord(s.session, uid(), excluded);
  const records = [...s.records, record];
  if (s.session.demo) return { ...s, records, session: null, plan: s.planBackup ?? s.plan, planBackup: null };
  const plan = { ...s.plan, arriveAt: rollForward(s.plan.arriveAt, now) };
  return { ...s, records, session: null, plan, memos: s.memos.filter((m) => m.pin) };
}

const DEMO_AHEAD_MIN = 95;

export function startDemoState(s: AppState, now: number): AppState {
  if (s.session && !s.session.demo) return s; // 진행 중인 준비가 있으면 시연하지 않는다
  const plan: Plan = { ...s.plan, title: '시연', placeId: undefined, rideMin: 25, waitMin: 0, arriveAt: now + DEMO_AHEAD_MIN * MIN };
  return armState({ ...s, planBackup: s.planBackup ?? s.plan, plan, session: null }, now, true);
}

export function endDemoState(s: AppState, now: number): AppState {
  const plan = s.planBackup ?? s.plan;
  return { ...s, session: null, planBackup: null, plan: { ...plan, arriveAt: rollForward(plan.arriveAt, now) } };
}

export function loadSampleState(s: AppState, now: number): AppState {
  const places = s.places.some((p) => p.id === SAMPLE_PLACE.id) ? s.places : [...s.places, SAMPLE_PLACE];
  const records = [...buildSampleRecords(now), ...s.records.filter((r) => !r.sample)];
  return { ...s, places, records, plan: { ...s.plan, placeId: s.plan.placeId ?? SAMPLE_PLACE.id } };
}
