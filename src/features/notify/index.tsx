import { useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { TONES, arriveMessage, etaMessage, lateInfo, lateMessage, projArrive } from '../../domain/message';
import type { ToneMode } from '../../domain/types';
import '../today/fields.css';
import '../today/main.css';
import './notify.css';
import { RESULT_TEXT, sendText, type SendResult } from './send';

const MODES = Object.keys(TONES) as Array<Exclude<ToneMode, 'custom'>>;

interface BlockProps {
  title: string;
  text: string;
  button: string;
  strong?: boolean;
  note?: string;
  onSend: (text: string) => void;
}

function Block({ title, text, button, strong = false, note, onSend }: BlockProps) {
  return (
    <section className="m-card">
      <h3 className="n-title">{title}</h3>
      <p className="n-preview">{text}</p>
      {note && <p className="f-sub" style={{ margin: '0 0 10px' }}>{note}</p>}
      <button type="button" className={`n-btn ${strong ? 'is-strong' : ''}`} onClick={() => onSend(text)}>
        {button}
      </button>
    </section>
  );
}

function ManualBox({ text }: { text: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return <textarea ref={ref} className="n-box" readOnly aria-label="보낼 문구" value={text} onFocus={() => ref.current?.select()} />;
}

// ⑧ 약속 상대에게 알리기. 도착 시각과 늦는 분만 말하고, 준비 단계는 말하지 않는다
export function NotifyCard() {
  const { session, tone, now, actions } = useApp();
  const [sent, setSent] = useState<{ result: SendResult; text: string } | null>(null);
  if (!session) return null;

  const send = async (text: string) => setSent({ result: await sendText(text), text });
  const info = lateInfo(projArrive(session, now), session.arriveAt);
  const lateNote = info.isLate ? `지금 속도로는 약 ${info.lateN}분 늦을 수 있어요.` : undefined;

  return (
    <>
      <section className="m-card">
        <h3 className="n-title">말투</h3>
        <div className="n-chips" role="group" aria-label="말투 고르기">
          {MODES.map((m) => (
            <button key={m} type="button" className="n-chip" aria-pressed={tone.mode === m} onClick={() => actions.setTone({ mode: m })}>
              {TONES[m].name}
            </button>
          ))}
          {tone.custom && (
            <button type="button" className="n-chip" aria-pressed={tone.mode === 'custom'} onClick={() => actions.setTone({ mode: 'custom' })}>
              내 말투
            </button>
          )}
        </div>
        {!tone.custom && <p className="n-hint">평소 문자로 만드는 내 말투는 설정에서 만들 수 있어요.</p>}
      </section>
      {session.state === 'summary' ? (
        <Block title="도착했을 때" text={arriveMessage(tone, session.placeName, session.geo)} button="도착 문구 보내기" onSend={send} />
      ) : (
        // 문구는 하나만 보여 준다. 출발 시각이 지났고 늦을 것 같을 때만 늦는다는 문구로 바꾼다
        now > session.leaveAt && info.isLate ? (
          <Block title="늦을 것 같을 때" text={lateMessage(tone, session, now)} button="늦을 것 같아요" strong note={lateNote} onSend={send} />
        ) : (
          <Block title="도착 시각" text={etaMessage(tone, session, now)} button="도착 시각 보내기" onSend={send} />
        )
      )}
      <p className="f-status" aria-live="polite" style={{ margin: 0 }}>
        {sent ? RESULT_TEXT[sent.result] : ''}
      </p>
      {sent?.result === 'manual' && <ManualBox text={sent.text} />}
      <p className="f-sub" style={{ margin: '0 4px' }}>지금 어느 단계인지는 말하지 않아요. 보낼 사람은 직접 골라요. 앱이 대신 보내지 않아요.</p>
    </>
  );
}
