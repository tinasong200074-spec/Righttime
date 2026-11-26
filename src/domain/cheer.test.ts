import { describe, expect, it } from 'vitest';
import { CHEER_EMOJI, CHEER_TEXT, cheerLine, cheerOptions } from './cheer';
import { MIN } from './types';

const arriveMs = new Date(2026, 10, 27, 19, 0).getTime();
const at = (minBefore: number, lateMin: number | null = null) => cheerOptions({ arriveMs, now: arriveMs - minBefore * MIN, lateMin });

describe('cheerOptions', () => {
  it('시간에 따라 어울리는 한마디가 달라진다', () => {
    expect(at(120)).toEqual(['prep', 'later']); // 아직 여유가 있을 때
    expect(at(30)).toEqual(['safe', 'soon']); // 약속 30분 전부터
    expect(at(0)).toEqual(['waiting', 'here']); // 약속 시각이 되면
    expect(at(-10)).toEqual(['waiting', 'here']);
  });
  it('늦는다고 알려 왔으면 괜찮다는 말을 먼저 보여 준다', () => {
    expect(at(60, 10)).toEqual(['ok', 'waiting']);
    expect(at(60, 0)).toEqual(['prep', 'later']);
  });
  it('모든 선택지에 글이 있다', () => {
    for (const k of [...at(120), ...at(30), ...at(0), ...at(60, 5)]) expect(CHEER_TEXT[k]).toBeTruthy();
  });
});

describe('이모티콘과 알림 한 줄', () => {
  it('이모티콘은 일곱 개', () => {
    expect(Object.keys(CHEER_EMOJI).length).toBe(7);
  });
  it('보낸 사람 이름을 붙인다', () => {
    expect(cheerLine('민수', '기다리고 있어요')).toBe('민수님: 기다리고 있어요');
    expect(cheerLine(null, '😊')).toBe('친구님: 😊');
  });
});
