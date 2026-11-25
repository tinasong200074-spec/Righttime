// 기기 계정(익명 로그인). 로그인 화면 없이 이 기기에 계정 하나를 만들어 쓴다.
// 이름·이메일 같은 개인 정보는 받지 않는다. 폰을 바꾸면 이어지지 않는다.
// shortcut: 라이브러리 없이 Supabase 인증 주소를 직접 부른다. 소셜 로그인을 붙일 때 공식 라이브러리로 바꾼다.
const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const KEY = 'jette:account';
const REFRESH_EARLY_MS = 60_000;

export const accountAvailable = Boolean(URL_BASE && ANON);

interface Saved {
  access: string;
  refresh: string;
  expiresAt: number;
  userId: string;
}

function load(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

async function auth(path: string, body: unknown): Promise<Saved | null> {
  if (!URL_BASE || !ANON) return null;
  try {
    const res = await fetch(`${URL_BASE}/auth/v1/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id?: string } };
    if (!j.access_token || !j.refresh_token || !j.user?.id) return null;
    const saved = { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000, userId: j.user.id };
    localStorage.setItem(KEY, JSON.stringify(saved));
    return saved;
  } catch {
    return null;
  }
}

let pending: Promise<Saved | null> | null = null;

// 계정이 없으면 만들고, 만료가 가까우면 새로 받는다. 동시에 여러 번 불려도 한 번만 처리한다
async function session(): Promise<Saved | null> {
  const cur = load();
  if (cur && cur.expiresAt - Date.now() > REFRESH_EARLY_MS) return cur;
  pending ??= (async () => {
    const refreshed = cur ? await auth('token?grant_type=refresh_token', { refresh_token: cur.refresh }) : null;
    return refreshed ?? (await auth('signup', {}));
  })().finally(() => {
    pending = null;
  });
  return pending;
}

export const hasAccount = () => load() !== null;
export const myUserId = () => load()?.userId ?? null;

// 로그인한 사용자로 DB 함수를 부른다. 실패하면 null
export async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const s = await session();
  if (!s || !URL_BASE || !ANON) return null;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON, authorization: `Bearer ${s.access}` },
      body: JSON.stringify(args),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}
