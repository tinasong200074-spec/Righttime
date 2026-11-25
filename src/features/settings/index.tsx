import { useState } from 'react';
import { useApp } from '../../app/store';
import { TONES, buildMessage } from '../../domain/message';
import type { ToneMode } from '../../domain/types';
import { Card } from '../../ui';
import '../today/fields.css';
import '../today/main.css';
import { SubScreen } from '../today/SubScreen';
import { NumberField } from '../today/NumberField';
import { FriendsScreen } from '../friends';
import { ConfirmButton } from './ConfirmButton';
import { CustomTone } from './CustomTone';
import { PlaceManager } from './PlaceManager';
import { Switch } from './Switch';

function AlarmSection() {
  const { settings: s, actions } = useApp();
  const set = actions.updateSettings;
  return (
    <Card>
      <div className="f-grid3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <NumberField label="도착 여유" value={s.buffer} min={0} max={60} onChange={(buffer) => set({ buffer })} />
        <NumberField label="미루기 간격" value={s.snooze} min={1} max={30} onChange={(snooze) => set({ snooze })} />
        <NumberField label="평소 기상 시간" value={s.latency} min={0} max={60} onChange={(latency) => set({ latency })} />
        <NumberField label="출발 알림" value={s.preLeave} min={1} max={30} onChange={(preLeave) => set({ preLeave })} />
      </div>
      <p className="f-sub">기상 시간은 알람이 울린 뒤 준비를 시작하기까지 평소 걸리는 분이에요. 기록이 쌓이면 기록으로 바뀌어요.</p>
      <Switch label="알람 소리" on={s.sound} onChange={(sound) => set({ sound })} />
      <Switch label="출발 임박 붉은 조명" on={s.glow} onChange={(glow) => set({ glow })} />
    </Card>
  );
}

const MODES = Object.keys(TONES) as Array<Exclude<ToneMode, 'custom'>>;

function ToneSection() {
  const { tone, actions } = useApp();
  const preview = buildMessage(tone, 'eta', { time: '09:00' });
  return (
    <Card>
      <p className="f-sub">약속 상대에게 보낼 문구의 말투예요.</p>
      <div className="f-chips" role="group" aria-label="말투 고르기">
        {MODES.map((m) => (
          <button key={m} type="button" className="f-chip" aria-pressed={tone.mode === m} onClick={() => actions.setTone({ mode: m })}>
            {TONES[m].name}
          </button>
        ))}
        <button type="button" className="f-chip" aria-pressed={tone.mode === 'custom'} onClick={() => actions.setTone({ mode: 'custom' })}>
          내 말투
        </button>
      </div>
      {tone.mode === 'custom' && <CustomTone />}
      <p className="f-status">미리보기: {preview}</p>
    </Card>
  );
}

function WeatherSection() {
  const { settings: s, actions } = useApp();
  const set = actions.updateSettings;
  return (
    <Card>
      <Switch label="날씨 자동 추천" on={s.weatherAuto} onChange={(weatherAuto) => set({ weatherAuto })} />
      <div className="f-grid3">
        <NumberField label="우산 기준" unit="%" value={s.rainTh} min={0} max={100} onChange={(rainTh) => set({ rainTh })} />
        <NumberField label="쌀쌀한 기준" unit="°C" value={s.coldTh} min={-10} max={30} onChange={(coldTh) => set({ coldTh })} />
        <NumberField label="더운 기준" unit="°C" value={s.hotTh} min={10} max={45} onChange={(hotTh) => set({ hotTh })} />
      </div>
      <p className="f-sub">
        기준은 정해 둔 값이라 바꿔도 돼요. 강수확률은 약 27km 격자의 예측이라 동네마다 다를 수 있어요. 체감온도는 일정 시간대의 가장 낮은 값과 높은 값으로 봐요.
      </p>
    </Card>
  );
}

function RuleNote() {
  return (
    <Card>
      <h2 className="f-title">추천 규칙 안내</h2>
      <p className="f-sub">
        기록이 3번 이상이면 최근 5번의 평균에 변동(표준편차)의 절반을 더해서 알람을 정해요. 1~2번이면 입력한 값과 기록을 섞어요. 이 규칙은 검증된 것이 아니라 임의로 정한 값이에요. 시연 기록과 “이번 기록 제외”를 고른 기록은 쓰지 않아요.
      </p>
    </Card>
  );
}

