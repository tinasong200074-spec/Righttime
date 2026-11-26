import { useState } from 'react';
import { useApp } from '../../app/store';
import { Card } from '../../ui';
import { fromInputValue, toInputValue } from '../../domain/format';
import { roundCoord } from '../../domain/geo';
import { readPositionOnce } from '../../infra/geo';
import { RepeatPicker } from '../quick/RepeatPicker';

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

// 도착 날짜와 도착 시각을 따로 고른다(요일 반복은 아래 "반복"에서)
function DateTimeFields() {
  const { plan, actions } = useApp();
  const value = toInputValue(plan.arriveAt); // YYYY-MM-DDTHH:MM
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  const set = (d: string, t: string) => {
    const ms = fromInputValue(`${d}T${t}`);
    if (ms !== null) actions.updatePlan({ arriveAt: ms });
  };
  return (
    <div className="f-grid3" style={{ gridTemplateColumns: '3fr 2fr' }}>
      <div>
        <label className="f-label" htmlFor="plan-date">
          도착 날짜
        </label>
        <input id="plan-date" className="f-input" type="date" value={date} onChange={(e) => e.target.value && set(e.target.value, time)} />
      </div>
      <div>
        <label className="f-label" htmlFor="plan-time">
          도착 시각
        </label>
        <input id="plan-time" className="f-input" type="time" value={time} onChange={(e) => e.target.value && set(date, e.target.value)} />
      </div>
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
      <DateTimeFields />
      <RepeatPicker />
    </Card>
  );
}
