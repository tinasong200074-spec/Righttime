import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { roundCoord } from '../../domain/geo';
import { homeOf, orderSpots, spotKey, type Spot } from '../../domain/spots';
import { readPositionOnce } from '../../infra/geo';
import { searchPlaces, TRANSIT_ERROR_TEXT, TransitError } from '../../infra/transit';
import { newId } from './model';
import { NumberField } from './NumberField';
import './place.css';
import { TransitAuto } from './TransitAuto';

type End = 'origin' | 'dest';
type Found = Omit<Spot, 'usedAt' | 'fav' | 'home'>;

const HERE = '현재 위치';
const GEO_DIGITS = 4; // 소수 넷째 자리(약 11m)로 줄여 기기에만 저장한다
const RADIUS_M = 150;
const r4 = (n: number) => roundCoord(n, GEO_DIGITS);

// 출발지를 따로 정하지 않았으면 지금 위치를 출발지로 쓴다(이 화면을 열 때 한 번 읽는다)
function useAutoOrigin() {
  const { origin, session, actions } = useApp();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || session || (origin && origin.name !== HERE)) return;
    done.current = true;
    void readPositionOnce().then((pos) => pos && actions.setOrigin({ name: HERE, lat: r4(pos.lat), lon: r4(pos.lon) }));
  }, [origin, session, actions]);
}

// 고른 장소를 출발지나 도착 장소로 넣는다. 도착은 같은 장소가 이미 있으면 그것을 쓴다
function useApply() {
  const { plan, places, actions } = useApp();
  return (end: End, s: Found) => {
    actions.touchSpot(s);
    if (end === 'origin') return actions.setOrigin({ name: s.name, lat: r4(s.lat), lon: r4(s.lon) });
    const same = places.find((p) => p.name === s.name && p.geo && p.geo.lat === r4(s.lat) && p.geo.lon === r4(s.lon));
    const id = same?.id ?? newId();
    if (!same) actions.savePlace({ id, name: s.name.slice(0, 30), travelMin: plan.rideMin, geo: { lat: r4(s.lat), lon: r4(s.lon), r: RADIUS_M } });
    actions.updatePlan({ placeId: id });
  };
}

// 이름으로 찾기. 하루 호출 한도가 있어서 글자를 칠 때마다 부르지 않고 Enter나 검색 버튼에서만 부른다
function useSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async () => {
    const query = q.trim();
    if (!query || busy) return;
    setBusy(true);
    setMsg('찾는 중이에요…');
    try {
      const found = await searchPlaces(query);
      setResults(found);
      setMsg(found.length > 0 ? '' : '검색 결과가 없어요. 이름을 바꿔 보세요.');
    } catch (err) {
      setResults([]);
      setMsg(TRANSIT_ERROR_TEXT[err instanceof TransitError ? err.code : 'failed']);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setQ('');
    setResults([]);
    setMsg('');
  };
  return { q, setQ, results, busy, msg, setMsg, run, reset };
}

function SpotRow({ s, onPick }: { s: Found & Partial<Spot>; onPick: () => void }) {
  const { actions } = useApp();
  const key = spotKey(s);
  // 즐겨찾기·집 표시는 기록에 있어야 붙일 수 있어서, 검색 결과에서 누르면 먼저 기록에 넣는다
  const mark = (fn: (k: string) => void) => {
    actions.touchSpot({ name: s.name, address: s.address, lat: s.lat, lon: s.lon });
    fn(key);
  };
  return (
    <li className="pf-row">
      <button type="button" className="pf-pick" onClick={onPick}>
        <strong>{s.name}</strong>
        <span>{s.address}</span>
      </button>
      <button type="button" className="pf-mark" aria-pressed={!!s.fav} aria-label={`${s.name} 즐겨찾기`} onClick={() => mark(actions.toggleSpotFav)}>
        {s.fav ? '★' : '☆'}
      </button>
      <button type="button" className="pf-mark pf-home" aria-pressed={!!s.home} aria-label={`${s.name}을 집으로 저장`} onClick={() => mark(actions.setSpotHome)}>
        집
      </button>
    </li>
  );
}

