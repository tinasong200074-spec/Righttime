# 역할 분담 v2: Claude Code 창 3개 (제때 명세 기준)

> 마감: 2026-11-26 오전 10시. **기준 문서가 바뀌었다.**
> - 명세: `docs/reference/jette-spec.md` (이하 "명세")
> - 동작 기준 프로토타입: `docs/reference/jaettae-prototype.html` (이하 "프로토타입"). 둘이 다르면 명세가 우선.
> - v1 분담(홈/약속 추가/기록 3화면)과 `docs/PRD.md`의 화면·요구사항은 **폐기**한다.

## 1. 이번 제출 범위 (마감 때문에 줄임)

**만든다 (명세 M0 + M1, 웹 PWA로):**
명세 7.1의 ①오늘 ②기상 ③준비 ④출발 ⑤이동·도착·요약 ⑥기록, 설정, 챙길 것 메모, ⑧약속 상대에게 알리기(말투 4종), 날씨 자동 추천(9.4), 도착 위치 확인(9.5), 붉은 조명(10장), 시연 모드(9.11), 디자인 시스템(8장).

**만들지 않는다:**
- 서버가 필요한 것 전부: 계정, 친구·방·링크 보기(M5·M6), 보호자-아이(M7), 대중교통 API(M3), Claude 호출(M4: 내 말투 만들기, 일정 준비 도우미, 메모 AI 분리), 공유창으로 받기(M8), 푸시
- 네이티브 알람. 웹이라 **앱 화면이 열려 있을 때만** 알람이 울린다(명세 9.10에 적힌 한계)
- 이동 시간은 **수동 입력**(이동 분 + 배차 대기 분). 메모 분리는 쉼표·줄바꿈 분리만
- 클라이언트에 API 키를 넣지 않는다. Open-Meteo는 키가 없어 브라우저에서 직접 부른다

## 2. 한눈에 보기

| 창 | 맡은 일 | 소유 경로(여기만 수정) |
|---|---|---|
| **A** (이 세션) | 설정 파일, 디자인 토큰·아이콘·공용 부품, 순수 계산(`domain`)과 테스트, 앱 상태(store)·저장·시계(시연 60배), 탭 껍데기, PWA, 통합, 배포, 문서 | 루트 설정 파일, `index.html`, `public/`, `src/domain/**`, `src/app/**`, `src/ui/**`, `src/infra/storage/**`, `docs/**`, `README.md` |
| **B** | 아침 진행 화면: ②기상 ③준비 ④출발 ⑤이동·도착·요약, 붉은 조명, 알람 소리·알림, 도착 위치 읽기 | `src/features/morning/**`, `src/infra/alarm/**`, `src/infra/geo/**` |
| **C** | 계획·기록 화면: ①오늘(일정·장소·단계·시간표 막대·날씨 카드·메모 입력줄), ⑥기록, 설정, ⑧알리기(말투), 날씨 불러오기 | `src/features/today/**`, `src/features/records/**`, `src/features/settings/**`, `src/features/notify/**`, `src/infra/weather/**` |

- 자기 소유 경로만 고친다. `src/domain`, `src/app`, `src/ui`에 필요한 것이 없으면 직접 만들지 말고 사용자에게 "A에게 전달: ○○ 필요"라고 남긴다.
- v1에서 만든 `src/features/home`, `appointment`, `history`는 A가 지운다. 건드리지 않는다.

## 3. 공용 계약 (A가 만든다. B·C는 가져다 쓰기만)

A가 커밋하기 전에는 아래 이름을 그대로 가정하고 화면을 짠다. 커밋 메시지 `[M0] 공용 계약`이 올라오면 실제 파일에 맞춘다.

```ts
// src/domain/types.ts — 명세 13장의 Settings, Place, Step, Plan, Session, StepLog, RecordRow, MemoItem, Tone 그대로

// src/domain/plan.ts (명세 9.1)
computeSchedule(input: { arriveAt: number; rideMin: number; waitMin: number; buffer: number;
  prepMin: number; latency: number }): { leaveAt: number; prepStartAt: number; alarmAt: number; travelTotal: number };
scaleSteps(steps: Step[], prepRec: number): Step[];          // 추천 반영 시 비례 조정
rollForward(arriveAt: number, now: number): number;           // 지난 일정 24시간 단위 이월

// src/domain/recommend.ts (명세 9.3)
rec(userVal: number, arr: number[]): { val: number; basis: string };
usable(r: RecordRow): boolean;
judgeArrival(arriveDiffMin: number): 'early' | 'ontime' | 'late';

// src/domain/message.ts (명세 9.6)
buildMessage(tone: Tone, kind: 'eta' | 'late' | 'maybe' | 'arrive',
  v: { time?: string; min?: number; place?: string }): string;
projArrive(session: Session, plan: Plan, travelMin: number, now: number): number;
lateInfo(proj: number, arriveAt: number): { lateMin: number; etaText: string; lateN: number };

// src/domain/weather.ts (명세 9.4) — 판정만. 불러오기는 C의 infra/weather
judgeWeather(hours: HourWeather[], settings: Settings): { umbrella: boolean; clothing?: string; line: string; items: MemoItem[] };

// src/domain/geo.ts (명세 9.5)
checkArrival(place: Place, pos: { lat: number; lon: number; accuracy: number }): { status: 'match' | 'mismatch'; dist: number };

// src/app/store.tsx — 상태와 동작. 저장(localStorage)은 A가 안에서 처리
useApp(): {
  now: number;                 // 시연 모드면 60배로 흐르는 시계. Date.now() 대신 반드시 이것을 쓴다
  demo: boolean;
  plan: Plan; settings: Settings; places: Place[]; memos: MemoItem[]; records: RecordRow[];
  session: Session | null;
  schedule: { leaveAt: number; prepStartAt: number; alarmAt: number; travelTotal: number };
  actions: {
    updatePlan(p: Partial<Plan>): void; updateSettings(s: Partial<Settings>): void;
    savePlace(p: Place): void; removePlace(id: string): void;
    addMemos(text: string): void; removeMemo(id: string): void; toggleMemoPin(id: string): void;
    arm(): void;               // 알람 켜기
    snooze(): void; startPrep(): void; completeStep(): void; skipStep(): void;
    depart(): void; arrive(geo?: Session['geo']): void; skipArrival(arrival: 'early'|'ontime'|'late'): void;
    saveRecord(excluded: boolean): void; cancelSession(): void;
    setDemo(on: boolean): void; loadSampleData(): void; clearAllData(): void;
  };
};

// src/ui — 공용 부품(A)
<Icon name="wake|prep|leave|rain|umbrella|temp|bag|bell|clock|share|friend|place|record|photo|check" main det size />
<HeroCard> <Pill> <PrimaryButton> <OutlineButton> <StageBar stage="wake|prep|leave" /> <FillBar segments progress />
// 색·모서리·글꼴은 src/app/tokens.css의 CSS 변수(--ground, --surface, --ink, --muted, --line, --chip, --empty, --on-dark, --accent, --accent-soft, --glow-red)만 쓴다. 색 값을 직접 쓰지 않는다
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
