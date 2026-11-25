import { fmtClock } from '../../domain/format';
import type { RoomMember } from '../../domain/room';
import { isStale, STAGE_ROWS, type ShareStage } from '../../domain/share';
import type { TimelineStep } from './types';

export type Mood = 'ontime' | 'late' | 'stale' | 'hidden' | 'arrived';

// 상대가 어떤 상태로 보이는지: 오래 갱신이 없으면 "확인 안 됨", 단계를 숨겼으면 "hidden"
export function moodOf(m: RoomMember, now: number): Mood {
  if (m.result || m.stage === 'arrived') return 'arrived';
  if (!m.stage) return 'hidden';
  if (isStale(m.updatedAtMs, now)) return 'stale';
  return m.lateMin ? 'late' : 'ontime';
}

const ORDER = STAGE_ROWS.map((r) => r.id);

export interface Scene {
  steps: TimelineStep[];
  stages: number;
  stageNow: number;
}

// 일어남 → 준비 중 → 곧 출발 → 이동 중 → 도착. 알 수 있는 시각은 도착 예정뿐이라 나머지 시각은 비운다
export function sceneOf(m: RoomMember): Scene {
  const cur = m.stage ? ORDER.indexOf(m.stage as ShareStage) : 0;
  const total = m.stepCount ?? 0;
  const idx = m.stepIdx ?? 0;
  const steps = STAGE_ROWS.map<TimelineStep>((r, i) => {
    const status = m.stage === 'arrived' || i < cur ? 'done' : i === cur ? 'now' : 'next';
    const step: TimelineStep = { label: r.label, time: r.id === 'arrived' && m.etaMs !== null ? fmtClock(m.etaMs) : '', status };
    if (r.id === 'prep' && status === 'now' && total > 0) {
      step.note = `${idx + 1}/${total} 단계`;
      step.progress = 0.5;
    }
    return step;
  });
  return { steps, stages: Math.max(1, total), stageNow: idx + 1 };
}
