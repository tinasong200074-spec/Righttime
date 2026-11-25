import { useEffect, useRef } from 'react';
import { buildShareStatus, shareKey } from '../domain/share';
import { closeShare, pushShare } from '../infra/share';
import type { Actions } from './actions';
import type { AppState } from './state';

const HEARTBEAT_MS = 60_000; // 값이 그대로여도 1분마다 "살아 있음"을 알린다(상대 화면의 "확인 안 됨" 방지)

// 공유 중이면 단계·도착 예정이 바뀔 때마다 서버에 올린다. 화면은 이 훅을 몰라도 된다
export function useShareSync(state: AppState, now: number, actions: Actions): void {
  const last = useRef({ key: '', at: 0, arrived: false });
  const { share, session, shareName } = state;

  useEffect(() => {
    if (!share) return;
    if (!session || now > share.expiresAt) {
      // 약속이 끝났거나 알람을 껐다. 도착까지 알린 링크는 만료 때까지 두고, 아니면 바로 닫는다
      if (!last.current.arrived) void closeShare(share);
      last.current = { key: '', at: 0, arrived: false };
      actions.stopShare();
      return;
    }
    const status = buildShareStatus(session, now, { name: shareName, showStage: share.showStage, showEta: share.showEta });
    const key = shareKey(status);
    const realNow = Date.now(); // 시연 시계가 아니라 실제 시각으로 간격을 잰다
    if (key === last.current.key && realNow - last.current.at < HEARTBEAT_MS) return;
    last.current = { key, at: realNow, arrived: session.state === 'summary' };
    void pushShare(share, status, share.expiresAt);
  }, [share, session, shareName, now, actions]);
}
