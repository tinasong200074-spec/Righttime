import { useState } from 'react';
import { PlaceShortcuts } from '../quick/PlaceShortcuts';
import { useApp } from '../../app/store';
import { roundCoord } from '../../domain/geo';
import { readPositionOnce } from '../../infra/geo';
import { PlaceSearch } from './PlaceSearch';

const GEO_DIGITS = 4; // 소수 넷째 자리(약 11m)로 줄여 기기에만 저장한다

// 출발지 행: 이름으로 찾거나 지금 위치를 한 번 읽어서 정한다
export function OriginRow() {
  const { origin, actions } = useApp();
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState('');

  const useHere = async () => {
    setMsg('위치를 확인하는 중이에요…');
    const pos = await readPositionOnce();
    if (!pos) return setMsg('위치를 읽지 못했어요. 위치 권한을 확인해 주세요.');
    actions.setOrigin({ name: '현재 위치', lat: roundCoord(pos.lat, GEO_DIGITS), lon: roundCoord(pos.lon, GEO_DIGITS) });
    setMsg('');
    setSearching(false);
  };

  return (
    <div>
      <PlaceShortcuts target="origin" />
      <div className="f-row f-wrap">
        <button type="button" className="f-btn" aria-expanded={searching} onClick={() => setSearching((v) => !v)}>
          출발지 정하기
        </button>
        <button type="button" className="f-btn" onClick={useHere}>
          지금 위치 쓰기
        </button>
      </div>
      <p className="f-status" aria-live="polite">
        {msg || (origin ? '출발지는 이 기기에만 저장돼요.' : '')}
      </p>
      {searching && (
        <PlaceSearch
          label="출발지 검색"
          onPick={(p) => {
            actions.setOrigin({ name: p.name, lat: roundCoord(p.lat, GEO_DIGITS), lon: roundCoord(p.lon, GEO_DIGITS) });
            setMsg('');
            setSearching(false);
          }}
        />
      )}
    </div>
  );
}
