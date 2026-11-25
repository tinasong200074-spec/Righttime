// 사용자가 버튼을 눌렀을 때 위치를 한 번만 읽는다. 읽은 좌표는 호출한 쪽이 줄여서 쓰고, 여기서는 남기지 않는다.
export interface Position {
  lat: number;
  lon: number;
  accuracy: number;
}

export function readPositionOnce(): Promise<Position | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  });
}
