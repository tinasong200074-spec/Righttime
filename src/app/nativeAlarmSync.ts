import { useEffect, useRef } from 'react';
import { buildPushSchedule } from '../domain/push';
import { isNativeApp, syncNativeAlarms } from '../infra/nativeAlarm';
import type { AppState } from './state';

// 설치 앱이면 알람·출발 시각이 바뀔 때마다 휴대폰 예약을 다시 건다(푸시와 같은 일정을 쓴다)
export function useNativeAlarmSync(state: AppState): void {
  const lastKey = useRef('');
  const { session, settings, parked } = state;

  useEffect(() => {
    if (!isNativeApp()) return;
    // 대기 중인 약속의 알람도 함께 건다
    const entries = [session, ...(parked ?? []).map((b) => b.session)].flatMap((x) => buildPushSchedule(x, Date.now(), settings.preLeave)).sort((a, b) => a.at - b.at);
    const key = JSON.stringify(entries.map((e) => e.at));
    if (key === lastKey.current) return;
    lastKey.current = key;
    void syncNativeAlarms(entries);
  }, [session, settings.preLeave, parked]);
}
