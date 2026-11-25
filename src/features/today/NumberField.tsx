import { useId, useState } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (n: number) => void;
}

// 지우고 다시 쓸 수 있는 숫자 입력칸. 범위 밖 값은 저장하지 않고, 칸을 떠나면 저장된 값으로 되돌린다
export function NumberField({ label, value, min, max, unit = '분', onChange }: Props) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);

  const edit = (v: string) => {
    setText(v);
    const n = Number(v);
    if (v !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(Math.round(n));
  };

  return (
    <div>
      <label className="f-label" htmlFor={id}>
        {label}
      </label>
      <div className="f-num">
        <input
          id={id}
          className="f-input"
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text ?? String(value)}
          onChange={(e) => edit(e.target.value)}
          onBlur={() => setText(null)}
        />
        <span className="f-unit">{unit}</span>
      </div>
    </div>
  );
}
