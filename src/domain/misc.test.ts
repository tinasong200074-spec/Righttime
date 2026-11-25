import { describe, expect, it } from 'vitest';
import { getEscalationLevel } from './escalation';
import { buildShareMessage } from './message';
import { countSevereLate } from './stats';
import type { ArrivalRecord } from './types';

describe('getEscalationLevel (R04)', () => {
  const cases: Array<[number, number]> = [
    [31, 0],
    [30, 1],
    [16, 1],
    [15, 2],
    [6, 2],
    [5, 3],
    [1, 3],
    [0, 4],
    [-3, 4],
  ];
  it.each(cases)('남은 %i분 → %i단계', (minLeft, level) => {
    expect(getEscalationLevel(minLeft)).toBe(level);
  });
});

describe('buildShareMessage (R05)', () => {
  it('출발했어요', () => {
    expect(buildShareMessage('departed')).toContain('출발');
  });
  it('늦을 것 같을 때 분 수를 넣는다', () => {
    expect(buildShareMessage('late', 15)).toContain('15분');
  });
  it('분 수가 없으면 숫자 없이 알린다', () => {
    expect(buildShareMessage('late')).not.toMatch(/\d/);
  });
});

describe('countSevereLate (R07)', () => {
  const now = new Date('2026-11-26T00:00:00Z');
  const rec = (lateMin: number, appointmentAt: string): ArrivalRecord => ({
    appointmentId: appointmentAt,
    title: '',
    appointmentAt,
    lateMin,
    recordedAt: appointmentAt,
  });
  const records = [
    rec(0, '2026-11-25T09:00:00Z'),
    rec(9, '2026-11-24T09:00:00Z'), // 10분 미만
    rec(10, '2026-11-20T09:00:00Z'), // 정확히 10분은 포함
    rec(25, '2026-10-01T09:00:00Z'), // 오래됨
  ];
  it('전체에서 10분 이상만 센다', () => {
    expect(countSevereLate(records, now)).toBe(2);
  });
  it('최근 14일로 좁힌다', () => {
    expect(countSevereLate(records, now, 14)).toBe(1);
  });
});
