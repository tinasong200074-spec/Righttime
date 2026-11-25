import { useEffect, useRef } from 'react';
import { transitChecksDue } from '../domain/session';
import { fetchTransit } from '../infra/transit';
import type { Actions } from './actions';
import type { AppState } from './state';

// 카카오는 "지금 출발" 기준 시간만 준다. 그래서 전날 밤에 잡은 이동 시간을
// 알람이 울린 뒤와 출발 30분·10분 전에 다시 조회해서 달라졌으면 출발 시각을 고친다
export function useTransitRecheck(state: AppState, now: number, actions: Actions): void {
  const busy = useRef(false);
  const { session, origin, places } = state;

  useEffect(() => {
    if (!session || busy.current) return;
    const due = transitChecksDue(session, now);
    if (due <= (session.transitChecked ?? 0)) return;
    const geo = places.find((p) => p.id === session.placeId)?.geo;
    if (!origin || !geo) {
      actions.applyTransit(null, due); // 출발지나 도착 좌표가 없으면 조회하지 않는다
      return;
    }
    busy.current = true;
    fetchTransit(origin, geo)
      .then((route) => actions.applyTransit(route?.rideMin ?? null, due))
      .catch(() => actions.applyTransit(null, due)) // 실패하면 전날 값을 그대로 쓴다
      .finally(() => {
        busy.current = false;
      });
  }, [session, origin, places, now, actions]);
}
