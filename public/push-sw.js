// 서버가 보낸 "내용 없는 푸시"를 받아 알림을 띄운다. 무슨 알림인지는 앱이 기기에 적어 둔 일정에서 고른다.
// 서비스 워커에 덧붙여 불러 쓰는 일반 스크립트다. 고르는 규칙은 src/domain/push.ts의 pickEntry와 같다.
const PUSH_CACHE = 'jette-push-v1';
const NEAR_MS = 3 * 60 * 1000;

async function pickEntry() {
  try {
    const res = await (await caches.open(PUSH_CACHE)).match('/schedule');
    const entries = res ? await res.json() : [];
    const now = Date.now();
    return entries.filter((e) => Math.abs(e.at - now) <= NEAR_MS).sort((a, b) => Math.abs(a.at - now) - Math.abs(b.at - now))[0] || null;
  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    pickEntry().then((entry) =>
      // 푸시를 받으면 반드시 알림을 띄워야 한다(브라우저 규칙). 일정을 못 찾으면 일반 문구를 쓴다
      self.registration.showNotification(entry ? entry.title : '제때', {
        body: entry ? entry.body : '확인할 시간이에요. 앱을 열어 주세요.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'jette',
        renotify: true,
        requireInteraction: true,
        vibrate: [300, 150, 300],
      }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => 'focus' in c);
      return open ? open.focus() : self.clients.openWindow('/');
    }),
  );
});
