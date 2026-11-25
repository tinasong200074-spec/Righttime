import { useEffect, useRef } from 'react';
import { buildPushSchedule } from '../domain/push';
import { syncPush } from '../infra/push';
import type { AppState } from './state';

// 푸시를 켜 두었으면 알람·출발 시각이 바뀔 때마다 예약을 다시 올린다
export function usePushSync(state: AppState): void {
  const lastKey = useRef('');
  const { pushEndpoint, session, settings } = state;

  useEffect(() => {
    if (!pushEndpoint) {
      lastKey.current = '';
      return;
    }
    // 실제 시각 기준으로 지난 알림을 거른다(시연은 buildPushSchedule에서 빠진다)
    const entries = buildPushSchedule(session, Date.now(), settings.preLeave);
    const key = pushEndpoint + JSON.stringify(entries.map((e) => e.at));
    if (key === lastKey.current) return;
    lastKey.current = key;
    void syncPush(pushEndpoint, entries);
  }, [pushEndpoint, session, settings.preLeave]);
}
