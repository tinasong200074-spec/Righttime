import { useEffect, useRef } from 'react';
import { MIN, type ChecklistItem, type Session, type Settings } from '../../domain/types';
import { notify, startAlarmSound, stopAlarmSound } from '../../infra/alarm';
import { stepOverMin } from './progress';

// 알람 소리, 단계 초과, 출발 임박 알림. 한 번 울린 알림은 같은 단계·같은 세션에서 다시 울리지 않는다.
export function useMorningAlerts(s: Session, now: number, settings: Settings, checklist: ChecklistItem[]): void {
  const overStep = useRef(-1);
  const preLeaveDone = useRef(false);

  useEffect(() => {
    if (s.state !== 'ringing') return;
    if (settings.sound) startAlarmSound();
    // 알림창은 처음 울릴 때만. 미룬 뒤 다시 울릴 때는 소리와 진동만 쓴다.
    if (s.snoozeCount === 0) notify('알람', '일어날 시간이에요', { sound: false });
    return stopAlarmSound;
  }, [s.state, s.snoozeCount, settings.sound]);

  useEffect(() => {
    const step = s.steps[s.stepIdx];
    if (!step || stepOverMin(s, now) <= 0 || overStep.current === s.stepIdx) return;
    overStep.current = s.stepIdx;
    notify(`${step.name} 예상 시간이 지났어요`, `예상은 ${Math.round(step.est)}분이었어요`, { sound: settings.sound });
  }, [s, now, settings.sound]);

  useEffect(() => {
    const active = s.state === 'prep' || s.state === 'check';
    if (!active || preLeaveDone.current || (s.leaveAt - now) / MIN > settings.preLeave) return;
    preLeaveDone.current = true;
    const asks = checklist.map((c) => c.ask).join(' ');
    notify(`출발 ${settings.preLeave}분 전이에요`, asks || '나갈 준비를 마무리해 주세요', { sound: settings.sound });
  }, [s, now, settings.preLeave, settings.sound, checklist]);
}
