export type StepStatus = 'done' | 'now' | 'next';

export interface TimelineStep {
  label: string;
  time: string; // 알 수 없으면 빈 글자
  status: StepStatus;
  note?: string;
  progress?: number; // 지금 단계의 진행(0~1)
}
