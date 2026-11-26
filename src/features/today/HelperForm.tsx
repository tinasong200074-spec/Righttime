import { useState, type ClipboardEvent } from 'react';
import { useApp } from '../../app/store';
import { KIND_NAMES } from '../../domain/ai';
import type { PlanKind } from '../../domain/types';
import { PhotoIcon } from './PhotoIcon';
import { useHelperRun } from './useHelperRun';

const MAX_IMAGES = 3;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const KINDS = Object.keys(KIND_NAMES) as PlanKind[];

function useImages(onMsg: (m: string) => void) {
  const [images, setImages] = useState<File[]>([]);
  const add = (files: File[]) => {
    const ok = files.filter((f) => IMAGE_TYPES.includes(f.type));
    if (ok.length < files.length) onMsg('jpg, png, webp 사진만 올릴 수 있어요.');
    else if (images.length + ok.length > MAX_IMAGES) onMsg(`사진은 ${MAX_IMAGES}장까지 올릴 수 있어요.`);
    setImages((prev) => [...prev, ...ok].slice(0, MAX_IMAGES));
  };
  return { images, add, clear: () => setImages([]) };
}


function NotesField(p: { notes: string; onNotes: (v: string) => void; onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void }) {
  return (
    <>
      <label className="f-label" htmlFor="h-notes">
        링크나 텍스트 (선택)
      </label>
      <textarea
        id="h-notes"
        className="f-input"
        style={{ padding: 12 }}
        rows={5}
        maxLength={2000}
        placeholder="안내 문자·메일·공고 글이나, 공고 페이지 링크(https://…)를 넣어 주세요"
        value={p.notes}
        onChange={(e) => p.onNotes(e.target.value)}
        onPaste={p.onPaste}
      />
    </>
  );
}

function TextPanel(p: { notes: string; onNotes: (v: string) => void; onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void }) {
  const { plan, actions } = useApp();
  return (
    <section className="m-card">
      <label className="f-label" htmlFor="h-kind" style={{ marginTop: 0 }}>
        일정 종류
      </label>
      <select id="h-kind" className="f-input" value={plan.kind} onChange={(e) => actions.updatePlan({ kind: e.target.value as PlanKind })}>
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_NAMES[k]}
          </option>
        ))}
      </select>
      <NotesField notes={p.notes} onNotes={p.onNotes} onPaste={p.onPaste} />
    </section>
  );
}

function Tiles(p: { count: number; showText: boolean; onAdd: (f: File[]) => void; onToggle: () => void }) {
  return (
    <div className="m-tiles2">
      <label className="m-dash">
        <input className="m-vh" id="h-img" type="file" accept={IMAGE_TYPES.join(',')} multiple onChange={(e) => p.onAdd(Array.from(e.target.files ?? []))} />
        <span className="m-tile">
          <PhotoIcon />
        </span>
        <span>사진·캡처</span>
        <span className="m-sub">{p.count > 0 ? `${p.count}장 선택됨` : `최대 ${MAX_IMAGES}장`}</span>
      </label>
      <button type="button" className="m-dash" aria-expanded={p.showText} onClick={p.onToggle}>
        <span className="m-tile">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <rect x="4" y="7" width="16" height="3" rx="1.5" fill="var(--ink)" />
            <rect x="7" y="13" width="10" height="3" rx="1.5" fill="var(--ink)" />
          </svg>
        </span>
        <span>링크나 텍스트</span>
      </button>
    </div>
  );
}

// 사진·글 타일 두 개, 전송 동의, "읽고 정리하기"(목업 10번)
export function HelperForm() {
  const [notes, setNotes] = useState('');
  const [showText, setShowText] = useState(false);
  const [agree, setAgree] = useState(false);
  const [note, setNote] = useState('');
  const { busy, msg, run } = useHelperRun();
  const { images, add, clear } = useImages(setNote);
  const ready = agree && !busy && (notes.trim().length > 0 || images.length > 0);

  const paste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    e.preventDefault(); // 이미지는 글 칸에 넣지 않고 사진으로 받는다
    add(files);
  };
  const submit = async () => {
    setNote('');
    if (await run(notes, images)) {
      setNotes('');
      clear();
    }
    setAgree(false); // 보낼 때마다 다시 동의를 받는다
  };

  return (
    <>
      <Tiles count={images.length} showText={showText} onAdd={add} onToggle={() => setShowText((v) => !v)} />
      {showText && <TextPanel notes={notes} onNotes={setNotes} onPaste={paste} />}
      {images.length > 0 && (
        <button type="button" className="f-btn" onClick={clear}>
          사진 비우기
        </button>
      )}
      <p className="f-status" aria-live="polite">
        {note} {msg}
      </p>
      <div className="m-spacer" />
      <label className="t-consent">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>글·링크와 사진은 AI로 전송돼요. 링크는 AI가 그 페이지를 열어 읽어요. 개인 정보가 있는 부분은 빼고 올려 주세요.</span>
      </label>
      <button type="button" className="m-ghost" disabled={!ready} onClick={submit}>
        {busy ? '읽는 중이에요…' : '읽고 정리하기'}
      </button>
    </>
  );
}
