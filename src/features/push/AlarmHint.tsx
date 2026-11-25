import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { Icon } from '../../ui';
import '../share/share.css';

// 웹앱은 닫혀 있으면 알람 소리를 낼 수 없다. 알람을 켠 직후에 휴대폰 시계 알람도 같이 맞추라고 알린다
export function AlarmHint() {
  const { session } = useApp();
  const [seenAt, setSeenAt] = useState<number | null>(null);
  if (!session || session.demo || session.state !== 'armed' || seenAt === session.alarmAt) return null;
  const clock = fmtClock(session.alarmAt);
  return (
    <section className="share-card" aria-label="휴대폰 알람 안내">
      <div className="share-info">
        <span className="share-tile">
          <Icon name="bell" size={26} main="var(--ink)" det="var(--chip)" />
        </span>
        <div className="share-info-text">
          <strong>휴대폰 시계에도 {clock} 알람을 맞춰 주세요</strong>
          <span>앱을 닫아 두면 알람 소리가 나지 않고 알림만 와요.</span>
        </div>
      </div>
      <button type="button" className="share-ok" onClick={() => setSeenAt(session.alarmAt)}>
        맞췄어요
      </button>
    </section>
  );
}
