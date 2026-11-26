import { useEffect, useState } from 'react';
import { fmtClock } from '../../domain/format';
import { CHEER_EMOJI, CHEER_TEXT, LINK_CHEERS, type CheerEmojiKey, type CheerKey } from '../../domain/cheer';
import { isStale, STAGE_ROWS } from '../../domain/share';
import { cheerShare, fetchShare, type SharedView } from '../../infra/share';
import { Icon, Pill } from '../../ui';
import '../friends/cheer.css';
import './share.css';

const POLL_MS = 5000;
type Load = { kind: 'loading' } | { kind: 'closed' } | { kind: 'ok'; view: SharedView };

function useShared(token: string): { load: Load; now: number } {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const view = await fetchShare(token);
      if (!alive) return;
      setNow(Date.now());
      // 불러오기에 실패했을 때는 마지막으로 본 값을 그대로 둔다
      setLoad((prev) => (view ? { kind: 'ok', view } : prev.kind === 'ok' ? prev : { kind: 'closed' }));
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [token]);
  return { load, now };
}

function agoText(ms: number): string {
  const min = Math.floor(ms / 60_000);
  return min < 1 ? '방금 업데이트' : `${min}분 전 업데이트`;
}

function StageList({ view, stale }: { view: SharedView; stale: boolean }) {
  const curIdx = STAGE_ROWS.findIndex((r) => r.id === view.stage);
  return (
    <ol className={`sv-stages ${stale ? 'is-stale' : ''}`}>
      {STAGE_ROWS.map((row, i) => {
        const status = i < curIdx ? 'done' : i === curIdx ? 'now' : 'next';
        const steps = status === 'now' && view.stepCount ? ` · ${(view.stepIdx ?? 0) + 1}/${view.stepCount}` : '';
        // 도착 줄에는 예정 시각을, 나머지는 지금 어디인지만 적는다(단계별 시각은 공유하지 않는다)
        const eta = row.id === 'arrived' && view.etaMs !== null ? fmtClock(view.etaMs) : '';
        const note = status === 'done' ? '완료' : status === 'now' ? (stale ? '마지막 확인' : '지금') : eta || '—';
        return (
          <li key={row.id} className={`is-${status}`} aria-current={status === 'now' ? 'step' : undefined}>
            <span className="sv-dot">{status === 'done' && <Icon name="check" main="#fff" size={14} />}</span>
            <span className="sv-stage-name">{row.label + steps}</span>
            <span className="sv-stage-note">{note}</span>
          </li>
        );
      })}
    </ol>
  );
}

// 보는 사람이 보낼 수 있는 한마디 두 개와 이모티콘 일곱 개. 누르면 공유한 사람 화면 맨 위에 5초 동안 뜬다
function SendBox({ token }: { token: string }) {
  const [sent, setSent] = useState('');
  const send = async (key: CheerKey, label: string) => {
    setSent('보내는 중…');
    setSent((await cheerShare(token, key)) ? `“${label}” 보냈어요` : '보내지 못했어요. 잠시 뒤 다시 눌러 주세요.');
  };
  return (
    <section className="sv-send" aria-label="한마디 보내기">
      <div className="cheer-row">
        {LINK_CHEERS.map((k) => (
          <button key={k} type="button" className="sv-say" onClick={() => send(k, CHEER_TEXT[k])}>
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
    </section>
  );
}

function AppIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 120 120" role="img" aria-label="제때">
      <rect width="120" height="120" rx="27" fill="var(--ink)" />
      <circle cx="60" cy="60" r="31" fill="none" stroke="var(--accent)" strokeWidth="9" />
      <path d="M60 60V29A31 31 0 0 1 91 60Z" fill="var(--accent)" />
    </svg>
  );
}

function EtaHero({ view, stale, now }: { view: SharedView; stale: boolean; now: number }) {
  const early = view.etaMs !== null ? Math.round((view.arriveMs - view.etaMs) / 60_000) : 0;
  const arrived = view.stage === 'arrived';
  return (
    <section className={`sv-hero ${stale ? 'is-stale' : ''}`}>
      <span className="sv-status">{stale ? '확인 안 됨' : arrived ? '도착' : '오는 중'}</span>
      {stale && <h2>상태를 확인하지 못했어요</h2>}
      {view.etaMs !== null ? (
        <>
          <p className="sv-label">{arrived ? '도착한 시각' : stale ? '마지막으로 알려 준 도착 예정' : '도착 예정'}</p>
          <p className="sv-clock">{fmtClock(view.etaMs)}</p>
        </>
      ) : (
        <p className="sv-label">도착 예정 시각은 공유하지 않았어요.</p>
      )}
      <p className="sv-sub">
        {stale ? `${agoText(now - view.updatedAtMs)} · ` : ''}약속 {fmtClock(view.arriveMs)}
        {view.etaMs !== null && !view.lateMin && early > 0 ? ` · ${early}분 일찍` : ''}
      </p>
      {view.lateMin ? <span className="sv-late">약속보다 {view.lateMin}분 늦어요</span> : null}
    </section>
  );
}

function Closed() {
  return (
    <main className="sv">
      <section className="sv-hero is-stale">
        <span className="sv-status">닫힘</span>
        <h1 className="sv-title sv-gap">링크가 닫혔어요</h1>
        <p className="sv-sub">약속이 끝났거나 상대가 공유를 껐어요.</p>
      </section>
    </main>
  );
}

// 링크로 보기(명세 ⑫~⑭, ⑯). 보기만 할 수 있고, 위치는 어디에도 없다
export function Viewer({ token }: { token: string }) {
  const { load, now } = useShared(token);

  if (load.kind === 'loading') return <main className="sv"><p className="sv-note">불러오는 중이에요…</p></main>;
  if (load.kind === 'closed') return <Closed />;

  const { view } = load;
  const stale = isStale(view.updatedAtMs, now);

  return (
    <main className="sv">
      <header className="sv-head">
        <h1 className="sv-title">{view.name}의 준비 현황</h1>
        <Pill>보기만 가능</Pill>
      </header>

      <EtaHero view={view} stale={stale} now={now} />
      {view.stage && <StageList view={view} stale={stale} />}
      <SendBox token={token} />

      <p className="sv-note">
        {stale
          ? '앱을 닫았거나 인터넷이 끊겼을 수 있어요. 단계는 직접 눌러야 바뀌어서 지금과 다를 수 있어요.'
          : `${agoText(now - view.updatedAtMs)} · 자동으로 새로고침돼요 · 약속이 끝나면 링크가 닫혀요`}
      </p>

      <div className="sv-banner">
        <AppIcon />
        <span>앱을 깔면 알림도 받아요</span>
        <a className="sv-get" href="/">
          앱 받기
        </a>
      </div>
    </main>
  );
}
