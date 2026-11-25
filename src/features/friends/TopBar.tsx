import type { ReactNode } from 'react';

// 목업 상단: 44px 뒤로 가기 + 20px 제목, 오른쪽에 알약. 화면마다 "예시" 표시를 붙인다
export function TopBar({ title, onBack, tag }: { title: string; onBack: () => void; tag?: ReactNode }) {
  return (
    <div className="fr-top">
      <button type="button" className="fr-back" aria-label="뒤로" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>
      <h1>{title}</h1>
      <span className="fr-tags">
        {tag}
        <span className="fr-tag">예시</span>
      </span>
    </div>
  );
}
