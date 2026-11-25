// 켜짐/꺼짐 스위치. 색만으로 구분하지 않도록 글자로도 상태를 적는다
export function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="f-row" style={{ justifyContent: 'space-between', minHeight: 48 }}>
      <span id={`sw-${label}`}>{label}</span>
      <button type="button" className="f-chip" aria-pressed={on} aria-labelledby={`sw-${label}`} onClick={() => onChange(!on)}>
        {on ? '켜짐' : '꺼짐'}
      </button>
    </div>
  );
}
