// 도착 위치를 한 번만 읽는다. 좌표는 호출한 쪽이 바로 거리 계산에만 쓰고 저장하지 않는다(명세 9.5).
export interface Position {
  lat: number;
  lon: number;
  accuracy: number;
}

const READ_TIMEOUT_MS = 8000;
// 권한 창이 떠 있는 동안에는 브라우저 제한 시간이 멈출 수 있어서 한 번 더 막아 둔다.
const GUARD_TIMEOUT_MS = 9000;

export function readPositionOnce(): Promise<Position | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const guard = setTimeout(() => resolve(null), GUARD_TIMEOUT_MS);
    const finish = (value: Position | null) => {
      clearTimeout(guard);
      resolve(value);
    };
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        finish({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => finish(null),
      { enableHighAccuracy: true, timeout: READ_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
