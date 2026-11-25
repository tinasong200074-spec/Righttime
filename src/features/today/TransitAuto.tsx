import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { roundCoord } from '../../domain/geo';
import type { TransitRoute } from '../../domain/transit';
import { readPositionOnce } from '../../infra/geo';
import { fetchTransit, TRANSIT_ERROR_TEXT, TransitError } from '../../infra/transit';
import { OriginRow } from './OriginRow';

const BASIS_NOTE = '지금 출발 기준 시간이에요. 아침 시간대에는 다를 수 있어요. 카카오가 배차 간격을 알려 주지 않아서 대기 시간은 따로 넣지 않아요.';
const KEY = 'jette:transit-on';
const HERE = '현재 위치';
const GEO_DIGITS = 4; // 소수 넷째 자리(약 11m)로 줄여 기기에만 저장한다

// 체크 상태는 이 기기에서만 기억한다(저장소를 못 쓰는 환경이면 기억하지 않고 동작한다)
function useChecked(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const set = (v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem(KEY, v ? '1' : '0');
    } catch {
      // 저장하지 못해도 이번 화면에서는 그대로 쓴다
    }
  };
  return [on, set];
}

type Phase = 'idle' | 'locating' | 'fetching';

// 도착 장소를 고르면 출발지(직접 정하지 않았으면 지금 위치)를 읽고 대중교통 시간을 자동으로 가져온다
function useAutoTransit(on: boolean) {
  const { origin, plan, places, actions } = useApp();
  const place = places.find((p) => p.id === plan.placeId);
  const [phase, setPhase] = useState<Phase>('idle');
  const [route, setRoute] = useState<TransitRoute | null>(null);
  const [msg, setMsg] = useState('');
  const last = useRef('');
  const key = place?.geo ? `${place.id}|${place.geo.lat},${place.geo.lon}` : '';

  const run = async () => {
    if (!place?.geo) return;
    const to = place.geo;
    setRoute(null);
    let from = origin && origin.name !== HERE ? origin : null; // 직접 정한 출발지는 그대로 쓴다
    if (!from) {
      setPhase('locating');
      setMsg('위치 확인 중이에요… 최대 9초 걸려요.');
      const pos = await readPositionOnce();
      if (!pos) {
        setPhase('idle');
        return setMsg('위치를 읽지 못했어요. 아래에서 출발지를 직접 정하거나 이동 시간을 적어 주세요.');
      }
      from = { name: HERE, lat: roundCoord(pos.lat, GEO_DIGITS), lon: roundCoord(pos.lon, GEO_DIGITS) };
      actions.setOrigin(from);
    }
    setPhase('fetching');
    setMsg('경로를 찾는 중이에요…');
    try {
      const found = await fetchTransit(from, to);
      if (!found) return setMsg('대중교통 경로를 찾지 못했어요. 직접 적어 주세요.');
      actions.savePlace({ ...place, travelMin: found.rideMin });
      actions.logTransit(place.id, found.rideMin); // 비슷한 시간대 조회 기록으로 남긴다
      setRoute(found);
      setMsg('이동 시간을 넣었어요.');
    } catch (e) {
      setMsg(TRANSIT_ERROR_TEXT[e instanceof TransitError ? e.code : 'failed']);
    } finally {
      setPhase('idle');
    }
  };

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (!on || !key) return;
    if (last.current === key) return; // 같은 장소로는 다시 부르지 않는다(하루 호출 한도)
    last.current = key;
    void runRef.current();
  }, [on, key]);

  const rerun = () => void run();
  return { place, phase, route, msg, rerun, reset: () => (last.current = '') };
}

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

// "대중교통으로 가요" 체크. 켜 두면 도착 장소를 고를 때마다 자동으로 이동 시간을 가져온다
export function TransitAuto() {
  const { origin } = useApp();
  const [on, setOn] = useChecked();
  const t = useAutoTransit(on);
  const busy = t.phase !== 'idle';

  return (
    <div>
      <label className="fr-check">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} />
        대중교통으로 가요
      </label>
      {on && (
        <>
          <p className="f-status" aria-live="polite">
            {t.msg || (t.place?.geo ? '' : '도착 장소를 고르면 이동 시간을 자동으로 가져와요.')}
          </p>
          {t.route && <RouteInfo route={t.route} />}
          {t.place?.geo && (
            <button type="button" className="f-btn" disabled={busy} onClick={t.rerun}>
              {busy ? (t.phase === 'locating' ? '위치 확인 중…' : '조회 중…') : '다시 조회'}
            </button>
          )}
          <p className="f-sub">{BASIS_NOTE}</p>
          <details>
            <summary className="t-summary">출발지 직접 정하기 · {origin?.name ?? '정하지 않았어요'}</summary>
            <OriginRow />
          </details>
        </>
      )}
    </div>
  );
}
