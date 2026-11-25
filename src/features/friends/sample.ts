// 예시 데이터. 계정과 서버가 붙기 전이라 실제 친구와는 연결되지 않는다.
export type FriendState = 'ontime' | 'late' | 'unknown';

export interface Tally {
  kept: number;
  late: number;
}

export interface Friend {
  id: string;
  name: string;
  count: number; // 함께한 약속
  live: boolean; // 지금 준비 중
  me: Tally;
  them: Tally;
  state: FriendState;
}

export const SAMPLE_FRIENDS: Friend[] = [
  { id: 'jimin', name: '지민', count: 9, live: true, me: { kept: 7, late: 2 }, them: { kept: 8, late: 1 }, state: 'ontime' },
  { id: 'minsu', name: '민수', count: 4, live: false, me: { kept: 3, late: 1 }, them: { kept: 4, late: 0 }, state: 'late' },
  { id: 'seoyeon', name: '서연', count: 12, live: false, me: { kept: 10, late: 2 }, them: { kept: 9, late: 3 }, state: 'unknown' },
];

export type StepStatus = 'done' | 'now' | 'next';

export interface TimelineStep {
  label: string;
  time: string;
  status: StepStatus;
  note?: string;
  progress?: number; // 지금 단계의 진행(0~1)
}

export interface Scene {
  etaText: string;
  detail: string; // 약속 시각과 차이
  steps: TimelineStep[];
  stages: number; // 준비 단계 수(진행 막대 칸 수)
  stageNow: number; // 지금 몇 번째 단계인지(1부터)
}

// 상태별 예시 장면(목업 3·4·5번)
export const SCENES: Record<FriendState, Scene> = {
  ontime: {
    etaText: '18:55',
    detail: '약속 19:00 · 5분 일찍',
    stages: 4,
    stageNow: 2,
    steps: [
      { label: '일어남', time: '17:31', status: 'done' },
      { label: '준비 중', time: '17:40~', status: 'now', note: '옷 입기 · 2/4', progress: 0.55 },
      { label: '출발', time: '18:25', status: 'next' },
      { label: '이동 중', time: '25분', status: 'next' },
      { label: '도착', time: '18:55', status: 'next' },
    ],
  },
  late: {
    etaText: '19:10',
    detail: '약속 19:00 · 10분 늦음',
    stages: 4,
    stageNow: 3,
    steps: [
      { label: '일어남', time: '17:42', status: 'done' },
      { label: '준비 중', time: '17:55~', status: 'now', note: '머리·메이크업 · 3/4', progress: 0.2 },
      { label: '출발', time: '18:40', status: 'next' },
      { label: '이동 중', time: '30분', status: 'next' },
      { label: '도착', time: '19:10', status: 'next' },
    ],
  },
  unknown: {
    etaText: '18:55',
    detail: '18분 전',
    stages: 4,
    stageNow: 2,
    steps: [
      { label: '일어남', time: '17:31', status: 'done' },
      { label: '준비 중', time: '17:40~', status: 'now', note: '옷 입기 · 2/4 · 18분 전 기준' },
      { label: '출발', time: '모름', status: 'next' },
      { label: '도착', time: '모름', status: 'next' },
    ],
  },
};
