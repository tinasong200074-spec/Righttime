import { useState } from 'react';
import { useApp } from '../../app/store';
import { Card, Pill, PrimaryButton } from '../../ui';
import { NotifyCard } from '../notify';
import { verdictOf } from './progress';

function legText(diff: number): string {
  if (diff >= 1) return `${diff}분 더 걸렸어요`;
  return diff <= -1 ? `${-diff}분 덜 걸렸어요` : '예상대로예요';
}

// ⑤ 요약. 위치 일치 여부는 참고용이고 지각·거짓말 판정에 쓰지 않는다.
export function Summary() {
  const { session: s, actions } = useApp();
  const [excluded, setExcluded] = useState(false);
  if (!s) return null;
  const v = verdictOf(s);

  return (
    <>
      <Card>
        <h2 className="morning-h">
          오늘 기록 {s.demo && <Pill tone="soft">시연</Pill>}
        </h2>
        <p className="morning-verdict">{v.headline}</p>
        <p className="morning-note">{v.prepText}</p>
        <ul className="morning-legs" aria-label="구간별 시간">
          {v.legs.map((l) => (
            <li key={l.label} className={l === v.culprit ? 'is-culprit' : ''}>
              <span>{l.label}</span>
              <span>{legText(l.diff)}</span>
            </li>
          ))}
        </ul>
        <p className="morning-note">{v.culprit ? `늦어진 구간은 ${v.culprit.label}이에요.` : '늦어진 구간은 없어요.'}</p>
        {s.geo?.status === 'mismatch' && <p className="morning-note">위치는 참고로만 보여 드려요. 저장한 장소와 다르게 나왔어요.</p>}
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
