const KEY = 'jette:v1';

// 저장소가 막혀 있어도(사생활 보호 모드 등) 앱은 계속 동작해야 한다
export function loadRaw(): unknown {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRaw(state: unknown): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 조용히 넘긴다(화면 동작이 우선)
  }
}

export function clearRaw(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 위와 같음
  }
}
