import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { cheerLine } from '../../domain/cheer';
import { notify } from '../../infra/alarm';
import { useRoomView } from '../room/useRoomView';
import './cheer.css';

const SHOW_MS = 5000;

// 친구가 한마디나 이모티콘을 보내면 화면 맨 위에 톡 메시지처럼 5초 동안 띄우고 소리를 낸다.
// 어느 탭에 있어도 뜬다. 방에 들어가 있을 때만 5초마다 확인한다
export function CheerToast() {
  const { room, settings } = useApp();
  const { view } = useRoomView(room?.roomId ?? null);
  const me = view?.members.find((m) => m.isMe);
  const key = me?.cheer ? `${me.cheerFrom}|${me.cheer}|${me.cheerAtMs ?? ''}` : '';
  const seen = useRef<string | null>(null); // 처음 불러온 값은 예전 메시지라 알리지 않는다
  const [line, setLine] = useState('');

  useEffect(() => {
    if (!view) return;
    const first = seen.current === null;
    const changed = key !== seen.current;
    seen.current = key;
    if (first || !changed || !key || !me?.cheer) return;
    const text = cheerLine(me.cheerFrom, me.cheer);
    setLine(text);
    notify('친구가 보냈어요', text, { sound: settings.sound });
    const id = setTimeout(() => setLine(''), SHOW_MS);
    return () => clearTimeout(id);
  }, [view, key, me, settings.sound]);

  if (!line) return null;
  return (
    <div className="cheer-toast" role="status" aria-live="polite">
      {line}
    </div>
  );
}
