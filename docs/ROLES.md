# 역할 분담 v2: Claude Code 창 3개 (제때 명세 기준)

> 마감: 2026-11-26 오전 10시. **기준 문서가 바뀌었다.**
> - 명세: `docs/reference/jette-spec.md` (이하 "명세")
> - 동작 기준 프로토타입: `docs/reference/jaettae-prototype.html` (이하 "프로토타입"). 둘이 다르면 명세가 우선.
> - v1 분담(홈/약속 추가/기록 3화면)과 `docs/PRD.md`의 화면·요구사항은 **폐기**한다.

## 1. 이번 제출 범위 (2026-11-25 저녁에 넓힘)

처음에는 서버가 필요한 기능을 모두 뺐지만, 사용자 요청으로 아래를 넣었다. 최신 범위와 구현 상태는 `docs/PRD.md` 7.1이 기준이다.

**만든 것:** 명세 M0·M1(혼자 쓰는 핵심), Claude 기능(준비 도우미, 내 말투, 메모 분리), 카카오 장소 검색과 대중교통 시간, 준비 현황 링크 공유, 사진 공유 받기, 푸시 알림.

**만들지 않은 것:** 계정, 친구 목록과 약속 기록, 보호자-아이, 네이티브 앱. 웹이라 알람 소리는 화면이 열려 있을 때만 난다.

**A가 나중에 추가한 경로:** `api/**`, `supabase/**`, `src/features/share/**`, `src/features/shareTarget/**`, `src/features/push/**`, `src/infra/ai/**`, `src/infra/share/**`, `src/infra/shareTarget/**`, `src/infra/transit/**`, `src/infra/push/**`. 이 중 `src/features/share`, `shareTarget`, `push`의 화면은 동작용 기본 모양이라 디자인 담당이 목업에 맞춰 다시 입힌다(부르는 함수는 그대로 둔다).

## 2. 한눈에 보기

| 창 | 맡은 일 | 소유 경로(여기만 수정) |
|---|---|---|
| **A** (이 세션) | 설정 파일, 디자인 토큰·아이콘·공용 부품, 순수 계산(`domain`)과 테스트, 앱 상태(store)·저장·시계(시연 60배), 탭 껍데기, PWA, 통합, 배포, 문서 | 루트 설정 파일, `index.html`, `public/`, `src/domain/**`, `src/app/**`, `src/ui/**`, `src/infra/storage/**`, `docs/**`, `README.md` |
| **B** | 아침 진행 화면: ②기상 ③준비 ④출발 ⑤이동·도착·요약, 붉은 조명, 알람 소리·알림, 도착 위치 읽기 | `src/features/morning/**`, `src/infra/alarm/**`, `src/infra/geo/**` |
| **C** | 계획·기록 화면: ①오늘(일정·장소·단계·시간표 막대·날씨 카드·메모 입력줄), ⑥기록, 설정, ⑧알리기(말투), 날씨 불러오기 | `src/features/today/**`, `src/features/records/**`, `src/features/settings/**`, `src/features/notify/**`, `src/infra/weather/**` |

- 자기 소유 경로만 고친다. `src/domain`, `src/app`, `src/ui`에 필요한 것이 없으면 직접 만들지 말고 사용자에게 "A에게 전달: ○○ 필요"라고 남긴다.
- v1에서 만든 `src/features/home`, `appointment`, `history`는 A가 지운다. 건드리지 않는다.

## 3. 공용 계약 (A가 만들어 커밋함. B·C는 가져다 쓰기만)

실제 파일이 기준이다. 아래는 요약이고, 정확한 모양은 각 파일을 열어 본다.