function EndInput(p: { end: End; label: string; value: string; active: boolean; q: string; onFocus: () => void; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <label className={`pf-end ${p.active ? 'is-active' : ''}`}>
      <span className="m-muted">{p.label}</span>
      <input
        className="pf-input" type="search" enterKeyHint="search" maxLength={40} placeholder="검색" autoComplete="off"
        value={p.active ? p.q : p.value}
        onFocus={p.onFocus}
        onClick={p.onFocus} // 고른 뒤에도 초점이 남아 있을 수 있어서 누를 때도 연다
        onChange={(e) => p.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault(); // 화면 전체의 제출로 넘어가지 않게
          p.onEnter();
        }}
      />
    </label>
  );
}

// 칸을 누르면 그 아래에 뜨는 목록: 검색 결과가 있으면 결과, 없으면 즐겨찾기와 지난 검색 기록
function Panel({ end, search, onPick, onClose }: { end: End; search: ReturnType<typeof useSearch>; onPick: (s: Found) => void; onClose: () => void }) {
  const { spots } = useApp();
  const saved = orderSpots(spots ?? []);
  const marks = new Map(saved.map((s) => [spotKey(s), s]));
  const rows: Array<Found & Partial<Spot>> = search.results.length > 0 ? search.results.map((r) => ({ ...r, ...marks.get(spotKey(r)) })) : saved;
  return (
    <div className="pf-panel">
      <div className="pf-panel-head">
        <span className="m-muted">{search.results.length > 0 ? '검색 결과' : `${end === 'origin' ? '출발' : '도착'} · 즐겨찾기와 지난 검색`}</span>
        <button type="button" className="pf-small" disabled={!search.q.trim() || search.busy} onClick={search.run}>
          검색
        </button>
        <button type="button" className="pf-small" onClick={onClose}>
          닫기
        </button>
      </div>
      <p className="f-status" aria-live="polite">
        {search.msg || (rows.length === 0 ? '장소 이름을 적고 검색을 눌러 주세요.' : '')}
      </p>
      <ul className="pf-list">
        {rows.map((s) => (
          <SpotRow key={spotKey(s)} s={s} onPick={() => onPick(s)} />
        ))}
      </ul>
    </div>
  );
}

// 이동 시간: 대중교통으로 조회하지 않을 때 직접 적는다
function RideField() {
  const { plan, places, actions } = useApp();
  const place = places.find((p) => p.id === plan.placeId);
  const set = (n: number) => (place ? actions.savePlace({ ...place, travelMin: n }) : actions.updatePlan({ rideMin: n }));
  return <NumberField label="이동 시간" value={place?.travelMin ?? plan.rideMin} min={1} max={300} onChange={set} />;
}

// 출발과 도착을 나란히 둔다. 칸을 누르면 바로 검색하거나, 즐겨찾기·지난 검색에서 고른다
export function PlaceField() {
  const { plan, places, origin, spots } = useApp();
  const [active, setActive] = useState<End | null>(null);
  const search = useSearch();
  const apply = useApply();
  useAutoOrigin();
  const home = homeOf(spots ?? []);
  const close = () => {
    setActive(null);
    search.reset();
    (document.activeElement as HTMLElement | null)?.blur(); // 다음에 누르면 목록이 다시 열리게
  };
  const pick = (end: End, s: Found) => {
    apply(end, s);
    close();
  };
  const focus = (end: End) => {
    if (active !== end) search.reset();
    setActive(end);
  };
  const goHome = (end: End) => (home ? pick(end, home) : (setActive(end), search.setMsg('아직 집이 없어요. 장소를 검색한 뒤 오른쪽의 “집”을 눌러 저장해 주세요.')));
  const input = (end: End, label: string, value: string) => (
    <div>
      <EndInput end={end} label={label} value={value} active={active === end} q={search.q} onFocus={() => focus(end)} onChange={search.setQ} onEnter={search.run} />
      <button type="button" className={`pf-chip ${home ? '' : 'is-empty'}`} onClick={() => goHome(end)}>
        집
      </button>
    </div>
  );

  return (
    <div>
      <div className="pf-ends">
        {input('origin', '출발', origin?.name ?? '')}
        {input('dest', '도착', places.find((p) => p.id === plan.placeId)?.name ?? '')}
      </div>
      {active && <Panel end={active} search={search} onPick={(s) => pick(active, s)} onClose={close} />}
      <TransitAuto />
      <RideField />
    </div>
  );
}
