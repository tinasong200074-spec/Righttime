import type { GeoResult, Place } from './types';

const EARTH_R = 6_371_000;
const ACCURACY_CAP_M = 100;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(q));
}

// 거리와 판정만 돌려준다. 읽은 좌표는 어디에도 남기지 않는다(명세 9.5)
export function judgeDistance(distM: number, radiusM: number, accuracyM: number): GeoResult {
  const status = distM <= radiusM + Math.min(accuracyM, ACCURACY_CAP_M) ? 'match' : 'mismatch';
  return { status, dist: Math.round(distM / 10) * 10 };
}

export function checkArrival(place: Place, pos: { lat: number; lon: number; accuracy: number }): GeoResult {
  if (!place.geo) return { status: 'none' };
  return judgeDistance(distanceM(place.geo.lat, place.geo.lon, pos.lat, pos.lon), place.geo.r, pos.accuracy);
}

// 저장할 좌표는 소수 넷째 자리(약 11m), 날씨용은 둘째 자리(약 1km)로 줄인다
export const roundCoord = (v: number, digits: number) => Number(v.toFixed(digits));
