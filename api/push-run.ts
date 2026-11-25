import { createPrivateKey, sign } from 'node:crypto';
import { isPushEndpoint, VAPID_PUBLIC_KEY } from '../src/domain/push.js';

// 예약된 시각이 된 알림을 보낸다. Supabase의 예약 실행(pg_cron)이 1분마다 이 주소를 부른다.
// 내용 없는 푸시만 보낸다. 무슨 알림인지는 기기 안의 서비스 워커가 정한다.
// 누가 불러도 "시각이 된 것"만 보내므로 따로 잠그지 않았다.

const SUBJECT = 'https://righttime-alpha.vercel.app';
const JWT_HOURS = 12;
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

// VAPID 서명(ES256). 푸시 서비스가 "이 서버가 보낸 것"임을 확인하는 데 쓴다
function vapidHeader(endpoint: string, privateD: string): string {
  const pub = Buffer.from(VAPID_PUBLIC_KEY, 'base64url');
  const key = createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', d: privateD, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    format: 'jwk',
  });
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + JWT_HOURS * 3600, sub: SUBJECT }));
  const sig = sign('sha256', Buffer.from(`${head}.${claims}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${VAPID_PUBLIC_KEY}`;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: key, authorization: `Bearer ${key}` },
    body: JSON.stringify(args),
  });
  return res.ok ? ((await res.json()) as T) : null;
}

async function send(endpoint: string, privateD: string): Promise<number> {
  if (!isPushEndpoint(endpoint)) return 0;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: vapidHeader(endpoint, privateD), ttl: '300', urgency: 'high', 'content-length': '0' },
    });
    return res.status;
  } catch {
    return 0;
  }
}

async function run(): Promise<Response> {
  const privateD = process.env.VAPID_PRIVATE_KEY;
  if (!privateD) return Response.json({ error: 'not_configured' }, { status: 503 });
  const due = (await rpc<Array<{ endpoint: string }>>('push_take_due', {})) ?? [];
  const endpoints = [...new Set(due.map((d) => d.endpoint))];
  const statuses = await Promise.all(endpoints.map((e) => send(e, privateD)));
  // 404·410은 구독이 사라졌다는 뜻이라 남은 예약도 지운다
  const gone = endpoints.filter((_, i) => statuses[i] === 404 || statuses[i] === 410);
  await Promise.all(gone.map((e) => rpc('push_cancel', { p_endpoint: e })));
  const ok = statuses.filter((s) => s >= 200 && s < 300).length;
  return Response.json({ sent: ok, failed: statuses.length - ok });
}

const safe = () =>
  run().catch((e) => {
    console.error('push 발송 실패', e);
    return Response.json({ error: 'failed' }, { status: 502 });
  });

export const GET = safe;
export const POST = safe;
