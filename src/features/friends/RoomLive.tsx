import { useState } from 'react';
import { useApp } from '../../app/store';
import { TopBar } from './TopBar';

const pad = (n: number) => String(n).padStart(2, '0');

function Shown({ label, on, disabled = false, onToggle }: { label: string; on: boolean; disabled?: boolean; onToggle?: () => void }) {
  return (
    <label className={`fr-show-row ${disabled ? 'is-off' : ''}`}>
      <span>{label}</span>
      <input type="checkbox" className="fr-box" checked={on} disabled={disabled} onChange={onToggle} style={{ width: 28, height: 28, accentColor: 'var(--ink)' }} />
    </label>
  );
}

// 내 화면 · 공유 중(목업 2번). 공유를 시작한 시각부터 지금 단계가 흐르고, 보이는 것은 켜고 끈다
export function RoomLive({ onBack }: { onBack: () => void }) {
  const { plan, now } = useApp();
  const [startedAt] = useState(now);
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState(true);
  const [eta, setEta] = useState(true);
  const steps = plan.steps;
  const cur = steps[idx];
  const sec = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <div className="m-screen">
      <TopBar title="친구와 약속" onBack={onBack} tag={<span className="fr-tag is-accent">공유 중</span>} />
      <section className="fr-hero">
        <div className="fr-label" style={{ marginTop: 0 }}>
          {cur ? `준비 · ${cur.name} (${idx + 1}/${steps.length})` : '준비를 모두 마쳤어요'}
        </div>
        <div className="fr-clock">
          {pad(Math.floor(sec / 60))}:{pad(sec % 60)}
        </div>
        <button type="button" className="fr-cta" style={{ marginTop: 12 }} disabled={!cur} onClick={() => setIdx((i) => i + 1)}>
          다 했어요
        </button>
      </section>
      <section className="m-card">
        <h2 className="m-sec-title" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>친구에게 보이는 것</h2>
        <Shown label="지금 단계" on={stage} onToggle={() => setStage((v) => !v)} />
        <Shown label="도착 예정 시각" on={eta} onToggle={() => setEta((v) => !v)} />
        <Shown label="미루기·기록 · 항상 숨김" on={false} disabled />
        <Shown label="위치 · 공유 안 함" on={false} disabled />
      </section>
      <p className="fr-small">예시 화면이에요. 지금은 친구에게 전달되지 않아요.</p>
      <div className="m-spacer" />
      <button type="button" className="fr-ghost" onClick={onBack}>
        공유 끄기
      </button>
    </div>
  );
}
