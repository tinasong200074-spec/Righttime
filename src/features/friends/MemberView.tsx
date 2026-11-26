import { fmtClock } from '../../domain/format';
import type { RoomMember } from '../../domain/room';
import { moodOf, sceneOf, type Mood } from './memberScene';
import { Timeline } from './Timeline';
import { TopBar } from './TopBar';

interface Props {
  m: RoomMember;
  arriveMs: number;
  now: number;
  onBack: () => void;
  onCheer: () => void;
  onLeave?: () => void; // 링크로 들어온 사람에게만: 이 화면에서 바로 방을 나간다
}

function Hero({ m, arriveMs, mood }: { m: RoomMember; arriveMs: number; mood: Mood }) {
  const eta = m.etaMs !== null ? fmtClock(m.etaMs) : '--:--';
  const early = m.etaMs !== null ? Math.round((arriveMs - m.etaMs) / 60_000) : 0;
  if (mood === 'stale') {
    return (
      <section className="fr-hero is-dashed">
        <span className="fr-status">확인 안 됨</span>
        <h2 style={{ margin: '14px 0 0', fontSize: '1.375rem', fontWeight: 800 }}>상태를 확인하지 못했어요</h2>
        <div className="fr-label">마지막으로 알려준 도착 예정</div>
        <div className="fr-eta">{eta}</div>
      </section>
    );
  }
  const label = mood === 'arrived' ? (m.result === 'late' ? '도착 · 늦었어요' : '도착') : '준비 중';
  return (
    <section className="fr-hero">
      <span className="fr-status">
        <span className="fr-dot" />
        {label}
      </span>
      <div className="fr-label">{mood === 'arrived' ? '도착한 시각' : '도착 예정'}</div>
      <div className="fr-eta-row">
        <div className="fr-eta">{eta}</div>
        {m.lateMin ? (
          <span className="fr-late-pill">
            약속보다
            <br />
            {m.lateMin}분 늦어요
          </span>
        ) : null}
      </div>
      <div className="fr-label" style={{ marginTop: 4 }}>
        약속 {fmtClock(arriveMs)}
        {!m.lateMin && early > 0 ? ` · ${early}분 일찍` : ''}
      </div>
    </section>
  );
}

// 받침이 있으면 "이가", 없으면 "가"
const subject = (name: string) => {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? '이가' : '가';
};

// 친구 한 명의 상태 화면: 준비 중 / 늦을 것 같을 때 / 확인 안 됨(목업 3·4·5번). 재촉 없이 안심 메시지만 보낸다
export function MemberView({ m, arriveMs, now, onBack, onCheer, onLeave }: Props) {
  const mood = moodOf(m, now);
  const scene = sceneOf(m);
  const unknown = mood === 'stale' || mood === 'hidden';
  return (
    <div className="m-screen">
      <TopBar title={m.name} onBack={onBack} />
      <Hero m={m} arriveMs={arriveMs} mood={mood} />
      {m.message && (
        <section className="m-card">
          <div className="m-muted">
            {m.name}
            {subject(m.name)} 직접 알렸어요
          </div>
          <p className="fr-bubble">{m.message}</p>
        </section>
      )}
      <Timeline steps={scene.steps} stages={scene.stages} stageNow={scene.stageNow} unknown={unknown} />
      <p className="fr-foot">
        {mood === 'stale' ? '단계는 직접 눌러야 바뀌어요. 지금과 다를 수 있어요.' : '이 약속에서만 공유돼요. 몇 번 봤는지는 알려 주지 않아요.'}
      </p>
      <div className="m-spacer" />
      {!m.result && m.sharing && (
        <button type="button" className="fr-ghost" onClick={onCheer}>
          {m.lateMin ? '‘괜찮아요, 천천히 와요’ 보내기' : '‘천천히 와요’ 보내기'}
        </button>
      )}
      {onLeave && (
        <button type="button" className="fr-exit" style={{ alignSelf: 'center' }} onClick={onLeave}>
          방에서 나가기
        </button>
      )}
    </div>
  );
}
