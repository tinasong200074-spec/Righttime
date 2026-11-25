import { useState } from 'react';
import { useApp } from '../../app/store';
import type { TransitRoute } from '../../domain/transit';
import { fetchTransit, TRANSIT_ERROR_TEXT, TransitError } from '../../infra/transit';

const BASIS_NOTE = '지금 출발 기준 시간이에요. 아침 시간대에는 다를 수 있어요. 배차 대기는 아래에서 직접 적어 주세요.';

function RouteInfo({ route }: { route: TransitRoute }) {
  return (
    <div className="t-route">
      <p>
        <strong>{route.rideMin}분</strong> · 환승 {route.transfers}번
      </p>
      <p className="f-sub">{route.summary}</p>
      {route.landingUrl && (
        <a className="f-btn t-link" href={route.landingUrl} target="_blank" rel="noopener noreferrer">
          카카오맵에서 보기
        </a>
      )}
    </div>
  );
}

// 출발지와 도착 장소 좌표가 둘 다 있을 때, 대중교통 소요 시간을 가져와 이동 시간에 넣는다
export function TransitButton() {
  const { origin, plan, places, actions } = useApp();
  const place = places.find((p) => p.id === plan.placeId);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState<TransitRoute | null>(null);
  const [msg, setMsg] = useState('');
  if (!origin || !place?.geo) return null;
  const to = place.geo;

  const fetchRoute = async () => {
    setBusy(true);
    setRoute(null);
    setMsg('경로를 찾는 중이에요…');
    try {
      const found = await fetchTransit(origin, to);
      if (!found) return setMsg('대중교통 경로를 찾지 못했어요. 직접 적어 주세요.');
      actions.savePlace({ ...place, travelMin: found.rideMin });
      actions.logTransit(place.id, found.rideMin); // 비슷한 시간대 조회 기록으로 남긴다
      setRoute(found);
      setMsg('이동 시간을 넣었어요.');
    } catch (e) {
      setMsg(TRANSIT_ERROR_TEXT[e instanceof TransitError ? e.code : 'failed']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" className="f-btn" disabled={busy} onClick={fetchRoute}>
        대중교통 시간 가져오기
      </button>
      <p className="f-status" aria-live="polite">
        {msg}
      </p>
      {route && <RouteInfo route={route} />}
      <p className="f-sub">{BASIS_NOTE}</p>
    </div>
  );
}
