import type { Friend, Tally } from './sample';

// 목업 15번의 ✅·⏰ 표시는 목업과 명세 7.3에 그대로 적힌 것이라 글자 그대로 쓴다(줄 늘어놓기는 하지 않는다)
function Count({ icon, n, label }: { icon: string; n: number; label: string }) {
  return (
    <span className={`fr-num ${n === 0 ? 'is-zero' : ''}`} aria-label={`${label} ${n}번`}>
      <span aria-hidden="true">{icon}</span>
      {n}
    </span>
  );
}

function Row({ who, t }: { who: string; t: Tally }) {
  return (
    <div className="fr-tally-row">
      <span className="m-muted" style={{ fontSize: '0.9375rem' }}>
        {who}
      </span>
      <span className="fr-pair">
        <Count icon="✅" n={t.kept} label="지켰어요" />
        <Count icon="⏰" n={t.late} label="늦었어요" />
      </span>
    </div>
  );
}

function FriendCard({ f, onOpen }: { f: Friend; onOpen: () => void }) {
  return (
    <button type="button" className="fr-card" onClick={onOpen} aria-label={`${f.name}, 함께한 약속 ${f.count}회`}>
      <div className="fr-person">
        <span className={`fr-avatar ${f.live ? 'is-live' : ''}`}>{f.name.slice(0, 1)}</span>
        <span className="fr-grow">
          <div style={{ fontWeight: 800 }}>{f.name}</div>
          <div className="m-muted">함께한 약속 {f.count}회</div>
        </span>
        {f.live && <span className="fr-tag is-accent">지금 준비 중</span>}
      </div>
      <div className="fr-tally">
        <Row who="나" t={f.me} />
        <Row who={f.name} t={f.them} />
      </div>
    </button>
  );
}

interface Props {
  friends: Friend[];
  onOpen: (id: string) => void;
  onAdd: () => void;
  onExit?: () => void;
}

// 친구 목록 · 약속 기록(목업 15번)
export function FriendList({ friends, onOpen, onAdd, onExit }: Props) {
  return (
    <div className="m-screen">
      {onExit && (
        <button type="button" className="fr-exit" onClick={onExit}>
          ‹ 설정으로
        </button>
      )}
      <div className="fr-head">
        <h1 className="m-h1">친구</h1>
        <span className="fr-tags">
          <span className="fr-tag">예시</span>
          <button type="button" className="fr-add" onClick={onAdd}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
            친구 추가
          </button>
        </span>
      </div>
      <div className="fr-legend">
        <span>✅ 지켰어요</span>
        <span>⏰ 늦었어요</span>
      </div>
      {friends.map((f) => (
        <FriendCard key={f.id} f={f} onOpen={() => onOpen(f.id)} />
      ))}
      <p className="fr-small">기록은 나와 그 친구에게만 보여요. 지금은 예시 데이터예요.</p>
    </div>
  );
}
