import { useEffect, useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import { isNativeApp } from '../../infra/nativeAlarm';
import { Icon } from '../../ui';
import '../share/share.css';

const SHOW_MS = 6000;
const SEEN_KEY = 'jette:hint-seen';
const readSeen = () => {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || null;
  } catch {
    return null;
  }
};

// 웹앱은 닫혀 있으면 알람 소리를 낼 수 없다. 알람을 켠 직후에 휴대폰 시계 알람도 같이 맞추라고 알린다.
// 알람 하나에 한 번만, 6초 동안 보여 주고 사라진다
export function AlarmHint() {
  const { session } = useApp();
  const [seenAt, setSeenAt] = useState<number | null>(readSeen);
  const alarmAt = session && !session.demo && session.state === 'armed' ? session.alarmAt : null;
  const show = alarmAt !== null && seenAt !== alarmAt && !isNativeApp(); // 설치 앱은 닫아도 울린다

  useEffect(() => {
    if (!show || alarmAt === null) return;
    const id = setTimeout(() => {
      setSeenAt(alarmAt);
      try {
        localStorage.setItem(SEEN_KEY, String(alarmAt));
      } catch {
        // 저장하지 못하면 다시 열 때 한 번 더 보일 수 있다
      }
    }, SHOW_MS);
    return () => clearTimeout(id);
  }, [show, alarmAt]);

  if (!show || alarmAt === null) return null;
  return (
    <section className="share-card" role="status" aria-label="휴대폰 알람 안내">
      <div className="share-info">
        <span className="share-tile">
          <Icon name="bell" size={26} main="var(--ink)" det="var(--chip)" />
        </span>
        <div className="share-info-text">
          <strong>휴대폰 시계에도 {fmtClock(alarmAt)} 알람을 맞춰 주세요</strong>
          <span>앱을 닫아 두면 알람 소리가 나지 않고 알림만 와요.</span>
        </div>
      </div>
    </section>
  );
}
