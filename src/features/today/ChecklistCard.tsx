import { useState, type FormEvent } from 'react';
import { useApp } from '../../app/store';
import '../queue/plans.css';
import { useMemoSubmit } from './MemoBar';

// 펼쳤을 때: 챙길 것 목록(지울 수 있다), 직접 추가, 글·사진으로 한꺼번에 정리
function Body({ onHelper }: { onHelper: () => void }) {
  const { checklist, actions } = useApp();
  const [text, setText] = useState('');
  const { busy, status, submit } = useMemoSubmit();
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    void submit(text);
    setText('');
  };
  return (
    <div className="ck-body">
      {checklist.length === 0 && <p className="f-status">아직 없어요. 아래에 적거나 안내문을 넣어 주세요.</p>}
      <ul className="ck-list">
        {checklist.map((c) => (
          <li key={c.key}>
            <span>{c.text}</span>
            {c.src === 'weather' && <span className="ck-src">날씨</span>}
            <button type="button" className="ck-x" aria-label={`${c.text} 지우기`} onClick={() => actions.removeCheck(c.key)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form className="f-row" onSubmit={add} autoComplete="off">
        <input className="f-input f-grow" aria-label="챙길 것 추가" placeholder="챙길 것 (예: 면접 서류)" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="f-btn" disabled={!text.trim() || busy}>
          추가
        </button>
      </form>
      <p className="f-status" aria-live="polite">
        {status || '지우지 않은 것은 준비를 마치고 출발 단계로 넘어갈 때 소리와 함께 한 번 더 물어봐요.'}
      </p>
      <button type="button" className="f-btn ck-more" onClick={onHelper}>
        안내문 글·사진 넣어서 정리하기
      </button>
    </div>
  );
}

// 오늘 화면의 "챙길 체크리스트". 눌러야 목록이 펼쳐진다
export function ChecklistCard({ onHelper }: { onHelper: () => void }) {
  const { checklist } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <section className="m-card ck">
      <button type="button" className="ck-head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="ck-title">챙길 체크리스트</span>
        <span className="ck-tag">미리 챙겨요</span>
        <span className="ck-count">{checklist.length}개</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && <Body onHelper={onHelper} />}
    </section>
  );
}