function DemoSection() {
  const { demo, session, actions } = useApp();
  const busy = session !== null && !demo;
  return (
    <Card>
      <h2 className="f-title">시연 모드</h2>
      <p className="f-sub">시계가 60배로 흘러서 아침 준비를 1~2분에 볼 수 있어요. 시연 기록은 통계에 넣지 않고, 날씨와 위치는 부르지 않아요.</p>
      <div style={{ marginTop: 12 }}>
        {demo ? (
          <button type="button" className="f-btn" onClick={actions.endDemo}>
            시연 끝내기
          </button>
        ) : (
          <button type="button" className="f-btn" disabled={busy} onClick={actions.startDemo}>
            시연 시작
          </button>
        )}
      </div>
      {busy && <p className="f-status">알람이 켜져 있어요. 알람을 끄고 시연할 수 있어요.</p>}
    </Card>
  );
}

function DataSection() {
  const { records, actions } = useApp();
  const hasSample = records.some((r) => r.sample);
  return (
    <Card>
      <h2 className="f-title">데이터</h2>
      <p className="f-sub">기록·설정·장소는 이 기기에만 저장돼요.</p>
      <div className="f-row f-wrap" style={{ marginTop: 12 }}>
        <button type="button" className="f-btn" onClick={actions.loadSampleData}>
          샘플 데이터 넣기
        </button>
        {hasSample && (
          <button type="button" className="f-btn" onClick={actions.clearSampleData}>
            샘플 데이터 지우기
          </button>
        )}
        <ConfirmButton label="모든 데이터 삭제" confirmLabel="한 번 더 누르면 모두 지워요" onConfirm={actions.clearAllData} />
      </div>
    </Card>
  );
}

type Page = 'menu' | 'alarm' | 'tone' | 'places' | 'weather' | 'data' | 'friends';

function MenuRow({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" className="m-row s-menu" onClick={onClick}>
      <span className="m-grow">
        <div className="m-name">{title}</div>
        <div className="m-sub">{sub}</div>
      </span>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M9 5l7 7-7 7" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </button>
  );
}

function Menu({ go }: { go: (p: Page) => void }) {
  const { settings: s, tone, places, demo } = useApp();
  const toneName = tone.mode === 'custom' ? '내 말투' : TONES[tone.mode].name;
  return (
    <div className="m-screen">
      <div className="m-titlerow">
        <h1 className="m-h1">설정</h1>
      </div>
      <section className="m-card m-rows">
        <MenuRow title="알람·타이머" sub={`도착 여유 ${s.buffer}분 · 미루기 ${s.snooze}분`} onClick={() => go('alarm')} />
        <MenuRow title="말투" sub={toneName} onClick={() => go('tone')} />
        <MenuRow title="자주 가는 곳" sub={`${places.length}곳`} onClick={() => go('places')} />
        <MenuRow title="날씨 기준" sub={s.weatherAuto ? `자동 추천 켜짐 · 우산 ${s.rainTh}%` : '자동 추천 꺼짐'} onClick={() => go('weather')} />
        <MenuRow title="친구" sub="준비 현황 공유 · 약속 기록(예시)" onClick={() => go('friends')} />
        <MenuRow title="시연 모드·데이터" sub={demo ? '시연 중' : '시연, 샘플 데이터, 삭제'} onClick={() => go('data')} />
      </section>
    </div>
  );
}

const TITLES: Record<Exclude<Page, 'menu' | 'friends'>, string> = {
  alarm: '알람·타이머',
  tone: '말투',
  places: '자주 가는 곳',
  weather: '날씨 기준',
  data: '시연 모드·데이터',
};

function Body({ page }: { page: Exclude<Page, 'menu' | 'friends'> }) {
  if (page === 'alarm') return <AlarmSection />;
  if (page === 'tone') return <ToneSection />;
  if (page === 'places') return <section className="m-card"><PlaceManager /></section>;
  if (page === 'weather') return (
    <>
      <WeatherSection />
      <RuleNote />
    </>
  );
  return (
    <>
      <DemoSection />
      <DataSection />
    </>
  );
}

// 설정: 목업처럼 한 화면짜리 메뉴와, 항목마다 열리는 화면
export function SettingsScreen() {
  const [page, setPage] = useState<Page>('menu');
  if (page === 'menu') return <Menu go={setPage} />;
  if (page === 'friends') return <FriendsScreen onExit={() => setPage('menu')} />;
  return (
    <SubScreen title={TITLES[page]} onBack={() => setPage('menu')}>
      <Body page={page} />
    </SubScreen>
  );
}
