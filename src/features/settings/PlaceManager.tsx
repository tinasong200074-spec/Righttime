import { useState } from 'react';
import { useApp } from '../../app/store';
import type { Place } from '../../domain/types';
import { NumberField } from '../today/NumberField';
import { SaveHereButton } from '../today/PlanCard';
import { newId } from '../today/model';
import { ConfirmButton } from './ConfirmButton';

function PlaceRow({ place }: { place: Place }) {
  const { actions } = useApp();
  const save = (p: Partial<Place>) => actions.savePlace({ ...place, ...p });
  const geo = place.geo;

  return (
    <li>
      <label className="f-label" htmlFor={`pn-${place.id}`}>
        장소 이름
      </label>
      <input id={`pn-${place.id}`} className="f-input" maxLength={30} value={place.name} onChange={(e) => save({ name: e.target.value })} />
      <NumberField label="평소 이동 시간" value={place.travelMin} min={1} max={300} onChange={(n) => save({ travelMin: n })} />
      {geo && <NumberField label="도착으로 보는 반경" unit="m" value={geo.r} min={50} max={1000} onChange={(r) => save({ geo: { ...geo, r } })} />}
      <SaveHereButton placeId={place.id} />
      <div className="f-row f-wrap" style={{ marginTop: 8 }}>
        {geo && (
          <button type="button" className="f-btn" onClick={() => save({ geo: undefined })}>
            저장한 위치 지우기
          </button>
        )}
        <ConfirmButton label={`${place.name || '이 장소'} 삭제`} confirmLabel="한 번 더 누르면 삭제해요" onConfirm={() => actions.removePlace(place.id)} />
      </div>
    </li>
  );
}

function AddPlace() {
  const { actions } = useApp();
  const [name, setName] = useState('');
  const [travelMin, setTravelMin] = useState(30);
  const add = () => {
    actions.savePlace({ id: newId(), name: name.trim().slice(0, 30), travelMin });
    setName('');
  };
  return (
    <div>
      <label className="f-label" htmlFor="add-place-name">
        새 장소 이름
      </label>
      <input id="add-place-name" className="f-input" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 학원" />
      <NumberField label="평소 이동 시간" value={travelMin} min={1} max={300} onChange={setTravelMin} />
      <button type="button" className="f-btn" style={{ marginTop: 12 }} disabled={!name.trim()} onClick={add}>
        장소 추가
      </button>
    </div>
  );
}

// 자주 가는 곳 관리: 이름, 평소 이동 시간, 위치와 반경(위치는 기기에만 저장)
export function PlaceManager() {
  const { places } = useApp();
  return (
    <div>
      {places.length === 0 ? <p className="f-sub">저장한 장소가 아직 없어요.</p> : (
        <ul className="f-list">
          {places.map((p) => (
            <PlaceRow key={p.id} place={p} />
          ))}
        </ul>
      )}
      <AddPlace />
    </div>
  );
}
