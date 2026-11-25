import { describe, expect, it } from 'vitest';
import { judgeDistance } from './geo';
import { TONES, arriveMessage, buildMessage, lateInfo } from './message';
import { buildChecklist, judgeWeather, splitMemoText } from './weather';
import { DEFAULT_SETTINGS, MIN, type HourWeather, type Tone, type ToneMode } from './types';

const MODES: ToneMode[] = ['polite', 'casual', 'short', 'formal'];
const STAGE_WORDS = /준비\s?중|일어나는|출발했|기상|알람/;

describe('문구 (명세 15-4)', () => {
  it('어떤 말투에도 준비 단계 단어가 없다', () => {
    for (const mode of MODES) {
      for (const tpl of Object.values(TONES[mode as Exclude<ToneMode, 'custom'>])) expect(tpl).not.toMatch(STAGE_WORDS);
    }
  });
  it('자리표시자를 채운다', () => {
    const tone: Tone = { mode: 'polite' };
    expect(buildMessage(tone, 'eta', { time: '09:10' })).toBe('09:10쯤 도착할 것 같아요.');
    expect(buildMessage(tone, 'late', { min: 10, time: '09:10' })).toContain('약 10분');
  });
  it('장소가 없으면 조사까지 지운다', () => {
    expect(buildMessage({ mode: 'polite' }, 'arrive', {})).toBe('도착했어요.');
    expect(buildMessage({ mode: 'short' }, 'arrive', {})).toBe('도착');
    expect(buildMessage({ mode: 'formal' }, 'arrive', { place: 'A사' })).toBe('A사에 도착하였습니다.');
  });
  it('내 말투가 비어 있으면 존댓말로 대신한다', () => {
    expect(buildMessage({ mode: 'custom' }, 'eta', { time: '09:00' })).toBe('09:00쯤 도착할 것 같아요.');
  });
  it('늦는 분은 5분 단위 올림(최소 5), 도착 예정은 5분 단위 올림', () => {
    const arriveAt = new Date(2026, 10, 26, 9, 0).getTime();
    expect(lateInfo(arriveAt + 7 * MIN, arriveAt)).toMatchObject({ isLate: true, lateN: 10, etaText: '09:10' });
    expect(lateInfo(arriveAt + 1 * MIN, arriveAt)).toMatchObject({ isLate: true, lateN: 5, etaText: '09:05' });
    expect(lateInfo(arriveAt - 3 * MIN, arriveAt)).toMatchObject({ isLate: false, etaText: '09:00' });
  });
  it('도착 문구에 위치 확인 결과를 덧붙인다', () => {
    expect(arriveMessage({ mode: 'polite' }, 'A사', { status: 'match', dist: 20 })).toBe('A사에 도착했어요 (위치 확인됨).');
    expect(arriveMessage({ mode: 'polite' }, '', { status: 'mismatch', dist: 400 })).toContain('조금 다르게');
  });
});

const hour = (over: Partial<HourWeather>): HourWeather => ({ timeMs: 0, prob: 0, precip: 0, apparent: 18, code: 0, ...over });

describe('judgeWeather (명세 15-5)', () => {
  it('강수 70%·체감 4°C → 우산과 겉옷', () => {
    const w = judgeWeather([hour({ prob: 70, apparent: 4 })], DEFAULT_SETTINGS);
    expect(w.rain).toBe(true);
    expect(w.cloth?.text).toBe('겉옷');
    expect(w.line).toBe('춥고 비가 와요 · 체감 4°C · 비 70%');
  });
  it('강수 10%·체감 31°C → 물과 얇은 옷', () => {
    const w = judgeWeather([hour({ prob: 10, apparent: 31 })], DEFAULT_SETTINGS);
    expect(w.rain).toBe(false);
    expect(w.cloth?.text).toBe('물과 얇은 옷');
  });
  it('체감 3°C 이하는 두꺼운 외투, 확률이 낮아도 비 코드면 우산', () => {
    const w = judgeWeather([hour({ prob: 20, apparent: 2, code: 61 })], DEFAULT_SETTINGS);
    expect(w.cloth?.text).toBe('두꺼운 외투');
    expect(w.rain).toBe(true);
  });
  it('예보가 없으면 ok=false', () => expect(judgeWeather([], DEFAULT_SETTINGS).ok).toBe(false));
});

describe('buildChecklist', () => {
  const wet = judgeWeather([hour({ prob: 70, apparent: 4 })], DEFAULT_SETTINGS);
  const memos = [{ id: 'm1', text: '신분증', ask: '신분증 챙겼어?', pin: false }];
  it('자동이면 날씨 항목이 들어간다', () => {
    expect(buildChecklist(memos, 'auto', wet, DEFAULT_SETTINGS).map((i) => i.text)).toEqual(['신분증', '우산', '겉옷']);
  });
  it('"비 없음"을 직접 고르면 자동 항목이 없다', () => {
    expect(buildChecklist(memos, 'none', wet, DEFAULT_SETTINGS).map((i) => i.text)).toEqual(['신분증']);
  });
  it('직접 "비 와요"를 고르면 예보가 없어도 우산', () => {
    expect(buildChecklist([], 'yes', null, DEFAULT_SETTINGS).map((i) => i.text)).toEqual(['우산']);
  });
});

describe('splitMemoText', () => {
  it('쉼표와 줄바꿈으로 나눈다', () => {
    expect(splitMemoText('신분증, 졸업증명서\n충전기').map((m) => m.text)).toEqual(['신분증', '졸업증명서', '충전기']);
  });
});

describe('judgeDistance (명세 15-6)', () => {
  it('반경 150m, 정확도 25m: 140m는 일치, 400m는 불일치', () => {
    expect(judgeDistance(140, 150, 25)).toEqual({ status: 'match', dist: 140 });
    expect(judgeDistance(400, 150, 25)).toEqual({ status: 'mismatch', dist: 400 });
  });
  it('정확도 보정은 100m까지만', () => {
    expect(judgeDistance(260, 150, 500).status).toBe('mismatch');
  });
});
