import { useState } from 'react';
import { fmtClock, fmtMin } from '../../domain/format';
import { MIN, type Arrival, type GeoResult, type Session } from '../../domain/types';
import { useApp } from '../../app/store';
import { Card, Pill, PrimaryButton } from '../../ui';
import { NotifyCard } from '../notify';
import { diffText } from './progress';

const ARRIVAL_LABEL: Record<Arrival, string> = { early: '일찍 도착', ontime: '제시간 도착', late: '늦게 도착' };

function geoText(geo: GeoResult | undefined): string | null {
  switch (geo?.status) {
    case 'checking':
      return '위치를 확인하고 있어요';
    case 'match':
      return `저장한 장소와 일치 · 약 ${geo.dist}m`;
    case 'mismatch':
      return `다르게 나와요 · 약 ${geo.dist}m 떨어짐`;
    case 'unavailable':
      return '확인하지 못했어요';
    default:
      return null;
  }
}

function rowsOf(s: Session): Array<[string, string]> {
  const left = s.leftAt ?? s.leaveAt;
  const prepMin = (left - (s.prepStartAt ?? left)) / MIN;
  const rows: Array<[string, string]> = [
    ['기상', `${fmtMin(s.latency ?? 0)}${s.snoozeCount ? ` · 미루기 ${s.snoozeCount}회` : ''}`],
    ['준비', `${fmtMin(prepMin)} · 입력 ${fmtMin(s.userPrep)}`],
    ['출발', `${fmtClock(left)} · ${diffText((left - s.leaveAt) / MIN)}`],
  ];
  if (s.arrivedAt !== undefined) {
    rows.push(['이동', `${fmtMin((s.arrivedAt - left) / MIN)} · 예상 ${fmtMin(s.travelMin)}`]);
    rows.push(['도착', `${fmtClock(s.arrivedAt)} · ${diffText((s.arrivedAt - s.arriveAt) / MIN)}`]);
  } else if (s.arrival) {
    rows.push(['도착', ARRIVAL_LABEL[s.arrival]]);
  }
  const geo = geoText(s.geo);
  if (geo) rows.push(['위치 확인', geo]);
  return rows;
}

// ⑤ 요약. 위치 일치 여부는 참고용이고 지각·거짓말 판정에 쓰지 않는다.
export function Summary() {
  const { session: s, actions } = useApp();
  const [excluded, setExcluded] = useState(false);
  if (!s) return null;

  return (
    <>
      <Card>
        <h2 className="morning-h">
          오늘 기록 {s.demo && <Pill tone="soft">시연</Pill>}
        </h2>
        <dl className="morning-rows">
          {rowsOf(s).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {s.geo?.status === 'mismatch' && (
          <p className="morning-note">위치는 건물 안이나 근처에서 부정확할 수 있어서 참고로만 보여 드려요.</p>
        )}
      </Card>
      <NotifyCard />
      <label className="morning-exclude">
        <input type="checkbox" checked={excluded} onChange={(e) => setExcluded(e.target.checked)} />
        <span>이번 기록 제외</span>
      </label>
      <p className="morning-note">앱을 못 봤거나 평소와 많이 달랐다면 제외해 주세요. 추천 계산에 쓰이지 않아요.</p>
      <div className="morning-actions">
        <PrimaryButton onClick={() => actions.saveRecord(excluded)}>저장하고 마치기</PrimaryButton>
      </div>
    </>
  );
}
