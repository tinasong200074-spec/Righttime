import type { ReactNode } from 'react';
import { useApp } from '../../app/store';
import type { AskItem, HelperResult as Result } from '../../domain/ai';
import { fmtClock, fmtDay } from '../../domain/format';
import { Icon, type IconName } from '../../ui';

function Section({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <section className="m-card">
      <h2 className="m-sec-title">
        <Icon name={icon} main="var(--ink)" det="var(--accent)" size={22} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function CheckRow({ text, done, onToggle }: { text: string; done: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="m-check" aria-pressed={done} onClick={onToggle}>
      <span className="t-box">{done && <Icon name="check" main="var(--ink)" size={16} />}</span>
      <span style={done ? { textDecoration: 'line-through' } : undefined}>{text}</span>
    </button>
  );
}

function Tasks({ prefix, items }: { prefix: string; items: Result['prep'] }) {
  const { helperDone, actions } = useApp();
  if (items.length === 0) return <p className="f-sub">없어요.</p>;
  return (
    <>
      {items.map((t, i) => (
        <CheckRow key={`${prefix}-${i}`} text={t.task} done={!!helperDone[`${prefix}-${i}`]} onToggle={() => actions.toggleHelperDone(`${prefix}-${i}`)} />
      ))}
    </>
  );
}

function CarryItems({ notice, general }: { notice: AskItem[]; general: AskItem[] }) {
  const { memos, actions } = useApp();
  return (
    <>
      {notice.map((n) => (
        <div key={n.item} className="m-check" style={{ cursor: 'default' }}>
          <span className="m-grow">{n.item}</span>
          <span className="m-pill">안내문에 적힌 것</span>
        </div>
      ))}
      {general.map((g) => {
        const added = memos.some((m) => m.text === g.item);
        return (
          <div key={g.item} className="m-check" style={{ cursor: 'default' }}>
            <span className="m-grow">
              {g.item} <span className="m-sub">AI 제안 · 확인 필요</span>
            </span>
            <button type="button" className="f-btn" disabled={added} aria-label={`${g.item} ${added ? '추가됨' : '추가'}`} onClick={() => actions.addMemoItems([g], 'general')}>
              {added ? '추가됨' : '+ 추가'}
            </button>
          </div>
        );
      })}
    </>
  );
}

function EventRow({ event, onPlan }: { event: NonNullable<Result['event']>; onPlan: () => void }) {
  const { actions } = useApp();
  const when = `${fmtDay(event.ms)} ${fmtClock(event.ms)}`;
  // 새 약속 화면으로 넘어가야 넣은 시각이 눈에 보인다
  const apply = () => {
    actions.planFromEvent(event);
    onPlan();
  };
  return (
    <Section icon="clock" title="읽은 일정">
      <p style={{ margin: '0 0 8px' }}>{[event.title, when, event.place].filter(Boolean).join(' · ')}</p>
      <button type="button" className="m-ghost" onClick={apply}>
        이 시각을 도착 시각으로 설정
      </button>
      <p className="f-sub">날짜와 시각이 맞는지 꼭 확인해 주세요.</p>
    </Section>
  );
}

// 도우미가 읽은 결과를 목업 10번처럼 "챙길 것 / 준비해야 할 것" 카드로 보여 준다
export function HelperResult({ onPlan }: { onPlan: () => void }) {
  const { helper, settings, actions } = useApp();
  if (!helper) return null;
  const hasCarry = helper.notice.length + helper.general.length > 0;
  return (
    <>
      {helper.caution && <p className="t-caution">{helper.caution}</p>}
      {hasCarry && (
        <Section icon="bag" title="챙길 것">
          <CarryItems notice={helper.notice} general={helper.general} />
        </Section>
      )}
      <Section icon="bell" title="준비해야 할 것">
        <Tasks prefix="prep" items={helper.prep} />
      </Section>
      <Section icon="clock" title={`전날 할 일 · 전날 ${settings.eveHour}시쯤`}>
        <Tasks prefix="eve" items={helper.eve} />
      </Section>
      {helper.event && <EventRow event={helper.event} onPlan={onPlan} />}
      <p className="f-sub">AI가 만든 제안이라 틀릴 수 있어요. 공식 안내를 먼저 확인하세요.</p>
      <button type="button" className="m-ghost" onClick={() => actions.setHelper(null)}>
        결과 지우기
      </button>
    </>
  );
}
