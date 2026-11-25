import { useState } from 'react';
import { useApp } from '../../app/store';
import type { ToneTemplates } from '../../domain/types';
import { AI_ERROR_TEXT, AiError, buildToneWithAi } from '../../infra/ai';

const MIN_SAMPLE_LENGTH = 8;
const FIELDS: Array<{ key: keyof ToneTemplates; label: string }> = [
  { key: 'eta', label: '도착 시각만 알릴 때' },
  { key: 'late', label: '늦을 때' },
  { key: 'maybe', label: '늦을지도 모를 때' },
  { key: 'arrive', label: '도착했을 때' },
];

function useBuildTone(samples: string) {
  const { actions } = useApp();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const build = async () => {
    if (samples.trim().length < MIN_SAMPLE_LENGTH) return setMsg('예시 문자를 3줄 이상 적어 주세요.');
    setBusy(true);
    setMsg('만드는 중이에요…');
    try {
      const custom = await buildToneWithAi(samples.trim());
      actions.setTone({ mode: 'custom', samples: samples.trim(), custom });
      setMsg('만들었어요. 아래 문구는 직접 고칠 수 있어요.');
    } catch (e) {
      setMsg(AI_ERROR_TEXT[e instanceof AiError ? e.code : 'failed']);
    } finally {
      setBusy(false);
    }
  };
  return { busy, msg, build };
}

// 내 말투: 평소 보내는 문자 예시로 문구 4개를 만들고, 만든 문구는 직접 고친다
export function CustomTone() {
  const { tone, actions } = useApp();
  const [samples, setSamples] = useState(tone.samples ?? '');
  const { busy, msg, build } = useBuildTone(samples);

  return (
    <div>
      <label className="f-label" htmlFor="tone-samples">
        내가 평소 보내는 문자 (3~5줄)
      </label>
      <textarea
        id="tone-samples"
        className="f-input"
        style={{ padding: 12 }}
        rows={4}
        maxLength={800}
        placeholder="예: 어 지금 나가 / 10분만 기다려줘 ㅠㅠ / 거의 다 왔어"
        value={samples}
        onChange={(e) => setSamples(e.target.value)}
      />
      <p className="f-sub">글은 말투를 만들 때 AI로 전송돼요. 개인 정보는 빼고 적어 주세요.</p>
      <button type="button" className="f-btn" style={{ marginTop: 8 }} disabled={busy} onClick={build}>
        {busy ? '만드는 중이에요…' : '내 말투로 만들기'}
      </button>
      <p className="f-status" aria-live="polite">
        {msg}
      </p>
      {tone.custom &&
        FIELDS.map((f) => (
          <div key={f.key}>
            <label className="f-label" htmlFor={`tc-${f.key}`}>
              {f.label}
            </label>
            <input
              id={`tc-${f.key}`}
              className="f-input"
              maxLength={120}
              value={tone.custom?.[f.key] ?? ''}
              onChange={(e) => tone.custom && actions.setTone({ custom: { ...tone.custom, [f.key]: e.target.value } })}
            />
          </div>
        ))}
    </div>
  );
}
