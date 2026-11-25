import type { ChecklistItem, HourWeather, MemoItem, RainChoice, Settings, WeatherResult } from './types';

const RAIN_SUM_MM = 0.5;
const VERY_COLD_C = 3;

// WMO 날씨 코드 중 비·눈 계열(명세 9.4)
const WET_RANGES: Array<[number, number]> = [
  [51, 57],
  [61, 67],
  [71, 77],
  [80, 82],
  [85, 86],
  [95, 99],
];
const isWetCode = (code: number) => WET_RANGES.some(([a, b]) => code >= a && code <= b);

const nums = (arr: Array<number | null>) => arr.filter((v): v is number => typeof v === 'number');

function clothingFor(minT: number | null, maxT: number | null, s: Settings): WeatherResult['cloth'] {
  if (minT !== null && minT <= VERY_COLD_C)
    return { text: '두꺼운 외투', ask: `체감 ${Math.round(minT)}°C예요. 두꺼운 외투 챙겼어?` };
  if (minT !== null && minT <= s.coldTh) return { text: '겉옷', ask: `체감 ${Math.round(minT)}°C예요. 겉옷 챙겼어?` };
  if (maxT !== null && maxT >= s.hotTh)
    return { text: '물과 얇은 옷', ask: `체감 ${Math.round(maxT)}°C예요. 물과 얇은 옷 챙겼어?` };
  return undefined;
}

function summaryLine(rain: boolean, prob: number, minT: number | null, maxT: number | null, s: Settings): string {
  const cold = minT !== null && minT <= s.coldTh;
  const hot = !cold && maxT !== null && maxT >= s.hotTh;
  const mood = cold ? (rain ? '춥고 비가 와요' : '쌀쌀해요') : hot ? (rain ? '덥고 비가 와요' : '더워요') : rain ? '비가 와요' : '날씨가 괜찮아요';
  const temp = cold ? minT : hot ? maxT : (minT ?? maxT);
  const parts = [mood];
  if (temp !== null) parts.push(`체감 ${Math.round(temp)}°C`);
  parts.push(`비 ${prob}%`);
  return parts.join(' · ');
}

// 출발~도착 시간대의 시간별 예보를 받아 우산·옷차림을 판정한다. 기준값은 임의 규칙
export function judgeWeather(hours: HourWeather[], settings: Settings): WeatherResult {
  if (hours.length === 0) return { ok: false, rain: false, prob: 0, minT: null, maxT: null, line: '' };
  const probs = nums(hours.map((h) => h.prob));
  const temps = nums(hours.map((h) => h.apparent));
  const prob = probs.length ? Math.max(...probs) : 0;
  const precipSum = nums(hours.map((h) => h.precip)).reduce((a, b) => a + b, 0);
  const rain = prob >= settings.rainTh || precipSum >= RAIN_SUM_MM || nums(hours.map((h) => h.code)).some(isWetCode);
  const minT = temps.length ? Math.min(...temps) : null;
  const maxT = temps.length ? Math.max(...temps) : null;
  return {
    ok: true,
    rain,
    prob,
    minT,
    maxT,
    cloth: clothingFor(minT, maxT, settings),
    line: summaryLine(rain, prob, minT, maxT, settings),
  };
}

// 챙길 것 = 내가 적은 것 + 날씨 항목. 직접 고른 비 설정이 자동보다 우선한다
export function buildChecklist(
  memos: MemoItem[],
  rain: RainChoice,
  weather: WeatherResult | null,
  settings: Settings,
): ChecklistItem[] {
  const out: ChecklistItem[] = memos.map((m) => ({ key: m.id, text: m.text, ask: m.ask, src: 'user' }));
  const auto = rain === 'auto' && settings.weatherAuto && weather?.ok ? weather : null;
  if (rain === 'yes') out.push({ key: 'rain', text: '우산', ask: '비 와요. 우산 챙겼어?', src: 'weather' });
  else if (rain === 'maybe') out.push({ key: 'rain', text: '우산', ask: '비 올 수도 있어요. 우산 챙겼어?', src: 'weather' });
  else if (auto?.rain)
    out.push({ key: 'rain', text: '우산', ask: `비 예보가 있어요 (강수 확률 ${auto.prob}%). 우산 챙겼어?`, src: 'weather' });
  if (auto?.cloth) out.push({ key: 'cloth', text: auto.cloth.text, ask: auto.cloth.ask, src: 'weather' });
  return out;
}

const MEMO_MAX = 10;
const MEMO_TEXT_MAX = 40;

// 쉼표·줄바꿈으로 나눈다(AI 분리는 서버가 필요해서 이번 범위 밖)
export function splitMemoText(text: string): Array<{ text: string; ask: string }> {
  return text
    .split(/[,，、\n]|그리고|및/)
    .map((s) => s.trim().slice(0, MEMO_TEXT_MAX))
    .filter(Boolean)
    .slice(0, MEMO_MAX)
    .map((s) => ({ text: s, ask: `${s} 챙겼어?` }));
}