```ts
// src/domain/types.ts — Settings, Place, Step, Plan(rideMin·waitMin 직접 입력), Session, StepLog, RecordRow,
//   MemoItem, Tone, RainChoice, HourWeather, WeatherResult, ChecklistItem, GeoResult, DEFAULT_SETTINGS, MIN, DAY

// src/domain/schedule.ts (명세 9.1)
computeSchedule({ arriveAt, rideMin, waitMin, buffer, prepMin, latency }): { leaveAt, prepStartAt, alarmAt, travelTotal };
calcPlan(plan, settings, records, places): PlanCalc | null;   // 화면은 보통 useApp().calc를 쓴다
// PlanCalc = { arriveAt, leaveAt, prepStartAt, alarmAt, travelTotal, steps, userPrep, prep, wake, ride, waitMin, buffer, place }
//   prep·wake·ride는 { val, n, basis } (추천값, 쓴 기록 수, 근거 문구)

// src/domain/recommend.ts (명세 9.3)
rec(userVal, arr): { val, n, basis };  usable(record);  recentValues(records, key, placeId?);  average(arr);  judgeArrival(diffMin);

// src/domain/session.ts — 진행 상태 판정
isGlowOn(session, now, preLeave);     // 보통 useApp().glow를 쓴다

// src/domain/message.ts (명세 9.6)
TONES;  buildMessage(tone, kind, { time?, min?, place? });
projArrive(session, now);  lateInfo(proj, arriveAt): { lateMin, isLate, etaText, lateN };
etaMessage(tone, session, now);  lateMessage(tone, session, now);  arriveMessage(tone, placeName, geo?);

// src/domain/weather.ts (명세 9.4) — 판정만. 불러오기는 C의 infra/weather
judgeWeather(hours: HourWeather[], settings): WeatherResult;   // C가 결과를 actions.setWeather로 넣는다

// src/domain/geo.ts (명세 9.5)
checkArrival(place, { lat, lon, accuracy }): GeoResult;  roundCoord(v, digits);

// src/domain/format.ts
fmtClock(ms)  fmtHMS(ms)  fmtMin(x)  fmtDay(ms)  toInputValue(ms)  fromInputValue(v)

// src/app/store.tsx — 상태와 동작. 저장(localStorage)은 안에서 처리한다
useApp(): {
  now: number;        // Date.now() 대신 반드시 이것을 쓴다(시연이면 60배)
  demo: boolean;
  settings; plan; places; memos; records; rain; weather; weatherCoord; tone; session;
  calc: PlanCalc | null;          // 지금 계획의 알람·준비·출발 시각
  checklist: ChecklistItem[];     // 내가 적은 것 + 날씨 항목. 체크 상태는 session.checked[key]
  glow: boolean;                  // 붉은 조명을 켤지
  actions: {
    // 계획·설정 (주로 C)
    updatePlan(p)  updateSettings(p)  savePlace(place)  removePlace(id)
    addMemos(text)  removeMemo(id)  toggleMemoPin(id)
    setRain(choice)  setWeather(result | null)  setWeatherCoord({lat, lon} | null)  setTone(p)
    toggleRecordExcluded(id)  removeRecord(id)  loadSampleData()  clearSampleData()  clearAllData()
    startDemo()  endDemo()
    arm()  cancelSession()        // 알람 켜기 / 끄기
    // 아침 진행 (주로 B)
    snooze()  startPrep()  completeStep()  skipStep()  finishEarly()
    toggleCheck(key)  depart()  arrive()  setGeo(geoResult)  skipArrival('early'|'ontime'|'late')
    saveRecord(excluded)
  };
};
// 알람·다시 울림 시각이 되면 store가 session.state를 'ringing'으로 바꾼다. B는 상태를 보고 소리만 낸다.
// 도착: B가 actions.arrive() → readPositionOnce() → checkArrival() → actions.setGeo() 순서로 부른다.

// src/ui — 공용 부품
<Icon name="wake|prep|leave|rain|umbrella|temp|bag|bell|clock|share|place|record|settings|check" main det size label />
<Card> <HeroCard dashed?> <Pill tone="chip|soft|accent|dark"> <PrimaryButton> <OutlineButton>
<StageBar current="wake|prep|leave" notes={{ wake: '14분' }} />
<FillBar segments={[{ ratio, tone: 'accent'|'gray'|'ink'|'light' }]} progress={0~1} label="설명" />
// 히어로 카드 안: className "ui-hero-label", "ui-hero-num"
// 색·모서리는 src/app/tokens.css의 CSS 변수만 쓴다. 색 값을 직접 쓰지 않는다
```

