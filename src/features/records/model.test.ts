import { describe, expect, it } from 'vitest';
import type { RecordRow } from '../../domain/types';
import { arriveText, dayMark, insights, monthCells } from './model';

const row = (o: Partial<RecordRow>): RecordRow => ({
  id: 'r', date: 0, title: '회의', latency: 12, snoozeCount: 2, prepActual: 48, userPrep: 40, steps: [], leaveDiff: 4, demo: false, excluded: false, ...o,
});

describe('insights', () => {
  const tile = (v: ReturnType<typeof insights>, key: string) => v?.tiles.find((t) => t.key === key);
  it('기록이 없으면 아무것도 보여 주지 않는다', () => {
    expect(insights([])).toBeNull();
    expect(insights([row({ demo: true })])).toBeNull();
  });
  it('미룬 횟수, 준비 초과, 출발 지연을 숫자 타일로 만든다', () => {
    const v = insights([row({ arrival: 'late' }), row({ arrival: 'ontime' })]);
    expect(tile(v, 'arrive')).toMatchObject({ value: '1/2', tone: 'flat' });
    expect(tile(v, 'snooze')).toMatchObject({ value: '2번', tone: 'warn' });
    expect(tile(v, 'wake')).toMatchObject({ value: '12분', tone: 'warn' });
    expect(tile(v, 'prep')).toMatchObject({ value: '+8분', label: '준비가 예상보다 김', tone: 'warn' });
    expect(tile(v, 'leave')).toMatchObject({ value: '+4분', tone: 'warn' });
    expect(v?.trail).toEqual(['late', 'kept']);
    expect(v?.tip).toBe('준비 시간을 8분 늘려 잡으면 맞아요');
  });
  it('차이가 작으면 좋은 쪽으로 표시하고 조언은 없다', () => {
    const v = insights([row({ snoozeCount: 0, prepActual: 41, leaveDiff: 0, latency: 3, arrival: 'early' })]);
    expect(tile(v, 'arrive')).toMatchObject({ value: '1/1', tone: 'good' });
    expect(tile(v, 'snooze')?.tone).toBe('good');
    expect(tile(v, 'prep')).toMatchObject({ label: '준비는 예상대로', tone: 'good' });
    expect(tile(v, 'leave')?.tone).toBe('good');
    expect(v?.tip).toBeNull();
  });
});

describe('달력', () => {
  it('2026년 11월은 일요일에 시작해 30일까지', () => {
    const cells = monthCells(2026, 10);
    expect(cells[0]).toBe(1);
    expect(cells.length).toBe(30);
  });
  it('2026년 12월은 화요일에 시작해 앞에 빈칸 둘', () => {
    expect(monthCells(2026, 11).slice(0, 3)).toEqual([null, null, 1]);
  });
  it('하루 표시와 도착 문구', () => {
    expect(dayMark([row({ arrival: 'ontime' }), row({ arrival: 'late' })])).toBe('late');
    expect(dayMark([row({ arrival: 'early' })])).toBe('kept');
    expect(dayMark([row({})])).toBe('none');
    expect(arriveText(row({ arriveDiff: 7 }))).toBe('7분 늦음');
    expect(arriveText(row({ arriveDiff: -5 }))).toBe('5분 일찍');
    expect(arriveText(row({ arriveDiff: 0 }))).toBe('제시간');
    expect(arriveText(row({}))).toBe('도착 기록 없음');
  });
});
