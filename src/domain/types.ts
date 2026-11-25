// 명세 13장 기준. 서버가 필요한 소셜·보호자 타입은 이번 범위에서 뺐다.

export interface Settings {
  buffer: number; // 도착 여유(분)
  snooze: number;
  latency: number; // 알람 후 준비 시작까지 평소 시간(분)
  preLeave: number; // 출발 몇 분 전부터 알림·붉은 조명
  sound: boolean;
  rainTh: number; // 강수 확률 기준(%)
  eveHour: number;
  weatherAuto: boolean;
  coldTh: number;
  hotTh: number;
  glow: boolean;
}

export interface Place {
  id: string;
  name: string;
  travelMin: number; // 평소 이동 시간(직접 입력)
  geo?: { lat: number; lon: number; r: number };
}

export interface Step {
  id: string;
  name: string;
  est: number; // 예상 분
}

export type PlanKind = 'interview' | 'exam' | 'present' | 'meet' | 'class' | 'etc';

export interface Plan {
  title: string;
  arriveAt: number;
  placeId?: string;
  rideMin: number; // 장소를 고르지 않았을 때 쓰는 이동 시간(분)
  waitMin: number; // 배차 대기(분). 대중교통 연동 전까지 직접 입력
  steps: Step[];
  kind: PlanKind;
  notes?: string;
}

export interface SessionStep extends Step {
  userEst: number; // 추천 반영 전 사용자가 입력한 분
}

export interface StepLog {
  name: string;
  userEst: number;
  act: number | null; // 건너뛰면 null
  skipped?: boolean;
}

export type SessionState = 'armed' | 'ringing' | 'snoozed' | 'prep' | 'check' | 'travel' | 'summary';
export type Arrival = 'early' | 'ontime' | 'late';
export type GeoStatus = 'none' | 'checking' | 'match' | 'mismatch' | 'unavailable';
export interface GeoResult {
  status: GeoStatus;
  dist?: number;
}

// 알람을 켠 순간의 계산 결과를 담아 둔다(진행 중에 계획이 바뀌어도 흔들리지 않게)
export interface Session {
  state: SessionState;
  title: string;
  arriveAt: number;
  alarmAt: number;
  leaveAt: number;
  prepStartPlanAt: number;
  travelMin: number; // 이동 + 배차 대기
  buffer: number;
  wakeMin: number; // 예상 기상 시간(분)
  placeId?: string;
  placeName: string;
  steps: SessionStep[];
  userPrep: number;
  firstRingAt?: number;
  nextRingAt?: number;
  snoozeCount: number;
  latency?: number;
  prepStartAt?: number;
  stepIdx: number;
  stepStartAt?: number;
  log: StepLog[];
  leftAt?: number;
  arrivedAt?: number;
  arrival?: Arrival; // 도착 버튼을 못 눌렀을 때 직접 고른 값
  geo?: GeoResult;
  checked: Record<string, boolean>; // 챙길 것 체크(세션별)
  demo: boolean;
}

export interface RecordRow {
  id: string;
  date: number;
  title: string;
  latency: number;
  snoozeCount: number;
  prepActual: number;
  userPrep: number;
  steps: StepLog[];
  leaveDiff: number;
  placeId?: string;
  placeName?: string;
  travelActual?: number;
  arriveDiff?: number;
  arrival?: Arrival;
  geoStatus?: GeoStatus;
  geoDist?: number;
  demo: boolean;
  excluded: boolean;
  sample?: boolean;
}

export interface MemoItem {
  id: string;
  text: string;
  ask: string;
  pin: boolean; // true면 매일, false면 오늘만
  src?: 'user' | 'weather' | 'notice' | 'general'; // notice=안내문에 적힌 것, general=AI 제안
}

export type ToneMode = 'polite' | 'casual' | 'short' | 'formal' | 'custom';
export interface ToneTemplates {
  eta: string;
  late: string;
  maybe: string;
  arrive: string;
}
export interface Tone {
  mode: ToneMode;
  samples?: string;
  custom?: ToneTemplates;
}

export type RainChoice = 'auto' | 'none' | 'maybe' | 'yes';

export interface HourWeather {
  timeMs: number;
  prob: number | null; // 강수 확률(%)
  precip: number | null; // 강수량(mm)
  apparent: number | null; // 체감온도(°C)
  code: number | null; // WMO 날씨 코드
}

export interface WeatherResult {
  ok: boolean;
  rain: boolean;
  prob: number;
  minT: number | null;
  maxT: number | null;
  cloth?: { text: string; ask: string };
  line: string; // "춥고 비가 와요 · 체감 4°C · 비 70%"
}

export interface ChecklistItem {
  key: string;
  text: string;
  ask: string;
  src: 'user' | 'weather';
}

export const DEFAULT_SETTINGS: Settings = {
  buffer: 5,
  snooze: 5,
  latency: 10,
  preLeave: 5,
  sound: true,
  rainTh: 50,
  eveHour: 21,
  weatherAuto: true,
  coldTh: 12,
  hotTh: 28,
  glow: true,
};

export const MIN = 60_000;
export const DAY = 24 * 60 * MIN;
