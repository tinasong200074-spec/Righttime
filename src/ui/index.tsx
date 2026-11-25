import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './ui.css';

export { Icon, type IconName };

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`ui-card ${className}`}>{children}</section>;
}

// 어두운(잉크) 히어로 카드. 안의 큰 숫자는 .ui-hero-num을 쓴다
export function HeroCard({ children, dashed = false }: { children: ReactNode; dashed?: boolean }) {
  return <section className={`ui-hero ${dashed ? 'is-dashed' : ''}`}>{children}</section>;
}

type PillTone = 'chip' | 'soft' | 'accent' | 'dark';
export function Pill({ children, tone = 'chip' }: { children: ReactNode; tone?: PillTone }) {
  return <span className={`ui-pill is-${tone}`}>{children}</span>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement>;
export function PrimaryButton({ className = '', type = 'button', ...rest }: BtnProps) {
  return <button type={type} className={`ui-btn is-primary ${className}`} {...rest} />;
}
export function OutlineButton({ className = '', type = 'button', ...rest }: BtnProps) {
  return <button type={type} className={`ui-btn is-outline ${className}`} {...rest} />;
}

export type Stage = 'wake' | 'prep' | 'leave';
const STAGES: Array<{ id: Stage; name: string }> = [
  { id: 'wake', name: '기상' },
  { id: 'prep', name: '준비' },
  { id: 'leave', name: '출발' },
];

// 맨 위 단계 표시줄. 완료=검정 원+체크, 지금=라임 원+퍼지는 링, 다음=빈 원
export function StageBar({ current, notes = {} }: { current: Stage; notes?: Partial<Record<Stage, string>> }) {
  const curIdx = STAGES.findIndex((s) => s.id === current);
  return (
    <ol className="ui-stagebar" aria-label="진행 단계">
      {STAGES.map((s, i) => {
        const status = i < curIdx ? 'done' : i === curIdx ? 'now' : 'next';
        const statusText = status === 'done' ? '완료' : status === 'now' ? '지금' : '다음';
        return (
          <li key={s.id} className={`is-${status}`} aria-current={status === 'now' ? 'step' : undefined}>
            <span className="ui-stage-dot">
              {status === 'done' ? (
                <Icon name="check" main="#fff" size={18} />
              ) : (
                <Icon name={s.id} main={status === 'now' ? 'var(--ink)' : 'var(--muted)'} det={status === 'now' ? 'var(--ink)' : 'var(--muted)'} size={20} />
              )}
            </span>
            <span className="ui-stage-name">{s.name}</span>
            <span className="ui-stage-note">{notes[s.id] ?? statusText}</span>
          </li>
        );
      })}
    </ol>
  );
}

export interface FillSegment {
  ratio: number; // 전체에서 차지하는 비율(0~1)
  tone: 'accent' | 'gray' | 'ink' | 'light';
}

// 채워지는 막대(줄무늬 금지). progress(0~1) 위치에 깜빡이는 점을 둔다
export function FillBar({ segments, progress, label }: { segments: FillSegment[]; progress?: number; label: string }) {
  const p = progress === undefined ? undefined : Math.min(1, Math.max(0, progress));
  return (
    <div className="ui-fillbar" role="img" aria-label={label}>
      <div className="ui-fillbar-track">
        {segments.map((s, i) => (
          <span key={i} className={`is-${s.tone}`} style={{ width: `${Math.max(0, s.ratio) * 100}%` }} />
        ))}
      </div>
      {p !== undefined && <span className="ui-fillbar-head" style={{ left: `${p * 100}%` }} />}
    </div>
  );
}
