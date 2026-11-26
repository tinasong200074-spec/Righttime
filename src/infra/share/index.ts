import type { CheerKey } from '../../domain/cheer';
import type { ShareStatus } from '../../domain/share';

// Supabase 함수(RPC)를 직접 부른다. 주소와 anon 키는 공개돼도 되는 값이고,
// 표는 함수로만 드나들 수 있어서 토큰과 쓰기 키 없이는 아무것도 못 한다.
const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const shareAvailable = Boolean(URL_BASE && ANON);

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!URL_BASE || !ANON) return null;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: ANON, authorization: `Bearer ${ANON}` },
      body: JSON.stringify(args),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null; // 인터넷이 끊겨도 앱은 계속 동작해야 한다
  }
}

export interface ShareCreds {
  token: string;
  writeKey: string;
}

export async function pushShare(c: ShareCreds, st: ShareStatus, expiresMs: number): Promise<boolean> {
  const ok = await rpc<boolean>('share_upsert', {
    p_token: c.token,
    p_write_key: c.writeKey,
    p_name: st.name,
    p_stage: st.stage,
    p_step_idx: st.stepIdx,
    p_step_count: st.stepCount,
    p_eta_ms: st.etaMs,
    p_arrive_ms: st.arriveMs,
    p_late_min: st.lateMin,
    p_expires_ms: expiresMs,
  });
  return ok === true;
}

export const closeShare = (c: ShareCreds) => rpc<boolean>('share_close', { p_token: c.token, p_write_key: c.writeKey });

export interface SharedView extends ShareStatus {
  updatedAtMs: number;
}

// 없거나 닫힌 링크면 null
export const fetchShare = (token: string) => rpc<SharedView | null>('share_get', { p_token: token });

// 링크로 보는 사람이 한마디·이모티콘을 보낸다(정해 둔 것만)
export const cheerShare = (token: string, kind: CheerKey) => rpc<boolean>('share_cheer', { p_token: token, p_kind: kind });

// 공유한 기기만 읽는다: 링크로 보는 사람이 마지막으로 보낸 것
export const fetchShareInbox = (c: ShareCreds) =>
  rpc<{ cheer: string | null; cheerAtMs: number | null } | null>('share_inbox', { p_token: c.token, p_write_key: c.writeKey });

export const shareUrl = (token: string) => `${location.origin}/#s=${token}`;

// 주소의 #s=토큰 부분을 읽는다(# 뒤는 서버로 전송되지 않는다)
export function tokenFromHash(hash: string): string | null {
  return hash.match(/^#s=([0-9a-f]{32})$/)?.[1] ?? null;
}
