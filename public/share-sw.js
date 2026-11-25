// 공유창으로 받은 사진·글을 잠깐 보관했다가 앱으로 넘긴다(안드로이드, 홈 화면에 설치했을 때만 동작).
// 서비스 워커에 덧붙여 불러 쓰는 파일이라 일반 스크립트로 둔다.
const SHARE_CACHE = 'jette-shared-v1';
const SHARE_PATH = '/share-target';
const MAX_IMAGES = 3;

async function keepShared(request) {
  const form = await request.formData();
  await caches.delete(SHARE_CACHE); // 이전에 받아 두고 안 쓴 것은 지운다
  const cache = await caches.open(SHARE_CACHE);
  const images = form
    .getAll('images')
    .filter((f) => f instanceof File && f.type.startsWith('image/'))
    .slice(0, MAX_IMAGES);
  await Promise.all(images.map((file, i) => cache.put(`/shared/image-${i}`, new Response(file, { headers: { 'content-type': file.type } }))));
  const text = ['title', 'text', 'url']
    .map((k) => form.get(k))
    .filter((v) => typeof v === 'string' && v.trim())
    .join('\n')
    .slice(0, 4000);
  await cache.put('/shared/text', new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== SHARE_PATH) return;
  event.respondWith(
    keepShared(event.request)
      .catch(() => undefined) // 보관에 실패해도 앱은 열어 준다
      .then(() => Response.redirect('/?shared=1', 303)),
  );
});
