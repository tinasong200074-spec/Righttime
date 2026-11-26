import { MIN, type Session } from './types.js';

// 앱을 닫아 둬도 받을 알림의 일정. 서버에는 "언제 깨울지"만 올리고,
// 무슨 알림인지(문구)는 기기 안에만 둔다.

export interface PushEntry {
  at: number;
  title: string;
  body: string;
}

// 푸시 서명에 쓰는 공개 키(공개돼도 되는 값). 비밀 키는 서버 환경 변수에만 있다
export const VAPID_PUBLIC_KEY = 'BCUObL1lAMrP0eJ0U7jPIRjrEw4DJkVR9UnVLAwHDMfF3Rr0IX_hd5rnBLPeU0JReSGEd2v9E9iDcje1STGUTCQ';

// 출발 단계에 들어설 때 한 번 더 묻는 문구. 챙길 것이 없으면 빈 글
export const leaveAskText = (carry: string[]) => (carry.length > 0 ? `이거 챙겼어? ${carry.join(', ')}` : '');

export function buildPushSchedule(s: Session | null, now: number, preLeave: number): PushEntry[] {
  if (!s || s.demo) return [];
  const out: PushEntry[] = [];
  const wakeAt = s.state === 'snoozed' ? s.nextRingAt : s.state === 'armed' ? s.alarmAt : undefined;
  if (wakeAt !== undefined) out.push({ at: wakeAt, title: '시작할 시간이에요', body: '앱을 열어 알람을 끄고 준비를 시작해요.' });
  const beforeLeave = s.state !== 'travel' && s.state !== 'summary';
  if (beforeLeave) {
    out.push({ at: s.leaveAt - preLeave * MIN, title: `출발 ${preLeave}분 전이에요`, body: '챙길 것을 확인해요.' });
    out.push({ at: s.leaveAt, title: '출발할 시간이에요', body: '지금 나가면 늦지 않아요.' });
  }
  return out.filter((e) => e.at > now).sort((a, b) => a.at - b.at);
}

const NEAR_MS = 3 * MIN;

// 푸시가 도착했을 때 지금 시각에 가장 가까운 알림을 고른다(서버는 문구를 모른다)
export function pickEntry(entries: PushEntry[], now: number): PushEntry | null {
  const near = entries.filter((e) => Math.abs(e.at - now) <= NEAR_MS).sort((a, b) => Math.abs(a.at - now) - Math.abs(b.at - now));
  return near[0] ?? null;
}

// 구독 주소가 알려진 푸시 서비스의 것인지 확인한다(서버가 아무 주소로나 요청을 보내지 않게)
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

export function isPushEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}
