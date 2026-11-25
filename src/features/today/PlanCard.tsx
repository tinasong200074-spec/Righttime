import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock, fromInputValue, toInputValue } from '../../domain/format';
import { roundCoord } from '../../domain/geo';
import { Card, Icon } from '../../ui';
import { readPositionOnce } from './location';
import { dayLabel, newId } from './model';
import { NumberField } from './NumberField';

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

function PlaceField() {
  const { plan, places, actions } = useApp();
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <label className="f-label" htmlFor="plan-place">
        도착 장소
      </label>
      <div className="f-row">
        <Icon name="place" main="var(--ink)" det="var(--surface)" />
        <select
          id="plan-place"
          className="f-input f-grow"
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
        <button type="button" className="f-btn" onClick={() => setAdding((v) => !v)} aria-expanded={adding}>
          추가
        </button>
      </div>
      {adding && <AddPlaceForm onDone={() => setAdding(false)} />}
      {plan.placeId && !adding && <SaveHereButton placeId={plan.placeId} />}
    </div>
  );
}

// 일정 제목, 도착 시각, 도착 장소
export function PlanCard() {
  const { plan, now, actions } = useApp();
  return (
    <Card>
      <div className="t-head">
        <p className="t-date">{dayLabel(plan.arriveAt, now)}</p>
        <p className="t-big-time">{fmtClock(plan.arriveAt)}</p>
      </div>
      <label className="f-label" htmlFor="plan-title">
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
      <PlaceField />
    </Card>
  );
}
