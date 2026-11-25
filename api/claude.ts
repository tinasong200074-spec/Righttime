import Anthropic from '@anthropic-ai/sdk';
import { extractJson, helperPrompt, memoPrompt, normalizeHelper, normalizeMemo, normalizeTone, tonePrompt, type HelperInput } from '../src/domain/ai';

// Claude 프록시(서버 전용). 키는 환경 변수에만 있고 브라우저로 나가지 않는다.
// 받은 글과 사진은 저장하지 않고, 호출이 끝나면 버린다.

const TEXT_MAX = 4000;
const TONE_SAMPLES_MAX = 800;
const IMAGE_COUNT_MAX = 3;
const IMAGE_B64_MAX = 5_000_000; // 사진 한 장당 base64 길이 상한(약 3.7MB)
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type MediaType = (typeof MEDIA_TYPES)[number];
type ErrorCode = 'not_configured' | 'too_large' | 'bad_request' | 'refused' | 'failed';

const json = (status: number, body: { result?: unknown; error?: ErrorCode }) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

class Reject extends Error {
  code: ErrorCode;
  status: number;
  constructor(status: number, code: ErrorCode) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const text = (v: unknown, max = TEXT_MAX): string => {
  if (typeof v !== 'string') throw new Reject(400, 'bad_request');
  if (v.length > max) throw new Reject(413, 'too_large');
  return v;
};

function images(v: unknown): Anthropic.Beta.BetaImageBlockParam[] {
  const arr = Array.isArray(v) ? v : [];
  if (arr.length > IMAGE_COUNT_MAX) throw new Reject(413, 'too_large');
  return arr.map((x: { mediaType?: unknown; data?: unknown }) => {
    const mediaType = MEDIA_TYPES.find((m) => m === x?.mediaType);
    if (!mediaType || typeof x.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(x.data)) throw new Reject(400, 'bad_request');
    if (x.data.length > IMAGE_B64_MAX) throw new Reject(413, 'too_large');
    return { type: 'image', source: { type: 'base64', media_type: mediaType as MediaType, data: x.data } };
  });
}

function helperInput(v: unknown): HelperInput {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    kind: text(o.kind ?? 'etc', 20) as HelperInput['kind'],
    title: text(o.title ?? '', 100),
    arriveText: text(o.arriveText ?? '', 60),
    notes: text(o.notes ?? ''),
  };
}

type Effort = 'low' | 'medium';

async function ask(client: Anthropic, content: Anthropic.Beta.BetaContentBlockParam[], effort: Effort): Promise<unknown> {
  const res = await client.beta.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort },
    // 안전 분류기가 거절하면 서버가 알아서 대체 모델로 다시 시도한다
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal') throw new Reject(422, 'refused');
  const out = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return extractJson(out);
}

async function run(client: Anthropic, body: Record<string, unknown>): Promise<unknown> {
  if (body.task === 'memo') {
    return normalizeMemo(await ask(client, [{ type: 'text', text: memoPrompt(text(body.text)) }], 'low'));
  }
  if (body.task === 'tone') {
    return normalizeTone(await ask(client, [{ type: 'text', text: tonePrompt(text(body.samples, TONE_SAMPLES_MAX)) }], 'low'));
  }
  if (body.task === 'helper') {
    const content = [...images(body.images), { type: 'text' as const, text: helperPrompt(helperInput(body.input)) }];
    return normalizeHelper(await ask(client, content, 'medium'), Date.now());
  }
  throw new Reject(400, 'bad_request');
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: 'not_configured' });
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new Reject(400, 'bad_request');
    return json(200, { result: await run(new Anthropic(), body) });
  } catch (e) {
    if (e instanceof Reject) return json(e.status, { error: e.code });
    if (e instanceof Anthropic.BadRequestError) return json(400, { error: 'bad_request' });
    if (e instanceof Anthropic.AuthenticationError) return json(503, { error: 'not_configured' });
    console.error('claude 호출 실패', e instanceof Anthropic.APIError ? e.status : e);
    return json(502, { error: 'failed' });
  }
}
