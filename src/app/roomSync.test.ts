import { describe, expect, it } from 'vitest';
import { shouldLeaveRoom } from './roomSync';

describe('shouldLeaveRoom', () => {
  const room = { roomId: 'r', code: 'ABCDEF', sharing: true, arriveMs: 0 };
  it('약속을 마친 방은 다음 일정으로 넘어가면 나온다', () => {
    expect(shouldLeaveRoom({ ...room, finished: true }, null)).toBe(true); // 기록 저장 뒤
    expect(shouldLeaveRoom({ ...room, finished: true }, 'armed')).toBe(true); // 반복 알람이 다시 켜진 뒤
  });
  it('요약 화면에 있는 동안과, 아직 마치지 않은 방은 그대로 둔다', () => {
    expect(shouldLeaveRoom({ ...room, finished: true }, 'summary')).toBe(false);
    expect(shouldLeaveRoom(room, 'armed')).toBe(false);
    expect(shouldLeaveRoom(room, null)).toBe(false);
  });
});
