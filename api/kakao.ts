import { isValidCoord, parsePlaces, parseTransit } from '../src/domain/transit.js';

// 카카오 프록시(서버 전용). 키는 환경 변수에만 있다.
// 응답은 저장하지 않고 그때그때 불러서 바로 돌려준다(카카오 이용 조건).

const KAKAO = 'https://dapi.kakao.com';
const QUERY_MAX = 50;
type ErrorCode = 'not_configured' | 'bad_request' | 'not_enabled' | 'limit' | 'failed';

const json = (status: number, body: { result?: unknown; error?: ErrorCode }) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function kakao(path: string, params: Record<string, string>, key: string): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${KAKAO}${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `KakaoAK ${key}` } });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
}

// 카카오 오류를 화면에 보여 줄 코드로 바꾼다
function errorOf(status: number, body: unknown): ErrorCode {
  const o = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (o.errorType === 'NotAuthorizedError') return 'not_enabled'; // 콘솔에서 카카오맵 사용 설정이 꺼져 있음
  if (o.code === -10 || status === 429) return 'limit';
  if (status === 401) return 'not_configured';
  return 'failed';
}

async function search(q: string, key: string): Promise<Response> {
  const query = q.trim();
  if (!query || query.length > QUERY_MAX) return json(400, { error: 'bad_request' });
  const r = await kakao('/v2/local/search/keyword.json', { query, size: '8' }, key);
  return r.ok ? json(200, { result: parsePlaces(r.body) }) : json(502, { error: errorOf(r.status, r.body) });
}

async function route(p: URLSearchParams, key: string): Promise<Response> {
  const [sy, sx, ey, ex] = ['sy', 'sx', 'ey', 'ex'].map((k) => Number(p.get(k)));
  if (!isValidCoord(sy, sx) || !isValidCoord(ey, ex)) return json(400, { error: 'bad_request' });
  const r = await kakao('/v2/routing/publictraffic', { start_x: String(sx), start_y: String(sy), end_x: String(ex), end_y: String(ey) }, key);
  // 경로가 없으면 result가 null이다(가까워서 걸어가는 거리 등)
  return r.ok ? json(200, { result: parseTransit(r.body) }) : json(502, { error: errorOf(r.status, r.body) });
}

export async function GET(request: Request): Promise<Response> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return json(503, { error: 'not_configured' });
  try {
    const p = new URL(request.url).searchParams;
    if (p.get('task') === 'search') return await search(p.get('q') ?? '', key);
    if (p.get('task') === 'route') return await route(p, key);
    return json(400, { error: 'bad_request' });
  } catch (e) {
    console.error('kakao 호출 실패', e);
    return json(502, { error: 'failed' });
  }
}
