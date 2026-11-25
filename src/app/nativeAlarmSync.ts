import { useEffect, useRef } from 'react';
import { buildPushSchedule } from '../domain/push';
import { isNativeApp, syncNativeAlarms } from '../infra/nativeAlarm';
import type { AppState } from './state';

// 설치 앱이면 알람·출발 시각이 바뀔 때마다 휴대폰 예약을 다시 건다(푸시와 같은 일정을 쓴다)
export function useNativeAlarmSync(state: AppState): void {
  const lastKey = useRef('');
  const { session, settings } = state;

  useEffect(() => {
    if (!isNativeApp()) return;
    const entries = buildPushSchedule(session, Date.now(), settings.preLeave);
    const key = JSON.stringify(entries.map((e) => e.at));
    if (key === lastKey.current) return;
    lastKey.current = key;
    void syncNativeAlarms(entries);
  }, [session, settings.preLeave]);
}
