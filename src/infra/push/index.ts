import { VAPID_PUBLIC_KEY, type PushEntry } from '../../domain/push';

// 웹 푸시 구독과 예약. 서버에는 구독 주소와 "언제 깨울지"만 올린다.
// 알림 문구는 기기의 보관함에 두고 서비스 워커(public/push-sw.js)가 읽는다.
const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const PUSH_CACHE = 'jette-push-v1';

export const pushSupported = () =>
  Boolean(URL_BASE && ANON) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && 'caches' in window;

async function rpc(fn: string, args: Record<string, unknown>): Promise<boolean> {
  if (!URL_BASE || !ANON) return false;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON, authorization: `Bearer ${ANON}` },
      body: JSON.stringify(args),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type PushEnableResult = { ok: true; endpoint: string } | { ok: false; reason: 'unsupported' | 'denied' | 'failed' };

// 알림 권한을 받고 구독한다. 반드시 사용자가 누른 버튼에서 불러야 한다
export async function enablePush(): Promise<PushEnableResult> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  try {
    if ((await Notification.requestPermission()) !== 'granted') return { ok: false, reason: 'denied' };
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY }));
    return { ok: true, endpoint: sub.endpoint };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export async function disablePush(endpoint: string): Promise<void> {
  await rpc('push_cancel', { p_endpoint: endpoint });
  try {
    await caches.delete(PUSH_CACHE);
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    // 구독 해제에 실패해도 서버 예약은 이미 지웠다
  }
}

// 일정을 기기에 적어 두고, 서버에는 시각만 올린다
export async function syncPush(endpoint: string, entries: PushEntry[]): Promise<boolean> {
  try {
    const cache = await caches.open(PUSH_CACHE);
    await cache.put('/schedule', new Response(JSON.stringify(entries), { headers: { 'content-type': 'application/json' } }));
  } catch {
    return false;
  }
  return rpc('push_schedule', { p_endpoint: endpoint, p_times_ms: entries.map((e) => Math.round(e.at)) });
}

export const PUSH_REASON_TEXT = {
  unsupported: '이 브라우저에서는 쓸 수 없어요. 아이폰은 홈 화면에 추가한 뒤에 켤 수 있어요.',
  denied: '알림이 꺼져 있어요. 브라우저 설정에서 알림을 허용해 주세요.',
  failed: '알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요.',
} as const;
