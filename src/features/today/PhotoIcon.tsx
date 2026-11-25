// 명세 8.4의 사진 아이콘. src/ui에 아직 없어서 임시로 여기에 둔다(A가 옮기면 지운다)
export function PhotoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3.2" fill="var(--ink)" />
      <circle cx="8.5" cy="9.5" r="1.9" fill="var(--accent)" />
      <path d="M3.2 17.5 9 11.8l4 4 3-3 4.8 4.7V17a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2Z" fill="var(--accent)" />
    </svg>
  );
}
