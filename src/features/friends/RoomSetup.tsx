import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { cleanCode, codeFromHash } from '../../domain/room';
import { createRoom, joinRoom } from '../../infra/rooms';
import { dayLabel } from '../today/model';
import { TopBar } from './TopBar';

function Visible() {
  return (
    <section className="m-card">
      <div className="fr-vis">
        <b>보임</b>
        <div>
          <span className="fr-chip is-soft">지금 단계</span>
          <span className="fr-chip is-soft">도착 예정</span>
        </div>
        <b>안 보임</b>
        <div>
          <span className="fr-chip">위치</span>
          <span className="fr-chip">미루기</span>
          <span className="fr-chip">기록</span>
        </div>
      </div>
    </section>
  );
}

function useEnter() {
  const { plan, shareName, actions } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const enter = async (code: string | null) => {
    const name = shareName.trim();
    if (!name) return setMsg('친구에게 보일 이름을 먼저 적어 주세요.');
    const clean = code === null ? null : cleanCode(code);
    if (code !== null && !clean) return setMsg('초대 코드는 영문과 숫자 6자예요.');
    setBusy(true);
    const ref = clean ? await joinRoom(clean, name) : await createRoom(name, plan.title, plan.arriveAt);
    setBusy(false);
    if (!ref) return setMsg(clean ? '방을 찾지 못했어요. 코드를 확인하거나, 이미 끝난 약속일 수 있어요.' : '방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    if (location.hash.startsWith('#r=')) history.replaceState(null, '', location.pathname);
    actions.setRoom({ roomId: ref.roomId, code: ref.code, sharing: true, arriveMs: plan.arriveAt });
  };
  return { busy, msg, enter };
}

function NameAndCode(p: { code: string; onCode: (v: string) => void; busy: boolean; onJoin: () => void }) {
  const { shareName, actions } = useApp();
  return (
    <section className="m-card">
      <label className="f-label" htmlFor="fr-name" style={{ marginTop: 0 }}>
        친구에게 보일 내 이름
      </label>
      <input id="fr-name" className="f-input" maxLength={20} placeholder="예: 지민" value={shareName} onChange={(e) => actions.setShareName(e.target.value)} />
      <label className="f-label" htmlFor="fr-code">
        초대 코드가 있다면 (선택)
      </label>
      <div className="f-row">
        <input id="fr-code" className="f-input f-grow" maxLength={8} placeholder="예: K7M9PQ" autoCapitalize="characters" value={p.code} onChange={(e) => p.onCode(e.target.value)} />
        <button type="button" className="f-btn" disabled={p.busy || !p.code.trim()} onClick={p.onJoin}>
          들어가기
        </button>
      </div>
    </section>
  );
}

// 약속 방 만들기 · 동의(목업 1번). 들어가는 것이 곧 이 약속에서만 서로 보여 주기에 동의하는 것이다
export function RoomSetup({ onBack }: { onBack: () => void }) {
  const { plan, now } = useApp();
  const [agree, setAgree] = useState(true);
  const [code, setCode] = useState(() => codeFromHash(location.hash) ?? '');
  const { busy, msg, enter } = useEnter();
  const day = dayLabel(plan.arriveAt, now).split(' · ')[0];

  return (
    <div className="m-screen">
      <TopBar title="준비 현황 공유" onBack={onBack} />
      <div style={{ padding: '0 4px' }}>
        <h2 className="m-h1" style={{ lineHeight: 1.3 }}>
          친구에게
          <br />
          보여줄까요?
        </h2>
        <div className="m-muted">
          {day} {fmtClock(plan.arriveAt)} 약속
        </div>
      </div>
      <NameAndCode code={code} onCode={setCode} busy={busy} onJoin={() => enter(code)} />
      <Visible />
      <section className="m-card">
        <label className="fr-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          이 약속에서만 공유해요
        </label>
      </section>
      <p className="fr-small" role="status">
        {msg || '약속이 끝나면 사라져요. 친구도 동의해야 보여요. 끄면 바로 사라져요.'}
      </p>
      <div className="m-spacer" />
      <button type="button" className="fr-cta" disabled={!agree || busy} onClick={() => enter(null)}>
        공유 시작 · 방 만들기
      </button>
    </div>
  );
}
