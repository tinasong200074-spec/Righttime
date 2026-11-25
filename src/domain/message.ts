import { fmtClock } from './format.js';
import { MIN, type GeoResult, type Session, type Tone, type ToneMode, type ToneTemplates } from './types.js';

// 명세 9.6: 문구는 도착 시각과 늦는 분만 말한다. 준비 단계는 절대 넣지 않는다
export const TONES: Record<Exclude<ToneMode, 'custom'>, ToneTemplates & { name: string }> = {
  polite: {
    name: '존댓말',
    eta: '{시각}쯤 도착할 것 같아요.',
    late: '미안해요, 늦을 것 같아요. 약 {분}분 정도 늦을 수 있어요. {시각}쯤 도착할 것 같아요.',
    maybe: '혹시 모르니 미리 말해 둘게요. {분}분 정도 늦을 수도 있어요.',
    arrive: '{장소}에 도착했어요.',
  },
  casual: {
    name: '반말',
    eta: '{시각}쯤 도착할 것 같아.',
    late: '미안, 늦을 것 같아. 한 {분}분 늦을 듯. {시각}쯤 도착할 것 같아.',
    maybe: '혹시 모르니까 미리 말해 둘게. {분}분 정도 늦을 수도 있어.',
    arrive: '{장소}에 도착했어.',
  },
  short: {
    name: '짧게',
    eta: '{시각} 도착 예정',
    late: '{분}분 늦어요. {시각} 도착 예정',
    maybe: '{분}분 늦을 수도 있어요',
    arrive: '{장소} 도착',
  },
  formal: {
    name: '격식',
    eta: '{시각}경 도착할 예정입니다.',
    late: '죄송합니다. 약 {분}분 늦을 것 같습니다. {시각}경 도착할 예정입니다.',
    maybe: '혹시 몰라 미리 말씀드립니다. {분}분 정도 늦을 수도 있습니다.',
    arrive: '{장소}에 도착하였습니다.',
  },
};

export function templatesOf(tone: Tone): ToneTemplates {
  if (tone.mode === 'custom') return { ...TONES.polite, ...tone.custom };
  return TONES[tone.mode] ?? TONES.polite;
}

export type MessageKind = keyof ToneTemplates;
export interface MessageValues {
  time?: string;
  min?: number;
  place?: string;
}

export function buildMessage(tone: Tone, kind: MessageKind, v: MessageValues): string {
  let s = templatesOf(tone)[kind];
  if (!v.place) s = s.replace(/\{장소\}(에|을|를)?\s?/g, ''); // 장소가 없으면 조사까지 지운다
  return s
    .replace(/\{시각\}/g, v.time ?? '')
    .replace(/\{분\}/g, v.min === undefined ? '' : String(v.min))
    .replace(/\{장소\}/g, v.place ?? '')
    .trim();
}

const FIVE_MIN = 5 * MIN;
export const roundUp5 = (ms: number) => Math.ceil(ms / FIVE_MIN) * FIVE_MIN;

// 지금 속도로 가면 언제 도착할지
export function projArrive(s: Session, now: number): number {
  const travel = s.travelMin * MIN;
  if (s.state === 'travel') return Math.max(now, (s.leftAt ?? now) + travel);
  if (s.state === 'summary') return s.arrivedAt ?? now;
  if (s.state === 'check') return now + travel;
  if (s.state === 'prep') {
    const cur = s.steps[s.stepIdx];
    const curLeft = cur ? Math.max(0, cur.est - (now - (s.stepStartAt ?? now)) / MIN) : 0;
    const rest = s.steps.slice(s.stepIdx + 1).reduce((a, x) => a + x.est, 0);
    return now + (curLeft + rest) * MIN + travel;
  }
  if (s.state === 'armed' && now < s.alarmAt) return s.arriveAt;
  return now + s.steps.reduce((a, x) => a + x.est, 0) * MIN + travel;
}

export interface LateInfo {
  lateMin: number;
  isLate: boolean;
  etaText: string; // 5분 단위로 올린 HH:MM
  lateN: number; // 문구에 넣을 분(5분 단위, 최소 5)
}

const LATE_OVER_MIN = 0.5;

export function lateInfo(proj: number, arriveAt: number): LateInfo {
  const lateMin = (proj - arriveAt) / MIN;
  return {
    lateMin,
    isLate: lateMin > LATE_OVER_MIN,
    etaText: fmtClock(roundUp5(proj)),
    lateN: Math.max(5, Math.ceil(lateMin / 5) * 5),
  };
}

export function etaMessage(tone: Tone, s: Session, now: number): string {
  return buildMessage(tone, 'eta', { time: lateInfo(projArrive(s, now), s.arriveAt).etaText });
}

// 늦을 때는 late, 아직 늦지 않았으면 "늦을 수도 있어요"(5분)
export function lateMessage(tone: Tone, s: Session, now: number): string {
  const info = lateInfo(projArrive(s, now), s.arriveAt);
  return info.isLate
    ? buildMessage(tone, 'late', { min: info.lateN, time: info.etaText })
    : buildMessage(tone, 'maybe', { min: 5, time: info.etaText });
}

export function arriveMessage(tone: Tone, placeName: string, geo?: GeoResult): string {
  const base = buildMessage(tone, 'arrive', { place: placeName }) || '도착했어요.';
  if (geo?.status === 'match') return `${base.replace(/[.!]?$/, '')} (위치 확인됨).`;
  if (geo?.status === 'mismatch') return `${base} 위치는 저장한 장소와 조금 다르게 나와요.`;
  return base;
}
