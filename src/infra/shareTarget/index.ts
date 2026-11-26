import { Capacitor, registerPlugin } from '@capacitor/core';

// 공유창으로 받은 사진·글을 꺼낸다(웹은 public/share-sw.js가 잠깐 보관해 둔 것, 안드로이드 설치 앱은 SharedImagesPlugin이 넘겨 준 것).
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

// ---- 안드로이드 설치 앱: 갤러리·메신저 공유창의 "제때"로 온 내용 ----
interface NativeShared {
  images: Array<{ type: string; data: string }>;
  text: string;
}
interface SharedImagesApi {
  take(): Promise<NativeShared>;
  addListener(event: 'shared', cb: () => void): Promise<{ remove: () => Promise<void> }>;
}
const Native = registerPlugin<SharedImagesApi>('SharedImages');

// 예전에 만든 설치 파일에는 이 플러그인이 없을 수 있어서 있는지 먼저 본다
export const hasNativeShare = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SharedImages');

function toFile(img: { type: string; data: string }, i: number): File {
  const bin = atob(img.data);
  const bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return new File([bytes], `shared-${i}`, { type: img.type });
}

export async function takeNativeShared(): Promise<SharedContent | null> {
  try {
    const got = await Native.take();
    const images = got.images.slice(0, MAX_IMAGES).map(toFile);
    return images.length > 0 || got.text ? { images, text: got.text } : null;
  } catch {
    return null;
  }
}

// 앱이 이미 켜져 있을 때 공유가 오면 알려 준다. 돌려주는 함수를 부르면 구독이 끝난다
export function onNativeShared(cb: () => void): () => void {
  let handle: { remove: () => Promise<void> } | null = null;
  let closed = false;
  void Native.addListener('shared', cb).then((h) => {
    if (closed) void h.remove();
    else handle = h;
  });
  return () => {
    closed = true;
    void handle?.remove();
  };
}
