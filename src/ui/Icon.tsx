import type { ReactNode } from 'react';

// 명세 8.4의 아이콘 세트. main=본체 색, det=포인트 디테일 색
const STROKE = { strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;

type Draw = (main: string, det: string) => ReactNode;

const ICONS: Record<string, Draw> = {
  wake: (m, d) => (
    <>
      <path d="M4 17a8 8 0 0 1 16 0Z" fill={m} />
      <rect x="2.5" y="19" width="19" height="2.2" rx="1.1" fill={m} />
      <path d="M12 3v3M4.8 6.4l2 2M19.2 6.4l-2 2" stroke={d} {...STROKE} />
    </>
  ),
  prep: (m, d) => (
    <>
      <path d="M8.5 4 3.5 7.2l2.3 3.4 1.7-1V20h9V9.6l1.7 1 2.3-3.4L15.5 4a3.5 3.5 0 0 1-7 0Z" fill={m} />
      <rect x="9.4" y="12.6" width="3.4" height="3.4" rx=".9" fill={d} />
    </>
  ),
  leave: (m, d) => (
    <>
      <path d="M4.5 3.5h8A1.5 1.5 0 0 1 14 5v15.5H4.5Z" fill={m} />
      <path d="M15.4 8.2 21 12l-5.6 3.8Z" fill={d} />
    </>
  ),
  rain: (m, d) => (
    <>
      <circle cx="8" cy="12" r="3.6" fill={m} />
      <circle cx="13" cy="9.5" r="4.6" fill={m} />
      <circle cx="17.3" cy="12.5" r="3.2" fill={m} />
      <rect x="8" y="12" width="9.4" height="3.8" fill={m} />
      <path d="M8.5 19l-1 2.2M12.5 19l-1 2.2M16.5 19l-1 2.2" stroke={d} {...STROKE} />
    </>
  ),
  umbrella: (m, d) => (
    <>
      <path d="M3 13a9 9 0 0 1 18 0Z" fill={m} />
      <path d="M12 13v5.5a2 2 0 0 0 4 0" stroke={m} {...STROKE} />
      <rect x="11.2" y="2" width="1.6" height="2.4" rx=".8" fill={d} />
    </>
  ),
  temp: (m, d) => (
    <>
      <rect x="9.8" y="3" width="4.4" height="12" rx="2.2" fill={m} />
      <circle cx="12" cy="17.2" r="4" fill={m} />
      <rect x="11.1" y="8" width="1.8" height="9" rx=".9" fill={d} />
    </>
  ),
  bag: (m, d) => (
    <>
      <path d="M5 9h14l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20.5Z" fill={m} />
      <path d="M9 9V7.5a3 3 0 0 1 6 0V9" stroke={m} {...STROKE} />
      <path d="M9.5 15.2l2 2 3.5-4" stroke={d} {...STROKE} />
    </>
  ),
  bell: (m, d) => (
    <>
      <circle cx="12" cy="12" r="3.2" fill={m} />
      <path d="M6.5 6.5a7.8 7.8 0 0 0 0 11M17.5 6.5a7.8 7.8 0 0 1 0 11" stroke={d} {...STROKE} />
    </>
  ),
  clock: (m, d) => (
    <>
      <circle cx="12" cy="12" r="9" fill={m} />
      <path d="M12 7v5l3.5 2" stroke={d} {...STROKE} />
    </>
  ),
  share: (m, d) => (
    <>
      <rect x="3" y="7" width="14" height="14" rx="3.2" fill={m} />
      <path d="M12.5 11.5 20 4M14.5 4H20v5.5" stroke={d} {...STROKE} strokeWidth={2.4} />
    </>
  ),
  friend: (m, d) => (
    <>
      <circle cx="9" cy="8.5" r="3.8" fill={m} />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0Z" fill={m} />
      <circle cx="17.4" cy="9.8" r="2.8" fill={d} />
    </>
  ),
  place: (m, d) => (
    <>
      <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z" fill={m} />
      <circle cx="12" cy="10" r="2.6" fill={d} />
    </>
  ),
  record: (m, d) => (
    <>
      <rect x="4" y="12" width="4" height="8" rx="1.2" fill={m} />
      <rect x="10" y="8" width="4" height="12" rx="1.2" fill={m} />
      <rect x="16" y="4" width="4" height="16" rx="1.2" fill={d} />
    </>
  ),
  // 설정은 명세 세트에 없어서 같은 방식(속이 찬 본체 + 디테일)으로 그렸다
  settings: (m, d) => (
    <>
      <rect x="3" y="5" width="18" height="4" rx="2" fill={m} />
      <rect x="3" y="15" width="18" height="4" rx="2" fill={m} />
      <circle cx="9" cy="7" r="3.2" fill={d} />
      <circle cx="15" cy="17" r="3.2" fill={d} />
    </>
  ),
  check: (m) => <path d="M5 12.5l4.5 4.5L19 7.5" stroke={m} {...STROKE} strokeWidth={3.2} />,
};

export type IconName =
  | 'wake' | 'prep' | 'leave' | 'rain' | 'umbrella' | 'temp' | 'bag' | 'bell'
  | 'clock' | 'share' | 'friend' | 'place' | 'record' | 'settings' | 'check';

interface IconProps {
  name: IconName;
  main?: string;
  det?: string;
  size?: number;
  label?: string; // 없으면 장식으로 보고 스크린리더에서 숨긴다
}

export function Icon({ name, main = 'var(--ink)', det = 'var(--accent)', size = 24, label }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {ICONS[name](main, det)}
    </svg>
  );
}
