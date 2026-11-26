import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { cheerLine } from '../../domain/cheer';
import { roomOver, stageChanges, stageNews } from '../../domain/room';
import { notify } from '../../infra/alarm';
import { useRoomView } from '../room/useRoomView';
import './cheer.css';

const SHOW_MS = 5000;

// 친구가 한마디나 이모티콘을 보내거나, 같은 약속의 친구가 다음 단계로 넘어가면
// 화면 맨 위에 톡 메시지처럼 5초 동안 띄우고 소리를 낸다.
// 어느 탭에 있어도 뜬다. 방에 들어가 있을 때만 5초마다 확인한다
export function CheerToast() {
  const { room, settings, actions } = useApp();
  const { view } = useRoomView(room?.roomId ?? null);
  const me = view?.members.find((m) => m.isMe);
  const key = me?.cheer ? `${me.cheerFrom}|${me.cheer}|${me.cheerAtMs ?? ''}` : '';
  const seen = useRef<string | null>(null); // 처음 불러온 값은 예전 메시지라 알리지 않는다
  const [line, setLine] = useState('');
  const stages = useRef<Record<string, string | null>>({}); // 친구들의 지난 단계

  useEffect(() => {
    if (!view) return;
    const first = seen.current === null;
    const changed = key !== seen.current;
    seen.current = key;
    if (first || !changed || !key || !me?.cheer) return;
    const text = cheerLine(me.cheerFrom, me.cheer);
    setLine(text);
    notify('친구가 보냈어요', text, { sound: settings.sound });
  }, [view, key, me, settings.sound]);

  // 같은 약속의 친구가 다음 단계로 넘어가면 알린다("민수님이 준비를 시작했어요")
  useEffect(() => {
    if (!view) return;
    const news = stageChanges(stages.current, view.members);
    stages.current = Object.fromEntries(view.members.map((m) => [m.userId, m.stage]));
    if (news.length === 0) return;
    const text = news.map((n) => stageNews(n.name, n.stage)).join(' · ');
    setLine(text);
    notify('친구 소식', text, { sound: settings.sound });
  }, [view, settings.sound]);

  // 초대받아 들어온 방의 약속이 끝났으면 방에서 나온다. 그래야 새로 온 초대가 보인다
  const over = !!room?.joined && !!view && view.roomId === room.roomId && roomOver(view.members);
  useEffect(() => {
    if (over) actions.setRoom(null);
  }, [over, actions]);

  // 띄운 지 5초 뒤에 지운다. 방 상태를 5초마다 다시 불러와도 이 시계는 끊기지 않게 따로 둔다
  useEffect(() => {
    if (!line) return;
    const id = setTimeout(() => setLine(''), SHOW_MS);
    return () => clearTimeout(id);
  }, [line]);

  if (!line) return null;
  return (
    <div className="cheer-toast" role="status" aria-live="polite">
      {line}
    </div>
  );
}
