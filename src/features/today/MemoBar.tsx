import { useState, type FormEvent } from 'react';
import { useApp } from '../../app/store';
import type { MemoItem } from '../../domain/types';
import { AI_ERROR_TEXT, AiError, splitMemoWithAi } from '../../infra/ai';
import { XIcon } from './XIcon';

const SRC_TAG: Partial<Record<NonNullable<MemoItem['src']>, string>> = { notice: '안내문', general: 'AI 제안' };

// AI로 나누고, 실패하거나 비어 있으면 쉼표·줄바꿈으로 나눈다
function useMemoSubmit() {
  const { actions } = useApp();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const submit = async (text: string): Promise<void> => {
    setBusy(true);
    setStatus('정리하는 중…');
    try {
      const items = await splitMemoWithAi(text);
      if (items.length > 0) {
        actions.addMemoItems(items, 'user');
        return setStatus(`AI가 ${items.length}개로 나눴어요`);
      }
      actions.addMemos(text);
      setStatus('쉼표 기준으로 나눴어요');
    } catch (e) {
      actions.addMemos(text);
      const reason = e instanceof AiError ? `${AI_ERROR_TEXT[e.code]} ` : '';
      setStatus(`${reason}쉼표 기준으로 나눴어요`);
    } finally {
      setBusy(false);
    }
  };
  return { busy, status, submit };
}

// 맨 위 메모 입력줄: 쉼표·줄바꿈으로 나눠 칩으로 넣는다. 칩마다 삭제와 매일/오늘만 고정이 있다
export function MemoBar() {
  const { memos } = useApp();
  const [text, setText] = useState('');
  const { busy, status, submit } = useMemoSubmit();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    void submit(text);
    setText('');
  };

  return (
    <section aria-label="챙길 것 메모">
      <form className="f-row" onSubmit={onSubmit} autoComplete="off">
        <input
          className="f-input f-grow"
          aria-label="챙길 것 또는 기억할 것"
          placeholder="챙길 것 (예: 면접 서류)"
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="f-btn" disabled={!text.trim() || busy}>
          추가
        </button>
      </form>
      <p className="f-status" aria-live="polite">
        {status}
      </p>
      <ul className="f-chips" aria-label="적어 둔 챙길 것">
        {memos.map((m) => (
          <MemoChip key={m.id} memo={m} />
        ))}
      </ul>
    </section>
  );
}

function MemoChip({ memo }: { memo: MemoItem }) {
  const { actions } = useApp();
  const next = memo.pin ? '오늘만' : '매일';
  return (
    <li className="t-memo">
      <span>{memo.text}</span>
      {memo.src && SRC_TAG[memo.src] && <span className="t-src">{SRC_TAG[memo.src]}</span>}
      <button
        type="button"
        className="t-memo-pin"
        aria-pressed={memo.pin}
        aria-label={`${memo.text}: 지금 ${memo.pin ? '매일' : '오늘만'} 챙겨요. 누르면 ${next}로 바꿔요`}
        onClick={() => actions.toggleMemoPin(memo.id)}
      >
        {memo.pin ? '매일' : '오늘만'}
      </button>
      <button type="button" className="f-icon-btn" aria-label={`${memo.text} 삭제`} onClick={() => actions.removeMemo(memo.id)}>
        <XIcon />
      </button>
    </li>
  );
}
