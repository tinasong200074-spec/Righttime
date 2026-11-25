import { useState } from 'react';
import type { RoomState } from '../../app/state';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { lateMessage } from '../../domain/message';
import { memberLine, type RoomMember, type RoomView } from '../../domain/room';
import { STAGE_ROWS } from '../../domain/share';
import { roomUrl, sayInRoom, setRoomSharing } from '../../infra/rooms';
import { TopBar } from './TopBar';

const stageLabel = (s: string) => STAGE_ROWS.find((r) => r.id === s)?.label ?? s;

async function sendInvite(code: string): Promise<string> {
  const url = roomUrl(code);
  const text = `약속 방 초대 코드: ${code}`;
  try {
    if (navigator.share) {
      await navigator.share({ text, url });
      return '';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return '';
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return '초대 링크를 복사했어요. 메신저에 붙여넣어 보내세요.';
  } catch {
    return `코드 ${code}를 친구에게 알려 주세요.`;
  }
}

function Shown({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={`fr-show-row ${on ? '' : 'is-off'}`}>
      <span>{label}</span>
      <span className={`fr-box ${on ? 'is-on' : ''}`}>
        {on && (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        )}
        <span className="m-vh">{on ? '보여요' : '안 보여요'}</span>
      </span>
    </div>
  );
}

function Others({ others, onOpen }: { others: RoomMember[]; onOpen: (id: string) => void }) {
  if (others.length === 0) return <p className="fr-small">아직 아무도 들어오지 않았어요. 초대 링크를 보내 주세요.</p>;
  return (
    <>
      {others.map((m) => (
        <button key={m.userId} type="button" className="fr-card" onClick={() => onOpen(m.userId)}>
          <span className="fr-person">
            <span className="fr-avatar is-live">{m.name.slice(0, 1)}</span>
            <span className="fr-grow">
              <div style={{ fontWeight: 800 }}>{m.name}</div>
              <div className="m-muted">{memberLine(m, stageLabel)}</div>
            </span>
          </span>
        </button>
      ))}
    </>
  );
}

function MyHero({ me, canSay, onSay }: { me: RoomMember | undefined; canSay: boolean; onSay: () => void }) {
  return (
    <section className="fr-hero">
      <div className="fr-label" style={{ marginTop: 0 }}>
        {me ? memberLine(me, stageLabel) : '불러오는 중이에요…'}
      </div>
      <div className="fr-clock">{me?.etaMs ? fmtClock(me.etaMs) : '--:--'}</div>
      <div className="fr-label" style={{ marginTop: 0 }}>내 도착 예정 · 알람을 켜면 자동으로 올라가요</div>
      {canSay && (
        <button type="button" className="fr-cta" style={{ marginTop: 12 }} onClick={onSay}>
          늦을 것 같다고 방에 알리기
        </button>
      )}
    </section>
  );
}

interface Props {
  room: RoomState;
  view: RoomView | null;
  onBack: () => void;
  onOpen: (id: string) => void;
}

// 내 화면 · 공유 중(목업 2번)과 함께하는 사람들. 보이는 것은 단계와 도착 예정뿐이다
export function RoomLive({ room, view, onBack, onOpen }: Props) {
  const { session, tone, now, actions } = useApp();
  const [msg, setMsg] = useState('');
  const me = view?.members.find((m) => m.isMe);
  const others = view?.members.filter((m) => !m.isMe) ?? [];

  const toggle = () => {
    void setRoomSharing(room.roomId, !room.sharing);
    actions.setRoom({ ...room, sharing: !room.sharing });
  };
  const say = async () => {
    if (!session) return;
    const text = lateMessage(tone, session, now); // 도착 시각과 늦는 분만 담긴다. 준비 단계는 없다
    setMsg((await sayInRoom(room.roomId, text)) ? `방에 알렸어요: “${text}”` : '알리지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  };

  return (
    <div className="m-screen">
      <TopBar title={view?.title ? `${view.title}` : '친구와 약속'} onBack={onBack} tag={<span className={`fr-tag ${room.sharing ? 'is-accent' : ''}`}>{room.sharing ? '공유 중' : '공유 꺼짐'}</span>} />
      <MyHero me={me} canSay={!!session && room.sharing} onSay={say} />
      <section className="m-card">
        <h2 className="m-sec-title" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 6 }}>친구에게 보이는 것</h2>
        <Shown label="지금 단계" on={room.sharing} />
        <Shown label="도착 예정 시각" on={room.sharing} />
        <Shown label="미루기·기록 · 항상 숨김" on={false} />
        <Shown label="위치 · 공유 안 함" on={false} />
      </section>
      {me?.cheer && <p className="fr-bubble">{me.cheerFrom}님: “{me.cheer}”</p>}
      <Others others={others} onOpen={onOpen} />
      <p className="fr-small" role="status">{msg}</p>
      <div className="m-spacer" />
      <button type="button" className="fr-ghost" onClick={async () => setMsg(await sendInvite(room.code))}>
        초대 링크 보내기 · 코드 {room.code}
      </button>
      <button type="button" className="fr-ghost" onClick={toggle}>
        {room.sharing ? '공유 끄기' : '다시 공유하기'}
      </button>
      <button type="button" className="fr-exit" onClick={() => actions.setRoom(null)} style={{ alignSelf: 'center' }}>
        방에서 나가기
      </button>
    </div>
  );
}
