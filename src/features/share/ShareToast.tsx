import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { notify } from '../../infra/alarm';
import { fetchShareInbox } from '../../infra/share';
import '../friends/cheer.css';

const POLL_MS = 5000;
const SHOW_MS = 5000;

// 링크로 보는 사람이 한마디나 이모티콘을 보내면, 공유한 사람 화면 맨 위에 5초 동안 띄우고 소리를 낸다.
// 링크 공유 중일 때만 5초마다 확인한다
export function ShareToast() {
  const { share, settings } = useApp();
  const seen = useRef<string | null>(null); // 처음 불러온 값은 예전 메시지라 알리지 않는다
  const [line, setLine] = useState('');
  const token = share?.token;
  const writeKey = share?.writeKey;

  useEffect(() => {
    if (!token || !writeKey) {
      seen.current = null;
      return;
    }
    let alive = true;
    const load = async () => {
      const box = await fetchShareInbox({ token, writeKey });
      if (!alive) return;
      const key = box?.cheer ? `${box.cheer}|${box.cheerAtMs}` : '';
      const first = seen.current === null;
      const changed = key !== seen.current;
      seen.current = key;
      if (first || !changed || !box?.cheer) return;
      const text = `링크로 보는 친구: ${box.cheer}`;
      setLine(text);
      notify('친구가 보냈어요', text, { sound: settings.sound });
    };
    void load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token, writeKey, settings.sound]);

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
