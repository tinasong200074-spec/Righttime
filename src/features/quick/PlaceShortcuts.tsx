import { useState } from 'react';
import { useApp } from '../../app/store';
import { placeByTag, TAG_MAX_LEN, tagsOf } from '../../domain/repeat';
import type { Place } from '../../domain/types';
import './quick.css';

type Target = 'dest' | 'origin';

// 분류를 붙이거나 떼는 줄. 지금 고른 도착 장소에 붙인다
function TagEditor({ place }: { place: Place }) {
  const { places, actions } = useApp();
  const [custom, setCustom] = useState('');
  const add = () => {
    if (!custom.trim()) return;
    actions.setPlaceTag(place.id, custom);
    setCustom('');
  };
  return (
    <div className="q-editor">
      <p className="f-status">“{place.name}”을(를) 어디로 저장할까요? 한 분류에는 장소 하나만 들어가요.</p>
      <div className="q-chips">
        {tagsOf(places).map((t) => (
          <button key={t} type="button" className="q-chip" aria-pressed={place.tag === t} onClick={() => actions.setPlaceTag(place.id, place.tag === t ? '' : t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="q-row">
        <input
          className="f-input f-grow"
          value={custom}
          maxLength={TAG_MAX_LEN}
          placeholder="새 분류 (예: 헬스장)"
          aria-label="새 분류 이름"
          onChange={(e) => setCustom(e.target.value)}
        />
        <button type="button" className="f-btn" disabled={!custom.trim()} onClick={add}>
          추가
        </button>
      </div>
    </div>
  );
}

// 자주 가는 곳 버튼(집, 회사, 학원 …). 누르면 바로 도착 장소나 출발지로 들어간다
export function PlaceShortcuts({ target }: { target: Target }) {
  const { plan, places, actions } = useApp();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const current = places.find((p) => p.id === plan.placeId);
  // 출발지에는 저장된 장소가 있는 분류만 보여 준다
  const tags = tagsOf(places).filter((t) => target === 'dest' || placeByTag(places, t));

  const pick = (tag: string) => {
    const place = placeByTag(places, tag);
    if (!place) return setMsg(current ? `아직 “${tag}”이(가) 없어요. 아래 “분류 고치기”에서 지금 장소를 저장해 주세요.` : `아직 “${tag}”이(가) 없어요. 장소를 먼저 고른 뒤 “분류 고치기”로 저장해 주세요.`);
    setMsg('');
    if (target === 'dest') return actions.updatePlan({ placeId: place.id });
    if (!place.geo) return setMsg(`“${place.name}”에 위치가 없어서 출발지로 쓸 수 없어요. 지도에서 찾아 저장한 장소만 돼요.`);
    actions.setOrigin({ name: place.name, lat: place.geo.lat, lon: place.geo.lon });
  };

  if (tags.length === 0) return null;
  return (
    <div className="q-block">
      <div className="q-chips" role="group" aria-label={target === 'dest' ? '자주 가는 곳으로 도착 장소 정하기' : '자주 가는 곳으로 출발지 정하기'}>
        {tags.map((t) => {
          const place = placeByTag(places, t);
          const on = target === 'dest' && !!place && place.id === plan.placeId;
          return (
            <button key={t} type="button" className={`q-chip ${place ? '' : 'is-empty'}`} aria-pressed={on} onClick={() => pick(t)}>
              {t}
            </button>
          );
        })}
        {target === 'dest' && current && (
          <button type="button" className="q-chip is-edit" aria-expanded={editing} onClick={() => setEditing((v) => !v)}>
            분류 고치기
          </button>
        )}
      </div>
      {msg && (
        <p className="f-status" aria-live="polite">
          {msg}
        </p>
      )}
      {target === 'dest' && editing && current && <TagEditor place={current} />}
    </div>
  );
}
