import { useEffect, useState } from 'react';

const CONFIRM_MS = 4000;

// 두 번 눌러야 실행되는 버튼. 한 번 누르면 확인 문구로 바뀌고, 잠시 뒤 원래대로 돌아간다
export function ConfirmButton({ label, confirmLabel, onConfirm }: { label: string; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(t);
  }, [armed]);

  const click = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    onConfirm();
  };

  return (
    <button type="button" className="f-btn" style={armed ? { background: 'var(--ink)', color: '#fff' } : undefined} onClick={click} aria-live="polite">
      {armed ? confirmLabel : label}
    </button>
  );
}
