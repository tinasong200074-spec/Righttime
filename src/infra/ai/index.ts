import type { AskItem, HelperInput, HelperResult } from '../../domain/ai';
import type { ToneTemplates } from '../../domain/types';

// 서버 함수(api/claude)를 부른다. 키는 서버에만 있고 여기에는 없다.

export interface ImagePart {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  data: string; // base64
}

export type AiErrorCode = 'not_configured' | 'too_large' | 'bad_request' | 'refused' | 'failed';

export class AiError extends Error {
  code: AiErrorCode;
  constructor(code: AiErrorCode) {
    super(code);
    this.code = code;
  }
}

// 화면에 보여 줄 한국어 안내
export const AI_ERROR_TEXT: Record<AiErrorCode, string> = {
  not_configured: 'AI가 아직 연결되지 않았어요. 직접 적어 주세요.',
  too_large: '사진이 너무 크거나 많아요. 3장 이하로 줄여 주세요.',
  bad_request: '보낸 내용을 읽을 수 없어요. 글이나 사진을 다시 확인해 주세요.',
  refused: 'AI가 이 내용은 처리하지 않았어요. 직접 적어 주세요.',
  failed: 'AI를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
};

async function call<T>(body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/claude', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    throw new AiError('failed');
  }
  const json = (await res.json().catch(() => null)) as { result?: T; error?: AiErrorCode } | null;
  if (!res.ok || !json || json.result === undefined) throw new AiError(json?.error ?? 'failed');
  return json.result;
}

export const splitMemoWithAi = (text: string) => call<AskItem[]>({ task: 'memo', text });
export const buildToneWithAi = (samples: string) => call<ToneTemplates>({ task: 'tone', samples });
export const readPlanWithAi = (input: HelperInput, images: ImagePart[]) => call<HelperResult>({ task: 'helper', input, images });

const MAX_SIDE = 1568; // 이보다 큰 사진은 줄여서 보낸다(전송량과 비용을 줄임)
const JPEG_QUALITY = 0.85;

// 사진 파일을 줄여서 base64로 바꾼다. 원본은 어디에도 저장하지 않는다
export async function fileToImagePart(file: Blob): Promise<ImagePart> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return { mediaType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}
