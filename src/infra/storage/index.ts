import type { Appointment, ArrivalRecord } from '../../domain/types';

// 자리 표시용: 창 C가 localStorage 구현으로 교체한다(함수 모양은 유지)
export function loadAppointments(): Appointment[] {
  return [];
}
export function saveAppointment(_a: Appointment): void {}
export function loadRecords(): ArrivalRecord[] {
  return [];
}
export function saveRecord(_r: ArrivalRecord): void {}
