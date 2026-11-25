import { useEffect, useState } from 'react';
import { fmtClock } from '../../domain/format';
import { isStale, STAGE_ROWS } from '../../domain/share';
import { fetchShare, type SharedView } from '../../infra/share';
import { HeroCard, Icon, Pill } from '../../ui';
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
    <ol className={`share-stages ${stale ? 'is-stale' : ''}`}>
      {STAGE_ROWS.map((row, i) => {
        const status = i < curIdx ? 'done' : i === curIdx ? 'now' : 'next';
        const steps = status === 'now' && view.stepCount ? ` · ${(view.stepIdx ?? 0) + 1}/${view.stepCount}` : '';
        return (
          <li key={row.id} className={`is-${status}`} aria-current={status === 'now' ? 'step' : undefined}>
            <span className="share-dot">{status === 'done' && <Icon name="check" main="#fff" size={14} />}</span>
            <span className="share-stage-name">{row.label + steps}</span>
            <span className="share-stage-note">{status === 'done' ? '완료' : status === 'now' ? (stale ? '마지막으로 확인된 단계' : '지금') : ''}</span>
          </li>
        );
      })}
    </ol>
  );
}

// 링크로 보기(명세 ⑫~⑭, ⑯). 보기만 할 수 있고, 위치는 어디에도 없다
export function Viewer({ token }: { token: string }) {
  const { load, now } = useShared(token);

  if (load.kind === 'loading') return <main className="share-view"><p className="share-note">불러오는 중이에요…</p></main>;
  if (load.kind === 'closed') {
    return (
      <main className="share-view">
        <HeroCard dashed>
          <h1 className="share-title">링크가 닫혔어요</h1>
          <p className="share-note">약속이 끝났거나 상대가 공유를 껐어요.</p>
        </HeroCard>
      </main>
    );
  }

  const { view } = load;
  const stale = isStale(view.updatedAtMs, now);
  const early = view.etaMs !== null ? Math.round((view.arriveMs - view.etaMs) / 60_000) : 0;

  return (
    <main className="share-view">
      <header className="share-head">
        <h1 className="share-title">{view.name}의 준비 현황</h1>
        <Pill>보기만 가능</Pill>
      </header>

      <HeroCard dashed={stale}>
        <Pill tone={stale ? 'chip' : 'dark'}>{stale ? '확인 안 됨' : view.stage === 'arrived' ? '도착' : '오는 중'}</Pill>
        {stale && <p className="share-note">상태를 확인하지 못했어요. 앱을 닫았거나 인터넷이 끊겼을 수 있어요.</p>}
        {view.etaMs !== null ? (
          <>
            <p className="ui-hero-label">{view.stage === 'arrived' ? '도착한 시각' : stale ? '마지막으로 알려 준 도착 예정' : '도착 예정'}</p>
            <p className={stale ? 'share-eta-stale' : 'ui-hero-num'}>{fmtClock(view.etaMs)}</p>
          </>
        ) : (
          <p className="ui-hero-label">도착 예정 시각은 공유하지 않았어요.</p>
        )}
        <p className="ui-hero-label">
          약속 {fmtClock(view.arriveMs)}
          {view.etaMs !== null && !view.lateMin && early > 0 ? ` · ${early}분 일찍` : ''}
        </p>
        {view.lateMin ? <Pill tone="accent">약속보다 {view.lateMin}분 늦어요</Pill> : null}
      </HeroCard>

      {view.stage && <StageList view={view} stale={stale} />}

      <p className="share-note">
        {agoText(now - view.updatedAtMs)} · 자동으로 새로고침돼요 · 약속이 끝나면 링크가 닫혀요
        {stale ? ' · 단계는 직접 눌러야 바뀌어요. 지금과 다를 수 있어요.' : ''}
      </p>
    </main>
  );
}
