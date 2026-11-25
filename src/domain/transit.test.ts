import { describe, expect, it } from 'vitest';
import { isValidCoord, parsePlaces, parseTransit } from './transit';

describe('parsePlaces', () => {
  it('이름과 좌표를 꺼내고 도로명 주소를 먼저 쓴다', () => {
    const raw = {
      documents: [
        { place_name: '강남역 2호선', address_name: '서울 강남구 역삼동 858', road_address_name: '서울 강남구 강남대로 396', x: '127.0276', y: '37.4979' },
        { place_name: '주소만', address_name: '서울 어딘가', road_address_name: '', x: '127.1', y: '37.5' },
        { place_name: '좌표 없음', x: '', y: 'abc' },
      ],
    };
    expect(parsePlaces(raw)).toEqual([
      { name: '강남역 2호선', address: '서울 강남구 강남대로 396', lat: 37.4979, lon: 127.0276 },
      { name: '주소만', address: '서울 어딘가', lat: 37.5, lon: 127.1 },
    ]);
  });
  it('엉뚱한 응답이면 빈 목록', () => {
    expect(parsePlaces(null)).toEqual([]);
    expect(parsePlaces({ errorType: 'NotAuthorizedError' })).toEqual([]);
  });
});

const step = (type: string, time: number, vehicle?: string) => ({
  properties: { type, time, distance: 100, vehicles: vehicle ? [{ type: '간선', name: vehicle }] : [] },
});

describe('parseTransit', () => {
  const raw = {
    status: 'OK',
    properties: { total: 2, landingURL: 'https://map.kakao.com/link/xyz' },
    routes: [
      { properties: { type: 'BUS', totalTime: 2700, transfers: 0 }, steps: [step('WALKING', 300), step('BUS', 2400, '472')] },
      {
        properties: { type: 'BUS_AND_SUBWAY', totalTime: 1990, transfers: 1 },
        steps: [step('WALKING', 240), step('BUS', 600, '472'), step('SUBWAY', 900, '2호선'), step('WALKING', 250)],
      },
    ],
  };
  it('가장 빠른 경로를 고르고 초를 분으로 올린다', () => {
    expect(parseTransit(raw)).toEqual({
      rideMin: 34, // 1990초
      walkMin: 8,
      transfers: 1,
      summary: '걷기 8분 → 버스 472 → 지하철 2호선',
      landingUrl: 'https://map.kakao.com/link/xyz',
    });
  });
  it('경로가 없거나 상태가 OK가 아니면 null', () => {
    expect(parseTransit({ status: 'NO_RESULTS' })).toBeNull();
    expect(parseTransit({ status: 'OK', routes: [] })).toBeNull();
    expect(parseTransit('오류')).toBeNull();
  });
  it('https가 아닌 주소는 버린다', () => {
    expect(parseTransit({ ...raw, properties: { landingURL: 'javascript:alert(1)' } })?.landingUrl).toBe('');
  });
});

describe('isValidCoord', () => {
  it('한국 근처만 통과', () => {
    expect(isValidCoord(37.5, 127)).toBe(true);
    expect(isValidCoord(0, 0)).toBe(false);
    expect(isValidCoord(NaN, 127)).toBe(false);
  });
});
