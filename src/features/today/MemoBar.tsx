import { useState, type FormEvent } from 'react';
import { useApp } from '../../app/store';
import type { MemoItem } from '../../domain/types';
import { XIcon } from './XIcon';

// 맨 위 메모 입력줄: 쉼표·줄바꿈으로 나눠 칩으로 넣는다. 칩마다 삭제와 매일/오늘만 고정이 있다
export function MemoBar() {
  const { memos, actions } = useApp();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const before = memos.length;
    actions.addMemos(text);
    setStatus(before === memos.length ? '추가할 새 항목이 없거나 이미 있는 항목이에요.' : '챙길 것에 넣었어요.');
    setText('');
  };

  return (
    <section aria-label="챙길 것 메모">
      <form className="f-row" onSubmit={submit} autoComplete="off">
        <input
          className="f-input f-grow"
          aria-label="챙길 것 또는 기억할 것"
          placeholder="챙길 것·기억할 것 (예: 면접 서류, 충전기)"
          maxLength={200}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="f-btn" disabled={!text.trim()}>
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
