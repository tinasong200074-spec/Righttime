import { describe, expect, it } from 'vitest';
import { planFromEventState } from './queueState';
import { armState, defaultState, type AppState } from './state';

const NOW = new Date(2026, 10, 26, 10, 0).getTime();
const EVENT = { title: 'B사 면접', place: '', ms: new Date(2026, 10, 30, 14, 0).getTime() };
const HELPER = { notice: [], general: [], eve: [], prep: [], caution: '', event: EVENT };

describe('도우미가 읽은 일정을 도착 시각으로 설정', () => {
  it('잡아 둔 약속이 없으면 지금 일정의 도착 시각과 이름만 바꾼다', () => {
    const s = planFromEventState(defaultState(NOW), NOW, EVENT);
    expect(s.plan.arriveAt).toBe(EVENT.ms);
    expect(s.plan.title).toBe('B사 면접');
    expect(s.session).toBeNull();
  });

  it('알람을 켜 둔 약속이 있으면 그 약속은 그대로 두고 새 약속으로 적는다', () => {
    const base = defaultState(NOW);
    const armed = armState({ ...base, plan: { ...base.plan, title: 'A사 면접' }, helper: HELPER } as AppState, NOW, false);
    expect(armed.session?.state).toBe('armed');
    const s = planFromEventState(armed, NOW, EVENT);
    // 켜 둔 약속은 대기 목록으로 가고 내용이 바뀌지 않는다
    expect(s.parked).toHaveLength(1);
    expect(s.parked[0].plan.title).toBe('A사 면접');
    expect(s.parked[0].session.arriveAt).toBe(armed.session?.arriveAt);
    // 새 약속 화면에는 읽은 일정이 들어가 있고, 도우미 결과도 남아 있다
    expect(s.session).toBeNull();
    expect(s.drafting).toBe(true);
    expect(s.plan.arriveAt).toBe(EVENT.ms);
    expect(s.plan.title).toBe('B사 면접');
    expect(s.helper).toBe(HELPER);
  });

  it('이름을 못 읽었으면 도착 시각만 바꾼다', () => {
    const base = defaultState(NOW);
    const s = planFromEventState({ ...base, plan: { ...base.plan, title: '원래 이름' } }, NOW, { ...EVENT, title: '' });
    expect(s.plan.title).toBe('원래 이름');
    expect(s.plan.arriveAt).toBe(EVENT.ms);
  });
});
