// 공유창으로 받은 사진·글을 꺼낸다(public/share-sw.js가 잠깐 보관해 둔 것).
const SHARE_CACHE = 'jette-shared-v1';
const MAX_IMAGES = 3;

export interface SharedContent {
  images: File[];
  text: string;
}

export const hasSharedFlag = () => new URLSearchParams(location.search).get('shared') === '1';

// 주소에서 ?shared=1을 지운다(새로고침해도 다시 뜨지 않게)
export const clearSharedFlag = () => history.replaceState(null, '', location.pathname + location.hash);

// 한 번 꺼내면 보관함을 비운다. 사진 원본을 기기에 남겨 두지 않는다
export async function takeShared(): Promise<SharedContent | null> {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const images: File[] = [];
    for (let i = 0; i < MAX_IMAGES; i++) {
      const res = await cache.match(`/shared/image-${i}`);
      if (!res) break;
      const blob = await res.blob();
      images.push(new File([blob], `shared-${i}`, { type: blob.type }));
    }
    const text = (await (await cache.match('/shared/text'))?.text()) ?? '';
    await caches.delete(SHARE_CACHE);
    return images.length > 0 || text ? { images, text } : null;
  } catch {
    return null;
  }
}
