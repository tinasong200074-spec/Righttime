import { DAY, type Place, type RecordRow } from './types';

export const SAMPLE_PLACE: Place = { id: 'sample-place', name: '회사 (샘플)', travelMin: 30 };

const PREP = [58, 52, 61, 55, 49, 63, 57];
const LATENCY = [12, 8, 15, 5, 10, 18, 9];
const SNOOZE = [2, 1, 3, 1, 2, 3, 1];
const LEAVE_DIFF = [6, 3, 9, 2, -1, 11, 4];
const TRAVEL = [34, 38, 31, 41, 33, 45, 36];
const ARRIVAL = ['late', 'ontime', 'late', 'ontime', 'early', 'late', 'ontime'] as const;
const STEPS = [
  { name: '씻기', est: 15, share: 0.38 },
  { name: '옷 입기', est: 10, share: 0.22 },
  { name: '머리·메이크업', est: 10, share: 0.25 },
  { name: '짐 챙기기', est: 5, share: 0.15 },
];

// 기록 화면을 바로 볼 수 있게 넣는 7일치 샘플. sample 표시가 붙어 화면에서 구분된다
export function buildSampleRecords(now: number): RecordRow[] {
  const base = new Date(now);
  base.setHours(6, 50, 0, 0);
  return PREP.map((prep, i) => ({
    id: `sample-${i}`,
    date: base.getTime() - (7 - i) * DAY,
    title: '출근',
    latency: LATENCY[i],
    snoozeCount: SNOOZE[i],
    prepActual: prep,
    userPrep: 40,
    steps: STEPS.map((s) => ({ name: s.name, userEst: s.est, act: Math.round(prep * s.share * 10) / 10 })),
    leaveDiff: LEAVE_DIFF[i],
    placeId: SAMPLE_PLACE.id,
    placeName: SAMPLE_PLACE.name,
    travelActual: TRAVEL[i],
    arrival: ARRIVAL[i],
    demo: false,
    excluded: false,
    sample: true,
  }));
}
