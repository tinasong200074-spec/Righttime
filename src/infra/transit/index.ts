import type { FoundPlace, TransitRoute } from '../../domain/transit';

// 서버 함수(api/kakao)를 부른다. 키는 서버에만 있다.
// 장소 이름과 좌표는 주소(쿼리)에 실려 우리 서버와 카카오로 간다. 그 밖의 개인 정보는 보내지 않는다.

export type TransitErrorCode = 'not_configured' | 'bad_request' | 'not_enabled' | 'limit' | 'failed';

export class TransitError extends Error {
  code: TransitErrorCode;
  constructor(code: TransitErrorCode) {
    super(code);
    this.code = code;
  }
}

export const TRANSIT_ERROR_TEXT: Record<TransitErrorCode, string> = {
  not_configured: '지도 검색이 아직 연결되지 않았어요. 이동 시간을 직접 적어 주세요.',
  not_enabled: '지도 검색이 아직 켜져 있지 않아요. 이동 시간을 직접 적어 주세요.',
  bad_request: '검색어나 위치를 다시 확인해 주세요.',
  limit: '오늘 지도 검색 횟수를 다 썼어요. 이동 시간을 직접 적어 주세요.',
  failed: '지도 검색을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
};

async function call<T>(params: Record<string, string>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/kakao?${new URLSearchParams(params)}`);
  } catch {
    throw new TransitError('failed');
  }
  const json = (await res.json().catch(() => null)) as { result?: T; error?: TransitErrorCode } | null;
  if (!res.ok || !json || json.result === undefined) throw new TransitError(json?.error ?? 'failed');
  return json.result;
}

export const searchPlaces = (q: string) => call<FoundPlace[]>({ task: 'search', q });

export interface Coord {
  lat: number;
  lon: number;
}

// 지금 출발 기준의 대중교통 소요 시간. 경로가 없으면 null(걸어갈 거리 등)
export const fetchTransit = (from: Coord, to: Coord) =>
  call<TransitRoute | null>({ task: 'route', sy: String(from.lat), sx: String(from.lon), ey: String(to.lat), ex: String(to.lon) });
