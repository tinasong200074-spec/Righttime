# 역할 분담: Claude Code 창 3개

> 마감: 2026-11-26 오전 10시. 기준 문서는 `docs/PRD.md`(요구사항 R01~R10)다.
> **창 A = 이 세션(뼈대·계산 로직·통합·배포)**, **창 B = 홈 화면**, **창 C = 약속 추가·기록 화면**.

## 1. 한눈에 보기

| 창 | 맡은 일 | 소유 경로(여기만 수정) | 요구사항 |
|---|---|---|---|
| **A** | 프로젝트 뼈대, 공용 자료형·계산 로직(테스트 먼저), 앱 껍데기(탭), PWA, 통합, QA, 배포, README, push | `package.json`, 설정 파일, `index.html`, `public/`, `src/domain/**`, `src/app/**`, `README.md`, `docs/**` | R01, R08(저장 규칙), R09, R10 점검 |
| **B** | 홈 화면(S01): 남은 시간 시각화, 단계 상태, 단계적 알림, 한 줄 알림 보내기 | `src/features/home/**`, `src/infra/notify/**` | R03, R04, R05 |
| **C** | 약속 추가(S02), 기록(S03), 로컬 저장 | `src/features/appointment/**`, `src/features/history/**`, `src/infra/storage/**` | R02, R06, R07, R08 |

**원칙:** 자기 소유 경로만 고친다. 다른 창의 경로를 고치고 싶으면 그 창에 전할 내용을 사용자에게 남긴다. `src/domain/**`은 A만 고친다. 필요한 함수가 없으면 A에게 요청한다(아래 계약을 먼저 쓴다).

## 2. 순서

| 단계 | A | B | C |
|---|---|---|---|
| **0. 뼈대** (A가 끝내고 커밋하면 시작) | 뼈대 설치(승인 필요), `types.ts`·계산 함수 껍데기·테스트 | 대기. PRD와 이 문서를 읽고 화면 구상 | 대기. PRD와 이 문서를 읽고 화면 구상 |
| **1. 화면 병렬** | 계산 로직 구현·테스트, 앱 탭 껍데기 | S01 구현 | S02, S03, 저장 구현 |
| **2. 통합** | 세 쪽 합치기, 실행 확인, QA, 접근성 점검 | 버그 수정 | 버그 수정 |
| **3. 제출** | README, 배포(승인 후), push(승인 후) | — | — |

## 3. 공용 계약 (A가 `src/domain`에 만든다. B와 C는 이 모양으로만 쓴다)

```ts
// src/domain/types.ts
export interface Appointment {
  id: string;
  title: string;            // 비어 있을 수 있음
  appointmentAt: string;    // ISO 문자열
  travelMin: number;        // 이동 시간(분)
  prepMin: number;          // 준비 시간(분), 기본 30
  bufferMin: number;        // 여유(분), 기본 10
}
export interface ArrivalRecord {
  appointmentId: string;
  title: string;
  appointmentAt: string;
  lateMin: number;          // 제시간 0, 일찍 와도 0
  recordedAt: string;
}
export type Phase = 'relaxed' | 'prepare' | 'soon' | 'leaveNow' | 'late';

// src/domain/schedule.ts
computeTimes(a: Appointment): { departAt: Date; prepStartAt: Date };
minutesUntilDeparture(a: Appointment, now: Date): number;   // 지나면 음수
getPhase(a: Appointment, now: Date): Phase;
getNextAppointment(list: Appointment[], now: Date): Appointment | undefined;

// src/domain/escalation.ts
getEscalationLevel(minLeft: number): 0 | 1 | 2 | 3 | 4;       // 30·15·5·0분 전에 1·2·3·4

// src/domain/message.ts
buildShareMessage(kind: 'departed' | 'late', lateMin?: number): string;

// src/domain/stats.ts
countSevereLate(records: ArrivalRecord[], now: Date, sinceDays?: number): number; // 10분 이상
```

```ts
// src/infra/storage/index.ts  (C가 만든다. B가 읽기만 쓴다)
loadAppointments(): Appointment[];
saveAppointment(a: Appointment): void;
loadRecords(): ArrivalRecord[];
saveRecord(r: ArrivalRecord): void;
```

### 3-1. 화면 내보내기 계약 (뼈대에 자리 표시 파일을 이미 커밋해 둠. 자기 파일로 교체하되 이름은 유지)

