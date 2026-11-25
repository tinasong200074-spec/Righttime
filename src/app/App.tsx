import { useState } from 'react';
import { MorningFlow } from '../features/morning';
import { PushToggle } from '../features/push/PushToggle';
import { RecordsScreen } from '../features/records';
import { SettingsScreen } from '../features/settings';
import { ShareBar } from '../features/share/ShareBar';
import { SharedInbox } from '../features/shareTarget/SharedInbox';
import { TodayScreen } from '../features/today';
import { Icon, type IconName } from '../ui';
import { AppProvider, useApp } from './store';

type Tab = 'today' | 'records' | 'settings';

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'today', label: '오늘', icon: 'clock' },
  { id: 'records', label: '기록', icon: 'record' },
  { id: 'settings', label: '설정', icon: 'settings' },
];

function DemoBadge() {
  const { demo, actions } = useApp();
  if (!demo) return null;
  return (
    <div className="app-demo" role="status">
      <span>시연 모드 · 1초가 1분처럼 흘러요</span>
      <button type="button" onClick={actions.endDemo}>
        시연 끝내기
      </button>
    </div>
  );
}

function Shell() {
  const { session } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  // 알람이 울린 뒤부터 기록 저장까지는 아침 진행 화면만 보여 준다
  const inMorning = session !== null && session.state !== 'armed';

  return (
    <div className="app">
      <DemoBadge />
      <ShareBar />
      <SharedInbox />
      {session?.transitNote && (
        <p className="app-note" role="status">
          {session.transitNote}
        </p>
      )}
      {inMorning ? (
        <main className="app-main is-full">
          <MorningFlow />
        </main>
      ) : (
        <>
          <main className="app-main">
            {tab === 'today' && <TodayScreen />}
            {tab === 'records' && <RecordsScreen />}
            {tab === 'settings' && <PushToggle />}
            {tab === 'settings' && <SettingsScreen />}
          </main>
          <nav className="app-tabs" aria-label="화면 이동">
            {TABS.map(({ id, label, icon }) => (
              <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                <Icon name={icon} main={tab === id ? 'var(--ink)' : 'var(--muted)'} det={tab === id ? 'var(--accent)' : 'var(--surface)'} />
                {label}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
