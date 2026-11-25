import { useState } from 'react';
import { useApp } from '../../app/store';
import { cleanCode, codeFromHash } from '../../domain/room';
import { createRoom, joinRoom } from '../../infra/rooms';
import { Card, OutlineButton, Pill, PrimaryButton } from '../../ui';

// 약속 방 만들기·들어가기(명세 ⑩). 들어가는 것이 곧 서로 보여 주기에 동의하는 것이다
export function RoomSetup() {
  const { plan, shareName, actions } = useApp();
  const [code, setCode] = useState(() => codeFromHash(location.hash) ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const name = shareName.trim();

  const enter = async (make: boolean) => {
    if (!name) return setMsg('상대에게 보일 이름을 먼저 적어 주세요.');
    const clean = make ? null : cleanCode(code);
    if (!make && !clean) return setMsg('초대 코드는 영문과 숫자 6자예요.');
    setBusy(true);
    const ref = make ? await createRoom(name, plan.title, plan.arriveAt) : await joinRoom(clean!, name);
    setBusy(false);
    if (!ref) return setMsg(make ? '방을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.' : '방을 찾지 못했어요. 코드를 확인하거나, 이미 끝난 약속일 수 있어요.');
    if (location.hash.startsWith('#r=')) history.replaceState(null, '', location.pathname);
    actions.setRoom({ roomId: ref.roomId, code: ref.code, sharing: true, arriveMs: plan.arriveAt });
  };

  return (
    <Card>
      <h2 className="room-h2">약속 방</h2>
      <p className="share-note">같은 약속에 가는 친구와 서로의 준비 단계와 도착 예정을 봐요. 이 약속에서만 공유하고, 약속이 끝나면 사라져요.</p>
      <div className="share-pills">
        <Pill tone="soft">보임 · 지금 단계</Pill>
        <Pill tone="soft">보임 · 도착 예정</Pill>
        <Pill>안 보임 · 위치</Pill>
        <Pill>안 보임 · 알람 미루기</Pill>
        <Pill>안 보임 · 기록</Pill>
      </div>
      <label className="share-field">
        상대에게 보일 내 이름
        <input value={shareName} maxLength={20} placeholder="예: 지민" onChange={(e) => actions.setShareName(e.target.value)} />
      </label>
      <PrimaryButton onClick={() => enter(true)} disabled={busy}>
        방 만들기
      </PrimaryButton>
      <label className="share-field">
        초대 코드로 들어가기
        <input value={code} maxLength={8} placeholder="예: K7M9PQ" autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
      </label>
      <OutlineButton onClick={() => enter(false)} disabled={busy}>
        들어가기
      </OutlineButton>
      <p className="share-note" role="status">
        {msg || '들어가면 방에 있는 사람끼리 서로 보여요. 언제든 끌 수 있어요.'}
      </p>
    </Card>
  );
}
