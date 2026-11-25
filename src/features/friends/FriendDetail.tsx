import { useState } from 'react';
import { buildMessage } from '../../domain/message';
import { RESULT_TEXT, sendText, type SendResult } from '../notify/send';
import { SCENES, type Friend } from './sample';
import { Timeline } from './Timeline';
import { TopBar } from './TopBar';

function Hero({ friend }: { friend: Friend }) {
  const sc = SCENES[friend.state];
  if (friend.state === 'unknown') {
    return (
      <section className="fr-hero is-dashed">
        <span className="fr-status">확인 안 됨</span>
        <h2 style={{ margin: '14px 0 0', fontSize: '1.375rem', fontWeight: 800 }}>상태를 확인하지 못했어요</h2>
        <div className="fr-label">마지막으로 알려준 도착 예정</div>
        <div className="fr-eta">{sc.etaText}</div>
        <div className="m-muted">{sc.detail}</div>
      </section>
    );
  }
  const late = friend.state === 'late';
  return (
    <section className="fr-hero">
      <span className="fr-status">
        <span className="fr-dot" />
        준비 중
      </span>
      <div className="fr-label">도착 예정</div>
      <div className="fr-eta-row">
        <div className="fr-eta">{sc.etaText}</div>
        {late && <span className="fr-late-pill">약속보다<br />10분 늦어요</span>}
      </div>
      {!late && <div className="fr-label" style={{ marginTop: 4 }}>{sc.detail}</div>}
    </section>
  );
}

// 받침이 있으면 "이가", 없으면 "가"
const subject = (name: string) => {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return code >= 0 && code % 28 !== 0 ? '이가' : '가';
};

function LateBubble({ name }: { name: string }) {
  const text = buildMessage({ mode: 'polite' }, 'late', { min: 10, time: SCENES.late.etaText });
  return (
    <section className="m-card">
      <div className="m-muted">{name}{subject(name)} 직접 알렸어요</div>
      <p className="fr-bubble">{text}</p>
    </section>
  );
}

const BUTTON: Record<Friend['state'], { label: string; text: string }> = {
  ontime: { label: '‘천천히 와요’ 보내기', text: '천천히 와요.' },
  late: { label: '‘괜찮아요, 천천히 와요’ 보내기', text: '괜찮아요, 천천히 와요.' },
  unknown: { label: '메시지 보내기', text: '어디쯤이에요? 천천히 와도 괜찮아요.' },
};

// 친구 화면: 준비 중 / 늦을 것 같을 때 / 확인 안 됨(목업 3·4·5번). 보내기는 공유창에서 직접 고른다
export function FriendDetail({ friend, onBack }: { friend: Friend; onBack: () => void }) {
  const sc = SCENES[friend.state];
  const unknown = friend.state === 'unknown';
  const [result, setResult] = useState<SendResult | null>(null);
  const btn = BUTTON[friend.state];

  return (
    <div className="m-screen">
      <TopBar title={friend.name} onBack={onBack} />
      <Hero friend={friend} />
      {friend.state === 'late' && <LateBubble name={friend.name} />}
      <Timeline steps={sc.steps} stages={sc.stages} stageNow={sc.stageNow} unknown={unknown} />
      <p className="fr-foot" aria-live="polite">
        {unknown ? (
          '단계는 직접 눌러야 바뀌어요. 지금과 다를 수 있어요.'
        ) : (
          <>
            <span className="fr-dot" />1분 전 업데이트 · 이 약속에서만 공유
          </>
        )}
      </p>
      <div className="m-spacer" />
      <p className="fr-small" aria-live="polite">{result ? RESULT_TEXT[result] : ''}</p>
      <button type="button" className="fr-ghost" onClick={async () => setResult(await sendText(btn.text))}>
        {btn.label}
      </button>
    </div>
  );
}
