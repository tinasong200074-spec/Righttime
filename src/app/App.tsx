import { useState } from 'react';
import { AppointmentScreen } from '../features/appointment';
import { HistoryScreen } from '../features/history';
import { HomeScreen } from '../features/home';

type Tab = 'home' | 'add' | 'history';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'home', label: '홈' },
  { id: 'add', label: '약속 추가' },
  { id: 'history', label: '기록' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('home');

  return (
    <div className="app">
      <main className="app-main">
        {tab === 'home' && <HomeScreen />}
        {tab === 'add' && <AppointmentScreen onSaved={() => setTab('home')} />}
        {tab === 'history' && <HistoryScreen />}
      </main>
      <nav className="app-tabs" aria-label="화면 이동">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
