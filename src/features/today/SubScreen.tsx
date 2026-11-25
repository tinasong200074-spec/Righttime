import type { ReactNode } from 'react';

interface Props {
  title: string;
  badge?: string;
  onBack: () => void;
  children: ReactNode;
}

// 목업의 보조 화면 틀: 맨 위에 뒤로 가기와 28px 제목, 아래에 카드들
export function SubScreen({ title, badge, onBack, children }: Props) {
  return (
    <div className="m-screen">
      <button type="button" className="m-back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        뒤로
      </button>
      <div className="m-titlerow">
        <h1 className="m-h1">{title}</h1>
        {badge && <span className="m-badge">{badge}</span>}
      </div>
      {children}
    </div>
  );
}