| 파일 | 내보내는 이름 | 담당 |
|---|---|---|
| `src/features/home/index.tsx` | `HomeScreen()` | B |
| `src/features/appointment/index.tsx` | `AppointmentScreen({ onSaved })` (저장 뒤 `onSaved()` 호출) | C |
| `src/features/history/index.tsx` | `HistoryScreen()` | C |
| `src/infra/storage/index.ts` | `loadAppointments` `saveAppointment` `loadRecords` `saveRecord` | C |

- 공용 상수와 자료형: `src/domain/types.ts`(`DEFAULT_PREP_MIN`, `DEFAULT_BUFFER_MIN` 포함). 공용 색·간격은 `src/app/app.css`의 CSS 변수(`--accent` 등)를 쓴다.
- 확인 명령: `npm test`, `npm run typecheck`, `npm run lint`, `npm run dev`. 커밋 전에 앞의 세 개가 통과해야 한다.

## 4. 공통 규칙 (세 창 모두)

- 작업 전에 `CLAUDE.md`와 `docs/PRD.md`를 읽는다. 코드를 쓰기 전에 `ponytail` 스킬을 쓴다.
- 이름·코드는 영어, **주석·커밋·화면 문구는 한국어**. 화면 문구는 쉬운 말.
- 파일은 300줄 넘기지 않는다. 함수는 50줄 이하.
- 의존은 안쪽으로만: `domain` ← `features` ← `infra`. `domain`은 화면·저장을 모른다.
- **커밋은 자기 경로만** `git add <내 경로>`로 한다. 메시지는 `[화면 이름] 요약` 한국어. **push·배포·새 라이브러리 설치는 하지 않는다.** 필요하면 사용자에게 묻는다.
- 같은 폴더를 함께 쓰므로 브랜치를 바꾸거나 `git stash`, `git reset`을 쓰지 않는다.
- 접근성(R10): 색에만 의존하지 않기, 터치 영역 44px 이상, 360px 폭에서 가로 스크롤 없기.
- 끝나면 사용자에게 **한 것 / 확인한 것 / 남은 것**을 짧게 보고한다.

## 5. 창 B, 창 C에 붙여넣을 시작 문구

### 창 B (홈 화면)
```
너는 Righttime 프로젝트의 창 B다. 폴더는 C:\dev\Hackerthon.
먼저 CLAUDE.md, docs/PRD.md, docs/ROLES.md를 읽어라.
너의 일은 홈 화면(S01)이다: 요구사항 R03(남은 시간 시각화), R04(단계적 알림), R05(출발했어요/늦을 것 같아요 한 줄 알림).
수정할 수 있는 경로: src/features/home/**, src/infra/notify/** 뿐이다. 다른 경로는 고치지 마라.
src/domain의 함수는 docs/ROLES.md 3장의 계약대로 가져다 쓰기만 하고 고치지 마라. 아직 없으면 A(다른 창)가 뼈대를 커밋할 때까지 화면 구상과 notify부터 해라.
저장소는 C 창이 만드는 src/infra/storage를 읽기만 써라.
git add는 네 경로만, push와 새 라이브러리 설치는 하지 마라.
```

### 창 C (약속 추가·기록)
```
너는 Righttime 프로젝트의 창 C다. 폴더는 C:\dev\Hackerthon.
먼저 CLAUDE.md, docs/PRD.md, docs/ROLES.md를 읽어라.
너의 일은 약속 추가(S02), 기록(S03), 로컬 저장이다: 요구사항 R02(입력 4칸 이하, 마지막 입력값을 기본값으로), R06(도착 기록 2탭), R07(10분 이상 지각 통계), R08(localStorage).
수정할 수 있는 경로: src/features/appointment/**, src/features/history/**, src/infra/storage/** 뿐이다. 다른 경로는 고치지 마라.
src/domain의 함수와 자료형은 docs/ROLES.md 3장의 계약대로 가져다 쓰기만 하고 고치지 마라. 아직 없으면 A(다른 창)가 뼈대를 커밋할 때까지 storage 구현과 화면 구상부터 해라.
git add는 네 경로만, push와 새 라이브러리 설치는 하지 마라.
```

## 6. A가 확인할 통합 체크리스트
- [ ] 뼈대에서 `npm run dev`가 뜨고 세 화면 탭이 이동한다
- [ ] R01 예시(18:00 약속, 이동 40, 여유 10 → 출발 17:10)가 테스트로 통과한다
- [ ] 약속 추가 → 홈 카운트다운 → 도착 기록 → 통계가 이어진다
- [ ] 새로고침 후에도 데이터가 남는다
- [ ] 360px 폭, 오프라인에서 열림 확인
- [ ] 배포 전 사용자 승인, push 전 사용자 승인
