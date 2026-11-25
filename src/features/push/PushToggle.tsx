import { useState } from 'react';
import { useApp } from '../../app/store';
import { disablePush, enablePush, PUSH_REASON_TEXT, pushSupported } from '../../infra/push';
import { Card, Icon, OutlineButton, Pill, PrimaryButton } from '../../ui';
import '../share/share.css';

// 앱을 닫아 둬도 알림을 받는 스위치(설정 탭 맨 위)
export function PushToggle() {
  const { pushEndpoint, actions } = useApp();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const turnOn = async () => {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    if (r.ok) actions.setPushEndpoint(r.endpoint);
    setMsg(r.ok ? '켰어요. 알람을 켜면 그 시각에 알림이 와요.' : PUSH_REASON_TEXT[r.reason]);
  };

  const turnOff = () => {
    if (pushEndpoint) void disablePush(pushEndpoint);
    actions.setPushEndpoint(null);
    setMsg('껐어요.');
  };

  return (
    <Card className="push-card">
      <div className="share-info">
        <span className="share-tile">
          <Icon name="bell" size={26} main="var(--ink)" det="var(--chip)" />
        </span>
        <div className="share-info-text">
          <strong>앱을 닫아도 알림 받기</strong>
          <span>기상 · 출발 5분 전 · 출발 시각</span>
        </div>
        {pushEndpoint && <Pill tone="accent">켜짐</Pill>}
      </div>
      <p className="share-note">알림은 1분쯤 늦을 수 있고 알람 소리는 나지 않아요. 서버에는 알림 시각만 올라가요.</p>
      {pushEndpoint ? (
        <OutlineButton onClick={turnOff}>알림 끄기</OutlineButton>
      ) : (
        <PrimaryButton onClick={turnOn} disabled={busy || !pushSupported()}>
          알림 켜기
        </PrimaryButton>
      )}
      <p className="share-note" role="status">
        {msg || (pushSupported() ? '' : PUSH_REASON_TEXT.unsupported)}
      </p>
    </Card>
  );
}
