import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { PushEntry } from '../../domain/push';

// 안드로이드 설치 앱에서만 쓴다. 휴대폰에 직접 예약해 두므로 앱을 닫아도, 인터넷이 없어도 제시각에 울린다.
// 웹에서는 아무 일도 하지 않는다(웹은 푸시를 쓴다).
const CHANNEL = 'jette-alarm';
const SOUND = 'jette_alarm.wav'; // android/app/src/main/res/raw 에 있다

const MIN_MS = 60_000;
const idOf = (at: number) => Math.round(at / MIN_MS); // 2038년 이후에도 32비트 안에 들어간다

export const isNativeApp = () => Capacitor.isNativePlatform();

let ready: Promise<boolean> | null = null;

function prepare(): Promise<boolean> {
  ready ??= (async () => {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;
    await LocalNotifications.createChannel({ id: CHANNEL, name: '알람', description: '기상·출발 알람', importance: 5, sound: SOUND, vibration: true, visibility: 1 });
    return true;
  })().catch(() => false);
  return ready;
}

// 예약을 통째로 바꾼다. 빈 목록이면 모두 취소한다
export async function syncNativeAlarms(entries: PushEntry[]): Promise<void> {
  if (!isNativeApp()) return;
  try {
    if (!(await prepare())) {
      ready = null; // 권한을 거절했으면 다음에 다시 묻는다
      return;
    }
    // 번호를 시각(분)으로 정해, 같은 알람은 다시 걸지 않고 이미 울린 알림은 지우지 않는다.
    // (울리는 순간 일정이 바뀌어 전부 지웠다가, 소리가 1초 만에 끊긴 적이 있다)
    const now = Date.now();
    const want = new Map(entries.map((e) => [idOf(e.at), e]));
    const { notifications: pending } = await LocalNotifications.getPending();
    const stale = pending.filter((n) => !want.has(n.id) && n.id * MIN_MS > now);
    if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });
    const have = new Set(pending.map((n) => n.id));
    const add = [...want].filter(([id]) => !have.has(id));
    if (add.length === 0) return;
    await LocalNotifications.schedule({
      notifications: add.map(([id, e]) => ({ id, title: e.title, body: e.body, channelId: CHANNEL, sound: SOUND, schedule: { at: new Date(e.at), allowWhileIdle: true } })),
    });
  } catch {
    // 예약에 실패해도 앱 안의 알람은 그대로 동작한다
  }
}

// 설치 앱을 처음 열 때 알림과 위치 권한을 차례로 묻는다. 한 번 물은 뒤에는 필요한 화면에서만 다시 묻는다
export async function askNativePermissionsOnce(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    if (localStorage.getItem('jette:perm-asked')) return;
    localStorage.setItem('jette:perm-asked', '1');
  } catch {
    return;
  }
  await prepare();
  // 위치를 한 번 읽으려 하면 안드로이드가 위치 허용 창을 띄운다. 읽은 값은 쓰지 않는다
  navigator.geolocation?.getCurrentPosition(
    () => undefined,
    () => undefined,
    { timeout: 8000 },
  );
}
