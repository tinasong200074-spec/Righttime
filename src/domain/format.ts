const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function fmtClock(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 경과·남은 시간을 m:ss 또는 h:mm:ss로
export function fmtHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function fmtMin(x: number | null | undefined): string {
  if (x === null || x === undefined) return '-';
  return x < 1 ? '1분 미만' : `${Math.round(x)}분`;
}

export function fmtDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

// <input type="datetime-local"> 값과 서로 바꾼다
export function toInputValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${fmtClock(ms)}`;
}

export function fromInputValue(v: string): number | null {
  const ms = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}
