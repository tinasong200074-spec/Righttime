import { useRef, useState } from 'react';
import { useApp } from '../../app/store';
import { TONES, arriveMessage, etaMessage, lateInfo, lateMessage, projArrive } from '../../domain/message';
import type { ToneMode } from '../../domain/types';
import { Card, Icon, OutlineButton, PrimaryButton } from '../../ui';
import '../today/fields.css';
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
  const Button = strong ? PrimaryButton : OutlineButton;
  return (
    <div className="n-block">
      <h3 className="f-label" style={{ margin: 0 }}>
        {title}
      </h3>
      <p className="n-preview">{text}</p>
      {note && <p className="f-sub">{note}</p>}
      <Button onClick={() => onSend(text)}>{button}</Button>
    </div>
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
    <Card>
      <div className="f-row">
        <Icon name="share" main="var(--ink)" det="var(--surface)" size={28} />
        <h2 className="f-title">약속 상대에게 알리기</h2>
      </div>
      <div className="f-chips" role="group" aria-label="말투 고르기">
        {MODES.map((m) => (
          <button key={m} type="button" className="f-chip" aria-pressed={tone.mode === m} onClick={() => actions.setTone({ mode: m })}>
            {TONES[m].name}
          </button>
        ))}
        {tone.custom && (
          <button type="button" className="f-chip" aria-pressed={tone.mode === 'custom'} onClick={() => actions.setTone({ mode: 'custom' })}>
            내 말투
          </button>
        )}
      </div>
      {session.state === 'summary' ? (
        <Block title="도착했을 때" text={arriveMessage(tone, session.placeName, session.geo)} button="도착 문구 보내기" onSend={send} />
      ) : (
        <>
          <Block title="도착 시각" text={etaMessage(tone, session, now)} button="도착 시각 보내기" onSend={send} />
          <Block title="늦을 때" text={lateMessage(tone, session, now)} button="늦을 것 같아요" strong={info.isLate} note={lateNote} onSend={send} />
        </>
      )}
      <p className="f-status" aria-live="polite">
        {sent ? RESULT_TEXT[sent.result] : ''}
      </p>
      {sent?.result === 'manual' && <ManualBox text={sent.text} />}
      <p className="f-sub">지금 어느 단계인지는 말하지 않아요. 보낼 사람은 직접 골라요. 앱이 대신 보내지 않아요.</p>
    </Card>
  );
}
