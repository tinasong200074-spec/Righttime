import { useState } from 'react';
import { fmtClock } from '../../domain/format';
import type { RoomMember } from '../../domain/room';
import { moodOf, sceneOf, type Mood } from './memberScene';
import { Timeline } from './Timeline';
import { TopBar } from './TopBar';
import { CHEER_EMOJI, CHEER_TEXT, cheerOptions, type CheerEmojiKey, type CheerKey } from '../../domain/cheer';
import './cheer.css';

interface Props {
  m: RoomMember;
  arriveMs: number;
  now: number;
  onBack: () => void;
  onCheer: (key: CheerKey) => Promise<boolean | null>;
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

// 한마디 두 개(시간에 따라 달라진다)와 이모티콘 일곱 개. 누르면 바로 보낸다
function CheerBox({ m, arriveMs, now, onCheer }: Pick<Props, 'm' | 'arriveMs' | 'now' | 'onCheer'>) {
  const [sent, setSent] = useState('');
  const send = async (key: CheerKey, label: string) => {
    setSent('보내는 중…');
    setSent((await onCheer(key)) ? `“${label}” 보냈어요` : '보내지 못했어요. 잠시 뒤 다시 눌러 주세요.');
  };
  return (
    <>
      <div className="cheer-row">
        {cheerOptions({ arriveMs, now, lateMin: m.lateMin }).map((k) => (
          <button key={k} type="button" className="fr-ghost" onClick={() => send(k, CHEER_TEXT[k])}>
            {CHEER_TEXT[k]}
          </button>
        ))}
      </div>
      <div className="cheer-emojis" role="group" aria-label="이모티콘 보내기">
        {(Object.keys(CHEER_EMOJI) as CheerEmojiKey[]).map((k) => (
          <button key={k} type="button" className="cheer-emoji" aria-label={`${CHEER_EMOJI[k].label} 보내기`} onClick={() => send(k, CHEER_EMOJI[k].icon)}>
            {CHEER_EMOJI[k].icon}
          </button>
        ))}
      </div>
      <p className="cheer-sent" role="status">
        {sent}
      </p>
    </>
  );
}

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
      {!m.result && m.sharing && <CheerBox m={m} arriveMs={arriveMs} now={now} onCheer={onCheer} />}
      {onLeave && (
        <button type="button" className="fr-exit" style={{ alignSelf: 'center' }} onClick={onLeave}>
          방에서 나가기
        </button>
      )}
    </div>
  );
}
