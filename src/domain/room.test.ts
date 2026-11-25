import { describe, expect, it } from 'vitest';
import { cleanCode, codeFromHash, memberLine, resultOf, type RoomMember } from './room';

describe('resultOf', () => {
  it('늦지 않았으면 지킨 것, 도착 기록이 없으면 집계하지 않는다', () => {
    expect(resultOf('ontime')).toBe('kept');
    expect(resultOf('early')).toBe('kept');
    expect(resultOf('late')).toBe('late');
    expect(resultOf(undefined)).toBeNull();
  });
});

describe('cleanCode, codeFromHash', () => {
  it('소문자·공백·하이픈을 정리한다', () => {
    expect(cleanCode('ab2-cd3')).toBe('AB2CD3');
    expect(cleanCode(' k7m9pq ')).toBe('K7M9PQ');
  });
  it('헷갈리는 글자(0, 1, O, I)나 길이가 다르면 거부', () => {
    expect(cleanCode('AB0CD1')).toBeNull();
    expect(cleanCode('ABCDE')).toBeNull();
    expect(cleanCode('')).toBeNull();
  });
  it('주소에서 코드를 읽는다', () => {
    expect(codeFromHash('#r=K7M9PQ')).toBe('K7M9PQ');
    expect(codeFromHash('#s=abcdef')).toBeNull();
    expect(codeFromHash('')).toBeNull();
  });
});

describe('memberLine', () => {
  const base: RoomMember = {
    userId: 'u', name: '민수', isMe: false, sharing: true, stage: null, stepIdx: null, stepCount: null,
    etaMs: null, lateMin: null, message: null, cheer: null, cheerFrom: null, result: null, updatedAtMs: 0,
  };
  const label = (s: string) => ({ woke: '일어남', prep: '준비 중', depart: '곧 출발', travel: '이동 중', arrived: '도착' })[s] ?? s;
  it('상태에 맞는 한 줄', () => {
    expect(memberLine(base, label)).toBe('아직 알람을 켜지 않았어요');
    expect(memberLine({ ...base, etaMs: 1 }, label)).toBe('준비 전 · 알람 켜 둠');
    expect(memberLine({ ...base, stage: 'prep', stepIdx: 2, stepCount: 4 }, label)).toBe('준비 중 · 3/4');
    expect(memberLine({ ...base, stage: 'travel' }, label)).toBe('이동 중');
    expect(memberLine({ ...base, stage: 'arrived', result: 'late' }, label)).toBe('도착 · 늦었어요');
    expect(memberLine({ ...base, sharing: false, stage: 'prep' }, label)).toBe('공유를 껐어요');
  });
});
