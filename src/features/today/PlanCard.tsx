import { useState } from 'react';
import { useApp } from '../../app/store';
import { fromInputValue, toInputValue } from '../../domain/format';
import { roundCoord } from '../../domain/geo';
import type { FoundPlace } from '../../domain/transit';
import { Card, Icon } from '../../ui';
import { readPositionOnce } from '../../infra/geo';
import { PlaceShortcuts } from '../quick/PlaceShortcuts';
import { RepeatPicker } from '../quick/RepeatPicker';
import { newId } from './model';
import { NumberField } from './NumberField';
import { PlaceSearch } from './PlaceSearch';
import { TransitAuto } from './TransitAuto';

const DEFAULT_RADIUS_M = 150;
const GEO_DIGITS = 4; // 소수 넷째 자리(약 11m), 기기에만 저장

// 고른 장소에 있을 때 그 위치를 장소로 저장한다(사용자가 누를 때 한 번만 읽는다)
export function SaveHereButton({ placeId }: { placeId: string }) {
  const { places, actions } = useApp();
  const [msg, setMsg] = useState('');
  const place = places.find((p) => p.id === placeId);
  if (!place) return null;

  const save = async () => {
    setMsg('위치를 확인하는 중이에요…');
    const pos = await readPositionOnce();
    if (!pos) return setMsg('위치를 읽지 못했어요. 위치 권한을 확인해 주세요.');
    const geo = { lat: roundCoord(pos.lat, GEO_DIGITS), lon: roundCoord(pos.lon, GEO_DIGITS), r: place.geo?.r ?? DEFAULT_RADIUS_M };
    actions.savePlace({ ...place, geo });
    setMsg('이 위치를 장소로 저장했어요. 기기에만 저장돼요.');
  };

  return (
    <div>
      <button type="button" className="f-btn" onClick={save}>
        지금 여기를 이 장소로 저장
      </button>
      <p className="f-status" aria-live="polite">
        {msg || (place.geo ? '저장된 위치가 있어요.' : '그 장소에 도착했을 때 눌러 주세요.')}
      </p>
    </div>
  );
}

function AddPlaceForm({ onDone }: { onDone: () => void }) {
  const { actions } = useApp();
  const [name, setName] = useState('');
  const [travelMin, setTravelMin] = useState(30);

  const save = () => {
    if (!name.trim()) return;
    const id = newId();
    actions.savePlace({ id, name: name.trim().slice(0, 30), travelMin });
    actions.updatePlan({ placeId: id });
    onDone();
  };

  return (
    <div>
      <label className="f-label" htmlFor="new-place">
        장소 이름
      </label>
      <input id="new-place" className="f-input" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: A사, 학원" />
      <NumberField label="평소 이동 시간" value={travelMin} min={1} max={300} onChange={setTravelMin} />
      <div className="f-row" style={{ marginTop: 12 }}>
        <button type="button" className="f-btn" disabled={!name.trim()} onClick={save}>
          장소 저장
        </button>
        <button type="button" className="f-btn" onClick={onDone}>
          닫기
        </button>
      </div>
    </div>
  );
}

type PlaceMode = 'none' | 'add' | 'search';

// 검색으로 고른 장소를 저장하고 도착 장소로 정한다. 이동 시간은 지금 적힌 값으로 시작한다
function useAddFound() {
  const { plan, actions } = useApp();
  return (p: FoundPlace) => {
    const id = newId();
    const geo = { lat: roundCoord(p.lat, GEO_DIGITS), lon: roundCoord(p.lon, GEO_DIGITS), r: DEFAULT_RADIUS_M };
    actions.savePlace({ id, name: p.name.slice(0, 30), travelMin: plan.rideMin, geo });
    actions.updatePlan({ placeId: id });
  };
}

export function PlaceField() {
  const { plan, places, actions } = useApp();
  const [mode, setMode] = useState<PlaceMode>('none');
  const addFound = useAddFound();
  const toggle = (m: PlaceMode) => setMode((cur) => (cur === m ? 'none' : m));

  return (
    <div>
      <label className="f-label" htmlFor="plan-place">
        도착 장소
      </label>
      <div className="f-row">
        <Icon name="place" main="var(--ink)" det="var(--surface)" />
        <select
          id="plan-place" className="f-input f-grow"
          value={plan.placeId ?? ''}
          onChange={(e) => actions.updatePlan({ placeId: e.target.value || undefined })}
        >
          <option value="">장소를 고르지 않았어요</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <PlaceShortcuts target="dest" />
      <div className="f-row f-wrap" style={{ marginTop: 8 }}>
        <button type="button" className="f-btn" aria-expanded={mode === 'search'} onClick={() => toggle('search')}>
          지도에서 찾기
        </button>
        <button type="button" className="f-btn" aria-expanded={mode === 'add'} onClick={() => toggle('add')}>
          직접 추가
        </button>
      </div>
      {mode === 'add' && <AddPlaceForm onDone={() => setMode('none')} />}
      {mode === 'search' && (
        <PlaceSearch
          label="도착 장소 검색"
          onPick={(p) => {
            addFound(p);
            setMode('none');
          }}
        />
      )}
      {plan.placeId && mode === 'none' && <SaveHereButton placeId={plan.placeId} />}
      <TransitAuto />
    </div>
  );
}

// 일정 제목과 도착 시각
export function PlanFields() {
  const { plan, actions } = useApp();
  return (
    <Card>
      <label className="f-label" htmlFor="plan-title" style={{ marginTop: 0 }}>
        일정 제목
      </label>
      <input
        id="plan-title"
        className="f-input"
        maxLength={40}
        placeholder="예: A사 면접"
        value={plan.title}
        onChange={(e) => actions.updatePlan({ title: e.target.value })}
      />
      <label className="f-label" htmlFor="plan-arrive">
        도착 시각
      </label>
      <input
        id="plan-arrive"
        className="f-input"
        type="datetime-local"
        value={toInputValue(plan.arriveAt)}
        onChange={(e) => {
          const ms = fromInputValue(e.target.value);
          if (ms !== null) actions.updatePlan({ arriveAt: ms });
        }}
      />
      <RepeatPicker />
    </Card>
  );
}
