import { MIN } from './types.js';

// 친구에게 보내는 한마디와 이모티콘. 아무 글이나 보낼 수 없게 정해 둔 것만 쓰고, 서버도 같은 목록만 받는다.

export const CHEER_TEXT = {
  slow: '천천히 와요',
  ok: '괜찮아요, 천천히 와요',
  prep: '천천히 준비해요',
  later: '이따 봐요',
  safe: '조심히 와요',
  soon: '곧 봐요',
  waiting: '기다리고 있어요',
  here: '먼저 도착했어요',
  tardy: '좀 늦네요',
  ready: '전 준비 끝났어요',
  arrived: '도착했어요',
} as const;

export const CHEER_EMOJI = {
  e_happy: { icon: '😊', label: '기쁨' },
  e_sad: { icon: '😢', label: '슬픔' },
  e_angry: { icon: '😠', label: '화남' },
  e_tired: { icon: '😴', label: '피곤함' },
  e_laugh: { icon: '😂', label: '웃김' },
  e_good: { icon: '👍', label: '좋아요' },
  e_thanks: { icon: '🙏', label: '고마워요' },
} as const;

export type CheerTextKey = keyof typeof CHEER_TEXT;
export type CheerEmojiKey = keyof typeof CHEER_EMOJI;
export type CheerKey = CheerTextKey | CheerEmojiKey;

// 링크로 보는 사람(앱 없이 보는 약속 상대)에게 보여 주는 한마디
export const LINK_CHEERS: CheerTextKey[] = ['slow', 'tardy'];

const SOON_MIN = 30;

// 지금 상황에 맞는 한마디 두 개. 첫 번째가 가장 어울리는 말이다
export function cheerOptions(i: { arriveMs: number; now: number; lateMin: number | null }): CheerTextKey[] {
  if (i.lateMin && i.lateMin > 0) return ['ok', 'waiting']; // 늦는다고 알려 왔을 때
  if (i.now >= i.arriveMs) return ['waiting', 'arrived']; // 약속 시각이 지났을 때
  if (i.arriveMs - i.now <= SOON_MIN * MIN) return ['arrived', 'ready']; // 약속이 가까울 때는 도착을 먼저 보여 준다
  return ['ready', 'arrived']; // 아직 여유가 있을 때: 내 쪽 상황을 알려 준다
}

// 받은 쪽 알림 한 줄: "민수님: 기다리고 있어요"
export const cheerLine = (from: string | null, text: string) => `${from || '친구'}님: ${text}`;
