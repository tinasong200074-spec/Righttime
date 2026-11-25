import type { Session } from '../../domain/types';
import { useApp } from '../../app/store';
import { Depart } from './Depart';
import { Glow } from './Glow';
import './morning.css';
import { Prep } from './Prep';
import { Summary } from './Summary';
import { Travel } from './Travel';
import { useMorningAlerts } from './useMorningAlerts';
import { Wake } from './Wake';

function Screen({ state }: { state: Session['state'] }) {
  switch (state) {
    case 'ringing':
    case 'snoozed':
      return <Wake />;
    case 'prep':
      return <Prep />;
    case 'check':
      return <Depart />;
    case 'travel':
      return <Travel />;
    case 'summary':
      return <Summary />;
    default:
      return null;
  }
}

// 알람이 울린 뒤부터 기록 저장까지의 전체 화면. session.state로 화면을 고른다.
export function MorningFlow() {
  const app = useApp();
  if (!app.session) return null;
  return <MorningBody session={app.session} app={app} />;
}

// 알림 훅은 세션이 있을 때만 돌리려고 따로 나눴다
function MorningBody({ session, app }: { session: Session; app: ReturnType<typeof useApp> }) {
  useMorningAlerts(session, app.now, app.settings, app.checklist);
  return (
    <div className="morning">
      <Glow on={app.glow} />
      <Screen state={session.state} />
    </div>
  );
}
