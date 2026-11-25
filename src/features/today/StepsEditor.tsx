import { useState } from 'react';
import { useApp } from '../../app/store';
import type { Step } from '../../domain/types';
import { Card } from '../../ui';
import { newId, splitTotal } from './model';
import { NumberField } from './NumberField';
import { XIcon } from './XIcon';

function StepRow({ step, onChange, onRemove }: { step: Step; onChange: (s: Step) => void; onRemove: () => void }) {
  return (
    <li className="t-step">
      <input
        className="f-input f-grow"
        aria-label="단계 이름"
        maxLength={20}
        value={step.name}
        onChange={(e) => onChange({ ...step, name: e.target.value })}
      />
      <div className="t-step-min">
        <NumberField label={`${step.name || '단계'} 예상 시간`} value={step.est} min={0} max={240} onChange={(n) => onChange({ ...step, est: n })} />
      </div>
      <button type="button" className="f-icon-btn" aria-label={`${step.name || '단계'} 삭제`} onClick={onRemove}>
        <XIcon />
      </button>
    </li>
  );
}

// 준비 단계 편집: 이름·분을 고치고, 단계를 더하고 빼고, 총 시간으로 나눈다
export function StepsEditor() {
  const { plan, actions } = useApp();
  const [total, setTotal] = useState(60);
  const sum = plan.steps.reduce((a, s) => a + s.est, 0);
  const set = (steps: Step[]) => actions.updatePlan({ steps });

  return (
    <Card>
      <details>
        <summary className="t-summary">준비 단계 편집 · 지금 {plan.steps.length}단계, {sum}분</summary>
        <ul className="f-list">
          {plan.steps.map((s) => (
            <StepRow
              key={s.id}
              step={s}
              onChange={(next) => set(plan.steps.map((x) => (x.id === s.id ? next : x)))}
              onRemove={() => set(plan.steps.filter((x) => x.id !== s.id))}
            />
          ))}
        </ul>
        <button type="button" className="f-btn" onClick={() => set([...plan.steps, { id: newId(), name: '새 단계', est: 5 }])}>
          단계 추가
        </button>
        <div className="t-split">
          <NumberField label="총 준비 시간으로 나누기" value={total} min={5} max={480} onChange={setTotal} />
          <button type="button" className="f-btn" onClick={() => set(splitTotal(plan.steps, total))}>
            단계에 나눠 넣기
          </button>
        </div>
      </details>
    </Card>
  );
}
