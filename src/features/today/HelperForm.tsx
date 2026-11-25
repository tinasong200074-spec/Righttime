import { useState, type ClipboardEvent } from 'react';
import { useApp } from '../../app/store';
import { KIND_NAMES } from '../../domain/ai';
import type { PlanKind } from '../../domain/types';
import { OutlineButton, PrimaryButton } from '../../ui';
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
        안내문 붙여넣기 (선택)
      </label>
      <textarea
        id="h-notes"
        className="f-input"
        style={{ padding: 12 }}
        rows={5}
        maxLength={2000}
        placeholder="면접 안내 문자, 메일, 공고 문구를 붙여넣어 주세요"
        value={p.notes}
        onChange={(e) => p.onNotes(e.target.value)}
        onPaste={p.onPaste}
      />
    </>
  );
}

function ImageField(p: { images: File[]; note: string; onAdd: (f: File[]) => void; onClear: () => void }) {
  return (
    <>
      <label className="f-label" htmlFor="h-img">
        사진·캡처 (선택, 최대 {MAX_IMAGES}장)
      </label>
      <input id="h-img" type="file" accept={IMAGE_TYPES.join(',')} multiple onChange={(e) => p.onAdd(Array.from(e.target.files ?? []))} />
      <p className="f-status" aria-live="polite">
        {p.images.length > 0 ? `사진 ${p.images.length}장 선택됨` : ''} {p.note}
      </p>
      {p.images.length > 0 && <OutlineButton onClick={p.onClear}>사진 비우기</OutlineButton>}
    </>
  );
}

// 일정 종류, 안내문 글, 사진(최대 3장), 전송 동의
export function HelperForm() {
  const { plan, actions } = useApp();
  const [notes, setNotes] = useState('');
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
    <div>
      <label className="f-label" htmlFor="h-kind">
        일정 종류
      </label>
      <select id="h-kind" className="f-input" value={plan.kind} onChange={(e) => actions.updatePlan({ kind: e.target.value as PlanKind })}>
        {KINDS.map((k) => (
          <option key={k} value={k}>
            {KIND_NAMES[k]}
          </option>
        ))}
      </select>
      <NotesField notes={notes} onNotes={setNotes} onPaste={paste} />
      <ImageField images={images} note={note} onAdd={add} onClear={clear} />
      <label className="t-consent">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>글과 사진은 AI로 전송돼요. 개인 정보가 있는 부분은 빼고 올려 주세요.</span>
      </label>
      <PrimaryButton disabled={!ready} onClick={submit}>
        {busy ? '읽는 중이에요…' : '읽고 정리하기'}
      </PrimaryButton>
      <p className="f-status" aria-live="polite">
        {msg}
      </p>
    </div>
  );
}
