import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import type { Invite } from '../../domain/room';
import { hasAccount } from '../../infra/account';
import { fetchInvites } from '../../infra/rooms';
import '../share/share.css';

const POLL_MS = 15_000;
const SKIP_KEY = 'jette:invite-skip';
const readSkip = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SKIP_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

// 친구가 나를 골라 공유를 시작했는지 15초마다 확인한다(방에 들어가 있지 않을 때만)
function useInvite(): { invite: Invite | null; skip: (id: string) => void } {
  const { room } = useApp();
  const [list, setList] = useState<Invite[]>([]);
  const [skipped, setSkipped] = useState<string[]>(readSkip);
  const lastRoom = useRef<string | null>(null);

  const skip = (id: string) =>
    setSkipped((prev) => {
      const next = [...prev.filter((x) => x !== id), id].slice(-30);
      try {
        localStorage.setItem(SKIP_KEY, JSON.stringify(next));
      } catch {
        // 저장하지 못하면 다음에 한 번 더 보일 수 있다
      }
      return next;
    });

  // 내가 나온 방은 다시 권하지 않는다
  useEffect(() => {
    if (!room && lastRoom.current) skip(lastRoom.current);
    lastRoom.current = room?.roomId ?? null;
  }, [room]);

  useEffect(() => {
    if (room || !hasAccount()) return;
    let alive = true;
    const load = () => void fetchInvites().then((v) => alive && setList(v));
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [room]);

  // 아직 내가 공유를 켜지 않은 방(방금 초대받은 방)을 먼저 보여 준다. 예전에 코드로 들어갔던 방은 뒤로 미룬다
  const fresh = list.filter((v) => !skipped.includes(v.roomId)).sort((x, y) => Number(x.sharing) - Number(y.sharing));
  return { invite: room ? null : (fresh[0] ?? null), skip };
}

// "민수님이 약속을 공유했어요" 안내. 보기를 누르면 그 친구의 준비 단계 화면으로 간다
export function InviteBanner({ onOpen }: { onOpen: () => void }) {
  const { actions } = useApp();
  const { invite, skip } = useInvite();
  if (!invite) return null;
  const open = () => {
    actions.setRoom({ roomId: invite.roomId, code: invite.code, sharing: invite.sharing, arriveMs: invite.arriveMs, joined: true });
    onOpen();
  };
  return (
    <section className="share-card" role="status" aria-label="친구가 공유한 약속">
      <div className="share-info-text">
        <strong>{invite.from || '친구'}님이 준비 현황을 공유했어요</strong>
        <span>
          {invite.title ? `${invite.title} · ` : ''}
          {fmtClock(invite.arriveMs)} 약속
        </span>
      </div>
      <div className="share-two">
        <button type="button" className="share-ok" onClick={open}>
          보기
        </button>
        <button type="button" className="share-close" onClick={() => skip(invite.roomId)}>
          닫기
        </button>
      </div>
    </section>
  );
}
