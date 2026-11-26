import { useEffect, useRef } from 'react';
import { MIN, type Session, type Settings } from '../../domain/types';
import { notify, startAlarmSound, stopAlarmSound } from '../../infra/alarm';

// 알람 소리와 출발 전 알림. 출발 전 알림은 시각마다 한 번만 울린다.
export function useMorningAlerts(s: Session, now: number, settings: Settings): void {
  const done = useRef(new Set<number>());

  useEffect(() => {
    if (s.state !== 'ringing') return;
    if (settings.sound) startAlarmSound();
    // 알림창은 처음 울릴 때만. 미룬 뒤 다시 울릴 때는 소리와 진동만 쓴다.
    if (s.snoozeCount === 0) notify('알람', '시작할 시간이에요', { sound: false });
    return stopAlarmSound;
  }, [s.state, s.snoozeCount, settings.sound]);

  // 출발 30분 전, 15분 전, preLeave분 전. 이미 지난 시각의 알림은 한꺼번에 울리지 않고 가장 가까운 하나만 울린다.
  useEffect(() => {
    if (s.state !== 'prep' && s.state !== 'check') return;
    const left = (s.leaveAt - now) / MIN;
    const crossed = [30, 15, settings.preLeave].filter((m) => left <= m && !done.current.has(m));
    if (!crossed.length) return;
    crossed.forEach((m) => done.current.add(m));
    const m = Math.min(...crossed);
    // 챙길 것은 여기서 알리지 않는다. 출발 단계로 넘어갈 때 따로 묻는다(LeaveAsk)
    notify(`출발 ${m}분 전이에요`, '슬슬 준비해 주세요', { sound: settings.sound });
  }, [s.state, s.leaveAt, now, settings.preLeave, settings.sound]);
}
