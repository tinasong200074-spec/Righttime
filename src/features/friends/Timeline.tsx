import type { TimelineStep } from './types';

function Node({ status }: { status: TimelineStep['status'] }) {
  return (
    <div className={`fr-node is-${status}`}>
      {status === 'done' && (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
      {status === 'now' && <span className="fr-node-dot" />}
    </div>
  );
}

function Segments({ stages, now, progress }: { stages: number; now: number; progress: number }) {
  return (
    <div className="fr-segs" role="img" aria-label={`준비 ${stages}단계 중 ${now}단계 진행 중`}>
      {Array.from({ length: stages }, (_, i) => (
        <div key={i} className={`fr-seg ${i + 1 < now ? 'is-full' : ''}`}>
          {i + 1 === now && <span style={{ width: `${progress * 100}%` }} />}
        </div>
      ))}
    </div>
  );
}

interface Props {
  steps: TimelineStep[];
  stages: number;
  stageNow: number;
  unknown?: boolean;
}

// 일어남 → 준비 중 → 출발 → 이동 중 → 도착. 지금 단계에는 진행 막대가 붙는다
export function Timeline({ steps, stages, stageNow, unknown = false }: Props) {
  return (
    <section className={`m-card fr-tl ${unknown ? 'is-unknown' : ''}`} aria-label="준비 단계">
      {steps.map((s, i) => (
        <div key={s.label} className="fr-step">
          <div className="fr-rail">
            <Node status={s.status} />
            {i < steps.length - 1 && <div className={`fr-line ${s.status === 'done' ? 'is-ink' : ''}`} />}
          </div>
          <div className="fr-body">
            <div className={`fr-row is-${s.status}`}>
              <span>{s.label}</span>
              {s.time && <span className="fr-time">{s.time}</span>}
            </div>
            {s.note && <div className="fr-note">{s.note}</div>}
            {s.status === 'now' && s.progress !== undefined && !unknown && <Segments stages={stages} now={stageNow} progress={s.progress} />}
          </div>
        </div>
      ))}
    </section>
  );
}
