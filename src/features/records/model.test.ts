import { describe, expect, it } from 'vitest';
import type { RecordRow } from '../../domain/types';
import { arriveText, dayMark, insights, monthCells } from './model';

const row = (o: Partial<RecordRow>): RecordRow => ({
  id: 'r', date: 0, title: '회의', latency: 12, snoozeCount: 2, prepActual: 48, userPrep: 40, steps: [], leaveDiff: 4, demo: false, excluded: false, ...o,
});

describe('insights', () => {
  it('기록이 없으면 아무 말도 하지 않는다', () => {
    expect(insights([])).toEqual([]);
    expect(insights([row({ demo: true })])).toEqual([]);
  });
  it('미룬 횟수, 준비 초과, 출발 지연을 문장으로 만든다', () => {
    const out = insights([row({ arrival: 'late' }), row({ arrival: 'ontime' })]);
    expect(out).toContain('기록한 2번 중 1번 제시간에 도착했어요.');
    expect(out).toContain('알람을 평균 2번 미뤄요.');
    expect(out).toContain('준비가 예상보다 평균 8분 더 걸려요. 준비 시간을 8분 늘려 잡으면 맞아요.');
    expect(out).toContain('출발은 계획보다 평균 4분 늦어요.');
  });
  it('차이가 작으면 거의 같다고 말한다', () => {
    const out = insights([row({ snoozeCount: 0, prepActual: 41, leaveDiff: 0, latency: 3 })]);
    expect(out).toContain('알람을 거의 미루지 않아요.');
    expect(out).toContain('준비 시간은 예상과 거의 같아요.');
    expect(out).toContain('출발은 계획한 시각에 맞추는 편이에요.');
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
