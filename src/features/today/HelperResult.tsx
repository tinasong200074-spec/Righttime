import { useApp } from '../../app/store';
import type { AskItem, HelperResult as Result } from '../../domain/ai';
import { fmtClock, fmtDay } from '../../domain/format';
import { Icon, OutlineButton, Pill } from '../../ui';

function CheckRow({ text, done, onToggle }: { text: string; done: boolean; onToggle: () => void }) {
  return (
    <li>
      <button type="button" className="t-check" aria-pressed={done} onClick={onToggle}>
        <span className="t-box">{done && <Icon name="check" main="var(--ink)" size={16} />}</span>
        <span style={done ? { textDecoration: 'line-through' } : undefined}>{text}</span>
      </button>
    </li>
  );
}

function Tasks({ title, prefix, items, note }: { title: string; prefix: string; items: Result['prep']; note?: string }) {
  const { helperDone, actions } = useApp();
  return (
    <div>
      <h3 className="f-label">{title}</h3>
      {note && <p className="f-sub">{note}</p>}
      {items.length === 0 ? (
        <p className="f-sub">없어요.</p>
      ) : (
        <ul className="f-list">
          {items.map((t, i) => (
            <CheckRow key={`${prefix}-${i}`} text={t.task} done={!!helperDone[`${prefix}-${i}`]} onToggle={() => actions.toggleHelperDone(`${prefix}-${i}`)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function General({ items }: { items: AskItem[] }) {
  const { memos, actions } = useApp();
  return (
    <div>
      <h3 className="f-label">
        AI 제안 <Pill tone="chip">확인 필요</Pill>
      </h3>
      <ul className="f-list">
        {items.map((g) => {
          const added = memos.some((m) => m.text === g.item);
          return (
            <li key={g.item} className="f-row" style={{ justifyContent: 'space-between' }}>
              <span>{g.item}</span>
              <button type="button" className="f-btn" disabled={added} aria-label={`${g.item} ${added ? '추가됨' : '추가'}`} onClick={() => actions.addMemoItems([g], 'general')}>
                {added ? '추가됨' : '+ 추가'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EventRow({ event }: { event: NonNullable<Result['event']> }) {
  const { actions } = useApp();
  const when = `${fmtDay(event.ms)} ${fmtClock(event.ms)}`;
  const apply = () => actions.updatePlan({ arriveAt: event.ms, ...(event.title ? { title: event.title } : {}) });
  return (
    <div>
      <h3 className="f-label">읽은 일정</h3>
      <p>{[event.title, when, event.place].filter(Boolean).join(' · ')}</p>
      <OutlineButton onClick={apply}>이 시각을 도착 시각으로 설정</OutlineButton>
      <p className="f-sub">날짜와 시각이 맞는지 꼭 확인해 주세요.</p>
    </div>
  );
}

// 도우미가 읽은 결과. 안내문에 적힌 것은 이미 챙길 것에 들어가 있다
export function HelperResult() {
  const { helper, settings, actions } = useApp();
  if (!helper) return null;
  return (
    <div className="f-stack" style={{ marginTop: 12 }}>
      {helper.notice.length > 0 && (
        <div>
          <h3 className="f-label">안내문에 적힌 것</h3>
          <p className="f-sub">챙길 것에 넣었어요: {helper.notice.map((n) => n.item).join(', ')}</p>
        </div>
      )}
      {helper.caution && <p className="t-caution">{helper.caution}</p>}
      {helper.general.length > 0 && <General items={helper.general} />}
      <Tasks title="준비해야 할 것" prefix="prep" items={helper.prep} />
      <Tasks title="전날 할 일" prefix="eve" items={helper.eve} note={`전날 ${settings.eveHour}시쯤 확인해 보세요.`} />
      {helper.event && <EventRow event={helper.event} />}
      <p className="f-sub">AI가 만든 제안이라 틀릴 수 있어요. 공식 안내를 먼저 확인하세요.</p>
      <OutlineButton onClick={() => actions.setHelper(null)}>결과 지우기</OutlineButton>
    </div>
  );
}
