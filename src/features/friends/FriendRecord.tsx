import type { Friend } from '../../domain/room';
import { ActiveMark } from './ActiveMark';
import { TopBar } from './TopBar';

// 목업 15번의 ✅·⏰ 표시는 목업과 명세 7.3에 그대로 적힌 것이라 글자 그대로 쓴다(줄 늘어놓기는 하지 않는다)
function Count({ icon, n, label }: { icon: string; n: number; label: string }) {
  return (
    <span className={`fr-num ${n === 0 ? 'is-zero' : ''}`} aria-label={`${label} ${n}번`}>
      <span aria-hidden="true">{icon}</span>
      {n}
    </span>
  );
}

function Row({ who, kept, late }: { who: string; kept: number; late: number }) {
  return (
    <div className="fr-tally-row">
      <span className="m-muted" style={{ fontSize: '0.9375rem' }}>
        {who}
      </span>
      <span className="fr-pair">
        <Count icon="✅" n={kept} label="지켰어요" />
        <Count icon="⏰" n={late} label="늦었어요" />
      </span>
    </div>
  );
}

// 친구 한 명의 약속 기록: 함께한 약속 수와 지켰어요/늦었어요 누적(나, 친구)
export function FriendRecord({ friend: f, onBack }: { friend: Friend; onBack: () => void }) {
  return (
    <div className="m-screen">
      <TopBar title={f.name} onBack={onBack} />
      <section className="fr-card" style={{ cursor: 'default' }}>
        <div className="fr-person">
          <span className={`fr-avatar ${f.active ? 'is-live' : ''}`}>{f.name.slice(0, 1)}</span>
          <span className="fr-grow">
            <div style={{ fontWeight: 800 }}>
              {f.name}
              {f.active && <ActiveMark />}
            </div>
            <div className="m-muted">함께한 약속 {f.together}회</div>
          </span>
        </div>
        <div className="fr-tally">
          <Row who="나" kept={f.myKept} late={f.myLate} />
          <Row who={f.name} kept={f.theirKept} late={f.theirLate} />
        </div>
      </section>
      <div className="fr-legend">
        <span>✅ 지켰어요</span>
        <span>⏰ 늦었어요</span>
      </div>
      <p className="fr-small">기록은 나와 그 친구에게만 보여요.</p>
    </div>
  );
}
