import { useState } from 'react';
import { useApp } from '../../app/store';
import { lateInfo, lateMessage, projArrive } from '../../domain/message';
import { shareExpiresAt } from '../../domain/share';
import { sayInRoom } from '../../infra/rooms';
import { shareAvailable, shareUrl } from '../../infra/share';
import { newToken, sendLink } from '../share/ShareBar';
import './ask.css';

// 진행 화면 아래의 두 버튼.
// ① 링크 보내기: 친구 목록에 없는 사람(앱이 없어도 된다)에게 내 준비 현황 링크를 보낸다
// ② 늦을 것 같다고 방에 알리기: 친구 방에 들어가 있고, 출발 시각이 지나 늦을 것 같을 때만 보인다
export function MorningShare() {
  const { session: s, share, shareName, room, tone, now, actions } = useApp();
  const [msg, setMsg] = useState('');
  if (!s || s.state === 'summary') return null;

  const send = async () => {
    const cur = share ?? { token: newToken(), writeKey: newToken() + newToken(), showStage: true, showEta: true, expiresAt: shareExpiresAt(s.arriveAt) };
    if (!share) actions.startShare(cur);
    setMsg((await sendLink(shareUrl(cur.token), shareName)) || '링크를 보냈어요. 약속이 끝나면 닫혀요.');
  };
  const late = now > s.leaveAt && lateInfo(projArrive(s, now), s.arriveAt).isLate;
  const say = async () => {
    if (!room) return;
    const text = lateMessage(tone, s, now); // 도착 시각과 늦는 분만 담긴다. 준비 단계는 없다
    setMsg((await sayInRoom(room.roomId, text)) ? `방에 알렸어요: “${text}”` : '알리지 못했어요. 잠시 뒤 다시 눌러 주세요.');
  };

  return (
    <div className="ms">
      {shareAvailable && (
        <button type="button" className="ms-btn" onClick={send}>
          {share ? '링크 다시 보내기' : '친구에게 링크 보내기'}
        </button>
      )}
      {room?.sharing && late && (
        <button type="button" className="ms-btn is-strong" onClick={say}>
          늦을 것 같다고 방에 알리기
        </button>
      )}
      <p className="ms-msg" role="status">
        {msg}
      </p>
    </div>
  );
}