화면 내보내기(이름 고정, A의 탭 껍데기가 불러 쓴다):

| 파일 | 내보내는 이름 | 담당 |
|---|---|---|
| `src/features/morning/index.tsx` | `MorningFlow()` : `session`이 있을 때 전체 화면으로 뜬다. 상태(`ringing/snoozed/prep/check/travel/summary`)별 화면을 안에서 고른다 | B |
| `src/features/today/index.tsx` | `TodayScreen()` | C |
| `src/features/records/index.tsx` | `RecordsScreen()` | C |
| `src/features/settings/index.tsx` | `SettingsScreen()` | C |
| `src/features/notify/index.tsx` | `NotifyCard()` : ⑧알리기 카드. B가 ③④⑤ 화면에 끼워 넣는다 | C |
| `src/infra/weather/index.ts` | `fetchHourly(lat, lon, fromMs, toMs): Promise<HourWeather[]>` (1시간 캐시, 실패 10분) | C |
| `src/infra/alarm/index.ts` | `startAlarmSound()`, `stopAlarmSound()`, `notify(title, body)` | B |
| `src/infra/geo/index.ts` | `readPositionOnce(): Promise<{lat, lon, accuracy} | null>` (8초 제한, 좌표는 저장하지 않는다) | B |

## 4. 공통 규칙

- 먼저 `CLAUDE.md`, 이 문서, 명세의 자기 담당 절을 읽는다. 코드를 쓰기 전에 `ponytail` 스킬을 쓴다.
- 프로토타입의 동작을 옮겨 오되 구조는 이 프로젝트의 것을 따른다(계산은 `domain`, 화면에는 계산을 두지 않는다).
- 명세 16장 "하지 말 것"을 지킨다. 특히: 포인트 색은 라임 하나, 빨강은 붉은 조명에만, 이모지 금지, 줄무늬 막대 금지, 문구에 준비 단계 노출 금지, 자동 발송 금지, 비난하는 어조 금지.
- 문구는 한국어 해요체. 명세의 숫자는 예시 값이니 하드코딩하지 않는다.
- 접근성: 터치 44px, 대비 4.5:1, 아이콘 버튼에 `aria-label`, 색만으로 구분하지 않기, `prefers-reduced-motion`이면 애니메이션 끄기. 390px 기준, 360px에서도 가로 스크롤 없음.
- 파일 300줄, 함수 50줄 이하. 이름·코드는 영어, 주석·커밋·화면 문구는 한국어.
- 커밋은 `git add <내 경로>`로 자기 경로만. 메시지는 `[B 준비 화면] 요약`처럼. 커밋 전 `npm run typecheck`와 `npm run lint` 통과.
- **하지 않는 것:** push, 배포, 새 라이브러리 설치, 브랜치 변경, `git stash`·`git reset`, 다른 창의 경로 수정.
- 끝나면 **한 것 / 확인한 것 / 남은 것**을 짧게 보고한다.

## 5. 순서

| 단계 | A | B | C |
|---|---|---|---|
| 0 | 타입·토큰·아이콘·store 껍데기를 먼저 커밋(`[M0] 공용 계약`) | 명세 7.1 ②~⑤, 9.1, 9.10, 10장과 프로토타입 해당 부분 읽기. `infra/alarm`, `infra/geo`부터 | 명세 7.1 ①⑥, 7.5, 9.3, 9.4, 9.6, 9.9와 프로토타입 해당 부분 읽기. `infra/weather`부터 |
| 1 | 계산 함수 구현과 테스트(명세 15장 1~6번), store 동작 | ② → ③ → ④ → 붉은 조명 → ⑤ | ① → 설정 → ⑥ → ⑧ |
| 2 | 통합, 실행 확인, PWA, 접근성 점검 | 버그 수정 | 버그 수정 |
| 3 | README, 배포·push(사용자 승인 후) | — | — |
