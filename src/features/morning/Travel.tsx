import { useState } from 'react';
import { fmtClock, fmtHMS } from '../../domain/format';
import { checkArrival } from '../../domain/geo';
import { lateInfo, projArrive } from '../../domain/message';
import type { Arrival } from '../../domain/types';
import { useApp } from '../../app/store';
import { readPositionOnce } from '../../infra/geo';
import { HeroCard, OutlineButton, Pill, PrimaryButton } from '../../ui';
import { NotifyCard } from '../notify';
import { fmtTimer } from './progress';

const ARRIVAL_CHOICES: Array<{ value: Arrival; label: string }> = [
  { value: 'early', label: '일찍 도착했어요' },
  { value: 'ontime', label: '제시간에 도착했어요' },
  { value: 'late', label: '늦게 도착했어요' },
];

// ⑤ 이동 중. 도착했어요를 누르면 저장한 장소가 있을 때만 위치를 한 번 읽고, 읽은 좌표는 저장하지 않는다.
export function Travel() {
  const { session: s, now, places, actions } = useApp();
  const [choosing, setChoosing] = useState(false);
  if (!s) return null;
  const info = lateInfo(projArrive(s, now), s.arriveAt);
  const place = places.find((p) => p.id === s.placeId);

  const arriveNow = async () => {
    actions.arrive();
    if (!place?.geo) return actions.setGeo({ status: 'none' });
    actions.setGeo({ status: 'checking' });
    const pos = await readPositionOnce();
    actions.setGeo(pos ? checkArrival(place, pos) : { status: 'unavailable' });
  };

  return (
    <>
      <HeroCard>
        <p className="ui-hero-label">이동 중{s.placeName && ` · ${s.placeName}`}</p>
        <p className="ui-hero-num" aria-label="이동한 시간">
          {fmtTimer(now - (s.leftAt ?? now))}
        </p>
        <p className="ui-hero-label">
          도착 목표 {fmtClock(s.arriveAt)} · 남은 시간 {fmtHMS(s.arriveAt - now)}{' '}
          <Pill tone="dark">{info.isLate ? `늦는 중 ${Math.ceil(info.lateMin)}분` : '여유 있어요'}</Pill>
        </p>
      </HeroCard>
      <NotifyCard />
      <div className="morning-actions">
        <PrimaryButton onClick={arriveNow}>도착했어요</PrimaryButton>
        {!choosing && <OutlineButton onClick={() => setChoosing(true)}>도착 기록 건너뛰기</OutlineButton>}
        {choosing && (
          <div role="group" aria-label="도착 결과를 직접 고르기" className="morning-actions">
            {ARRIVAL_CHOICES.map((c) => (
              <OutlineButton key={c.value} onClick={() => actions.skipArrival(c.value)}>
                {c.label}
              </OutlineButton>
            ))}
          </div>
        )}
      </div>
      <p className="morning-note">도착을 누르면 이번 이동 시간이 기록돼요. 저장한 위치가 있으면 위치를 한 번만 확인해요.</p>
    </>
  );
}
