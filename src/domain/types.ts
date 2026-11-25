export interface Appointment {
  id: string;
  title: string; // 비어 있을 수 있음
  appointmentAt: string; // ISO 문자열
  travelMin: number; // 이동 시간(분)
  prepMin: number; // 준비 시간(분)
  bufferMin: number; // 여유(분)
}

export interface ArrivalRecord {
  appointmentId: string;
  title: string;
  appointmentAt: string;
  lateMin: number; // 제시간이나 일찍 도착하면 0
  recordedAt: string;
}

export type Phase = 'relaxed' | 'prepare' | 'soon' | 'leaveNow' | 'late';

export type EscalationLevel = 0 | 1 | 2 | 3 | 4;

export const DEFAULT_PREP_MIN = 30;
export const DEFAULT_BUFFER_MIN = 10;
export const SEVERE_LATE_MIN = 10; // 기다리는 쪽이 불편해하는 선(문제 정의서 기준)
