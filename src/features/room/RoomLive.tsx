import { useState } from 'react';
import type { RoomState } from '../../app/state';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { lateMessage } from '../../domain/message';
import { memberLine, type RoomMember, type RoomView } from '../../domain/room';
import { isStale, STAGE_ROWS } from '../../domain/share';
import { cheerInRoom, roomUrl, sayInRoom, setRoomSharing } from '../../infra/rooms';
import { Card, HeroCard, OutlineButton, Pill, PrimaryButton } from '../../ui';

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

// 상대 한 명의 카드(명세 ⑫~⑭). 재촉은 없고 안심 메시지만 보낼 수 있다
function MemberCard({ m, arriveMs, now, onCheer }: { m: RoomMember; arriveMs: number; now: number; onCheer: () => void }) {
  const stale = m.sharing && !m.result && m.stage !== null && isStale(m.updatedAtMs, now);
  const early = m.etaMs !== null ? Math.round((arriveMs - m.etaMs) / 60_000) : 0;
  return (
    <HeroCard dashed={stale}>
      <div className="share-head">
        <strong>{m.name}</strong>
        <Pill tone={stale ? 'chip' : 'dark'}>{stale ? '확인 안 됨' : memberLine(m, stageLabel)}</Pill>
      </div>
      {m.etaMs !== null && (
        <>
          <p className="ui-hero-label">{m.result ? '도착한 시각' : stale ? '마지막으로 알려 준 도착 예정' : '도착 예정'}</p>
          <p className={stale ? 'share-eta-stale' : 'ui-hero-num'}>{fmtClock(m.etaMs)}</p>
          <p className="ui-hero-label">
            약속 {fmtClock(arriveMs)}
            {!m.lateMin && early > 0 ? ` · ${early}분 일찍` : ''}
          </p>
        </>
      )}
      {m.lateMin ? <Pill tone="accent">약속보다 {m.lateMin}분 늦어요</Pill> : null}
      {m.message && <p className="room-bubble">{m.name}님이 직접 알렸어요: “{m.message}”</p>}
      {stale && <p className="share-note">단계는 직접 눌러야 바뀌어요. 지금과 다를 수 있어요.</p>}
      {!m.result && m.sharing && <OutlineButton onClick={onCheer}>{m.lateMin ? "'괜찮아요, 천천히 와요' 보내기" : "'천천히 와요' 보내기"}</OutlineButton>}
    </HeroCard>
  );
}

function MyControls({ room, me }: { room: RoomState; me: RoomMember | undefined }) {
  const { session, tone, now, actions } = useApp();
  const [msg, setMsg] = useState('');
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
    <Card>
      <div className="share-head">
        <h2 className="room-h2">내 상태</h2>
        <Pill tone={room.sharing ? 'soft' : 'chip'}>{room.sharing ? '공유 중' : '공유 꺼짐'}</Pill>
      </div>
      <p className="share-note">{me ? memberLine(me, stageLabel) : '불러오는 중이에요…'} · 알람을 켜면 단계와 도착 예정이 자동으로 올라가요.</p>
      {me?.cheer && (
        <p className="room-bubble">
          {me.cheerFrom}님: “{me.cheer}”
        </p>
      )}
      {session && room.sharing && <PrimaryButton onClick={say}>늦을 것 같다고 방에 알리기</PrimaryButton>}
      <OutlineButton onClick={async () => setMsg(await sendInvite(room.code))}>초대 링크 보내기 · 코드 {room.code}</OutlineButton>
      <OutlineButton onClick={toggle}>{room.sharing ? '공유 끄기' : '다시 공유하기'}</OutlineButton>
      <OutlineButton onClick={() => actions.setRoom(null)}>방에서 나가기</OutlineButton>
      <p className="share-note" role="status">
        {msg || '끄면 상대 화면에서 내 상태가 바로 사라져요. 상대가 몇 번 봤는지는 알려 주지 않아요.'}
      </p>
    </Card>
  );
}

export function RoomLive({ room, view, refresh }: { room: RoomState; view: RoomView | null; refresh: () => void }) {
  const others = view?.members.filter((m) => !m.isMe) ?? [];
  const cheer = (m: RoomMember) => {
    void cheerInRoom(room.roomId, m.userId, m.lateMin ? 'ok' : 'slow').then(refresh);
  };
  return (
    <>
      <MyControls room={room} me={view?.members.find((m) => m.isMe)} />
      {view && others.length === 0 && (
        <Card>
          <p className="share-note">아직 아무도 들어오지 않았어요. 초대 링크를 보내 주세요.</p>
        </Card>
      )}
      {view && others.map((m) => <MemberCard key={m.userId} m={m} arriveMs={view.arriveMs} now={Date.now()} onCheer={() => cheer(m)} />)}
    </>
  );
}
