import { useState } from 'react';
import { useApp } from '../../app/store';
import { fmtClock } from '../../domain/format';
import type { PlanCalc } from '../../domain/schedule';
import { WEATHER_CREDIT } from '../../infra/weather';
import { RecentPlans } from '../recent/RecentPlans';
import { Icon, type IconName } from '../../ui';
import { dayLabel } from './model';
import { useWeather } from './useWeather';
import { WeatherRow } from './WeatherRow';

export type View = 'main' | 'plan' | 'place' | 'steps' | 'weather' | 'carry' | 'helper';
type Go = (v: View) => void;

function Header({ go }: { go: Go }) {
  const { plan, now } = useApp();
  return (
    <button type="button" className="m-head" onClick={() => go('plan')} aria-label="일정 제목과 도착 시각 고치기">
      <span>
        <span className="m-muted">{dayLabel(plan.arriveAt, now)}</span>
        <h1 className="m-title">{plan.title || '일정 이름'}</h1>
      </span>
      <span>
        <span className="m-muted">도착</span>
        <span className="m-title" style={{ display: 'block' }}>
          {fmtClock(plan.arriveAt)}
        </span>
      </span>
    </button>
  );
}

function TravelBar({ calc }: { calc: PlanCalc }) {
  const total = calc.ride.val + calc.waitMin + calc.buffer;
  const w = (n: number) => `${(n / total) * 100}%`;
  return (
    <div role="img" aria-label={`이동 ${calc.ride.val}분, 배차 대기 ${calc.waitMin}분, 여유 ${calc.buffer}분, 합계 ${total}분`}>
      <div className="m-bar">
        <span className="m-seg-ride" style={{ width: w(calc.ride.val) }} />
        {calc.waitMin > 0 && <span className="m-seg-wait" style={{ width: w(calc.waitMin) }} />}
        <span className="m-seg-buf" style={{ flex: 1 }} />
      </div>
      <div className="m-bar-labels">
        <b style={{ width: w(calc.ride.val) }}>이동 {calc.ride.val}분</b>
        <span className="m-muted" style={{ width: w(calc.waitMin) }}>
          {calc.waitMin > 0 ? `대기 ${calc.waitMin}` : ''}
        </span>
        <span className="m-muted" style={{ flex: 1, textAlign: 'right' }}>
          여유 {calc.buffer}
        </span>
      </div>
    </div>
  );
}

function DestCard({ calc, go }: { calc: PlanCalc | null; go: Go }) {
  const { origin, recentPlans, session } = useApp();
  const [open, setOpen] = useState(false);
  const hasRecent = !session && recentPlans.length > 0;
  // 최근 일정이 있으면 도착 장소를 누를 때 그 아래에 펼치고, 없으면 바로 장소 고르기로 간다
  const press = () => (hasRecent ? setOpen((v) => !v) : go('place'));
  return (
    <section className="m-card">
      <span className="m-muted">도착 장소</span>
      <button type="button" className={`m-dest ${calc?.place ? '' : 'is-empty'}`} aria-expanded={hasRecent ? open : undefined} onClick={press}>
        <Icon name="place" main="var(--ink)" det="var(--surface)" size={22} />
        {calc?.place?.name ?? '눌러서 도착 장소 정하기'}
      </button>
      {hasRecent && open && (
        <div onClick={(e) => (e.target as HTMLElement).closest('.recent-pick') && setOpen(false)}>
          <RecentPlans />
          <button type="button" className="f-btn" style={{ width: '100%', marginTop: 8 }} onClick={() => go('place')}>
            다른 장소 고르기
          </button>
        </div>
      )}
      <div className="m-muted" style={{ marginTop: 6 }}>
        출발지 · {origin?.name ?? '정하지 않았어요'}
      </div>
      {calc && (
        <div>
          <TravelBar calc={calc} />
          <div className="m-muted" style={{ marginTop: 6 }}>
            이동 시간과 여유를 더해 출발 시각을 잡았어요.
          </div>
        </div>
      )}
    </section>
  );
}

interface RowProps {
  icon: IconName;
  name: string;
  note: string;
  time: number;
  accent?: boolean;
  onClick?: () => void;
}

function Row({ icon, name, note, time, accent = false, onClick }: RowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className="m-row" {...(onClick ? { type: 'button' as const, onClick } : {})}>
      <span className={`m-circle ${accent ? 'is-accent' : ''}`}>
        <Icon name={icon} main="var(--ink)" det={accent ? 'var(--accent)' : 'var(--chip)'} size={24} />
      </span>
      <span className="m-grow">
        <div className="m-name">{name}</div>
        <div className="m-sub">{note}</div>
      </span>
      <span className="m-big">{fmtClock(time)}</span>
    </Tag>
  );
}

function Rows({ calc, go }: { calc: PlanCalc; go: Go }) {
  const travelAll = calc.ride.val + calc.waitMin + calc.buffer;
  return (
    <section className="m-card m-rows">
      <Row icon="wake" name="기상" note={`평소 ${calc.wake.val}분`} time={calc.alarmAt} />
      <Row icon="prep" name="준비" note={`${calc.prep.val}분 · ${calc.steps.length}단계`} time={calc.prepStartAt} accent onClick={() => go('steps')} />
      <Row icon="leave" name="출발" note={`이동 + 배차 + 여유 ${travelAll}분 전`} time={calc.leaveAt} />
    </section>
  );
}

function CarryRow({ go }: { go: Go }) {
  const { checklist } = useApp();
  return (
    <button type="button" className="m-card m-nav" onClick={() => go('carry')}>
      <span className="m-tile">
        <Icon name="bell" main="var(--ink)" det="var(--ink)" size={24} />
      </span>
      <span className="m-grow">
        <div className="m-name">출발할 때 알려줘요</div>
        <div className="m-sub">{checklist.length > 0 ? checklist.map((c) => c.text).join(' · ') : '눌러서 챙길 것을 적어요'}</div>
      </span>
    </button>
  );
}

function ArmButton() {
  const { calc, session, now, actions } = useApp();
  if (session) {
    return (
      <button type="button" className="m-ghost" onClick={actions.cancelSession}>
        알람 끄기 · {fmtClock(session.alarmAt)}에 울려요
      </button>
    );
  }
  return (
    <>
      <button type="button" className="m-cta" disabled={!calc || calc.arriveAt <= now} onClick={actions.arm}>
        알람 켜기
      </button>
      <p className="m-note">
        {calc && calc.alarmAt <= now ? '알람 시각이 이미 지났어요. 도착 시각을 확인해 주세요. ' : ''}웹 앱이라 화면이 열려 있을 때만 울려요 · {WEATHER_CREDIT}
      </p>
    </>
  );
}

// ① 오늘: 목업 6번과 같은 한 화면. 고치는 칸은 탭하면 열리는 보조 화면에 있다
export function TodayMain({ go }: { go: Go }) {
  const { calc } = useApp();
  const mode = useWeather();
  return (
    <div className="m-screen">
      <Header go={go} />
      <DestCard calc={calc} go={go} />
      {calc && <Rows calc={calc} go={go} />}
      <WeatherRow mode={mode} go={go} />
      <CarryRow go={go} />
      <div className="m-spacer" />
      <ArmButton />
    </div>
  );
}
