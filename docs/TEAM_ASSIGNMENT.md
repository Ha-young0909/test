# 팀 업무 분담

약속 장소 투표 지도 (해커톤, 팀 4명 기준, 1~2일). 담당자는 GitHub Issue의 Assignee가 기준이다.
브랜치는 CLAUDE.md 규칙대로 **1 브랜치 = 1 담당자**이며, 아래 "소유 파일"만 수정한다.
기능 정의는 CLAUDE.md의 "서비스 정의", 화면 시안은 README의 "디자인 시안"을 본다.

## 한눈에 보기

| 역할 | 라벨 | 브랜치 | 한 줄 요약 |
| --- | --- | --- | --- |
| A. 기반·방 흐름 | `A-기반` | `feat/room-core` | 스키마·타입·Supabase 클라이언트·방장 첫 화면·방/참여자 API·방 화면 뼈대·CI·배포·데모 시드 |
| B. 출발지·지도 | `B-지도` | `feat/map-origin` | 카카오 장소 검색, 출발지 입력 UI, 현재 위치, 지도 컴포넌트(참여자·후보 역 핀) |
| C. 중간 지점 엔진 | `C-중간지점` | `feat/midpoint` | 후보 역(지하철) 검색, 직선거리 이동 시간 추정, 실시간 순위 재계산, 폴백 |
| D. 역 투표·마감 | `D-투표` | `feat/places-vote` | 역 카드 부가 정보(맛집·갈만한 곳), 중복 투표, 마감 시간, 실시간 결과 |

3명이면 B를 A에 합친다(A는 방 흐름 → 출발지 입력 순으로 진행).

## 역할별 상세

### A. 기반·방 흐름 (`feat/room-core`)

가장 먼저 시작하며, 나머지 세 명이 의존하는 계약(스키마·타입·API 형태)을 **첫 1~2시간 안에 master에 머지**한다. DB 스키마 설계는 Opus 권장.

- `supabase/schema.sql`: `rooms`(모임 이름 `name`, 상태 `collecting`·`voting`·`closed`, 마감 시각 `vote_deadline`), `participants`, `candidates`(역 종류 `subway`·`bus`), `travel_times`(이용 노선 포함), `votes`(참여자 × 후보 역 한 행씩), RLS는 "방 ID를 아는 사람만" 수준으로 단순하게
- `src/lib/supabase/client.ts`, `server.ts`, 공용 타입 `src/types/index.ts`
- **방장 첫 화면**(`CreateRoomForm`): 모임 이름 입력 + 링크 공유 → 방 생성 → `/room/[id]` 이동. 링크로 들어온 참여자는 이 화면을 거치지 않는다.
- 닉네임 입력과 참여자 등록, 참여자·방장 ID의 브라우저 저장
- `/room/[id]` 뼈대: 모임 이름 → 내 출발지 → 참여자 지도 순서. 방 화면과 투표 화면을 상태(`rooms.status`)로 전환. 참여자 2~6명 제한
- `.env.example` 갱신, `.gitignore` 확인, GitHub Actions CI(lint·build·test), Vercel 배포
- **데모 방 시드**(참여자 3명 채워진 방)와 README에 접근 제어 한계 명시

완료 기준: 방장 첫 화면에서 방을 만들고 → 링크 접속 → 닉네임 등록까지 동작, 스키마·타입이 master에 있음, Vercel 배포 URL 존재.

### B. 출발지·지도 (`feat/map-origin`)

- `GET /api/places/search?q=`: 카카오 로컬 API 주소·장소 검색 (서버 전용 `KAKAO_REST_API_KEY`)
- 출발지 검색 UI(자동완성 목록 → 선택), "현재 위치 사용" 보조 버튼, 선택한 좌표를 참여자에 저장
- `src/components/Map.tsx`: 카카오 지도 JS SDK. 참여자 핀(이니셜), 후보 역 번호 핀(1순위 강조)을 props로 받아 그린다. 후보가 바뀌면 핀이 갱신된다. C·D는 이 컴포넌트를 쓰기만 한다.

완료 기준: 검색해서 고른 출발지가 참여자 행에 저장되고, 지도에 참여자 핀이 보인다. 위치 권한 거부·검색 결과 없음 처리.

### C. 중간 지점 엔진 (`feat/midpoint`)

- `POST /api/rooms/[id]/midpoint`: 참여자 평균 좌표 → 주변 **지하철역(카카오 카테고리 검색)** 최대 8개 → 후보마다 모든 참여자의 이동 시간을 **직선거리로 추정** (ODsay는 쓰지 않기로 결정, 버스 정류장 후보는 보류)
- 참여자가 출발지를 등록·변경할 때마다 다시 계산할 수 있어야 한다(방 화면이 호출하거나 재조회). 1순위가 바뀌었는지 응답에 포함한다.
- 순위: 최대 이동 시간이 최소인 후보가 1순위, 평균 시간 병기. 순수 함수로 분리해 단위 테스트 작성
- 폴백: API 실패·한도 초과 시 평균 좌표 방식으로 대체하고 응답에 `approximate: true` → UI에 "대략적인 중간 지점" 표시
- 90분 초과자 경고 플래그, 후보 0곳이면 반경 확대 재검색
- 서버 전용 키: `KAKAO_REST_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

완료 기준: 참여자 2~6명으로 호출하면 순위가 매겨진 지하철역 목록이 노선 정보와 함께 반환되고, 카카오 검색이 실패하면 평균 좌표 폴백으로 동작한다.

### D. 역 투표·마감 (`feat/places-vote`)

- 역 카드 부가 정보 `POST /api/rooms/[id]/places`: 후보 역마다 근처 유명 맛집 2곳(종류·별점·도보 시간)과 갈만한 곳 2곳(카페·공원·쇼핑·전시 등)을 `candidates`에 저장. 카카오 로컬 API는 별점이 없으므로 출처를 정하고, 정해질 때까지 데모 시드·목 데이터를 쓴다.
- 역 카드 UI(`VotePanel`): 순위, 지하철 노선, 내 이동 시간(직선거리 추정)과 평균 시간(최장은 카드에 표시하지 않음), 맛집·갈만한 곳, 투표 버튼. (버스 후보는 보류라 지하철만 표시).
- 투표 `POST /api/rooms/[id]/vote` `{ participantId, candidateId, on }`: 여러 역에 중복 투표, 같은 역을 다시 누르면 취소
- 마감 `POST /api/rooms/[id]/deadline`(방장만): 30분·1시간·3시간·하루 설정, 즉시 마감, 다시 열기. 마감 여부는 서버가 `vote_deadline`으로 판단하고, 마감 후 투표 요청은 거부한다.
- 결과 화면(`ResultView`): 득표 수 실시간 반영(Supabase Realtime, 어려우면 3~5초 재조회), 마감되면 최다 득표 역 확정(동률이면 순위 높은 역), 후보 번호와 지도 핀 번호 일치
- 일반 참여자 화면에는 설정 버튼 없이 남은 시간만 보인다.

완료 기준: 휴대폰 3대에서 투표하면 서로의 표가 몇 초 안에 반영되고, 방장이 마감하면 모두의 투표 버튼이 막힌다.

## 계약 (먼저 합의하고 머지)

| 경로 | 담당 | 요청 → 응답 |
| --- | --- | --- |
| `POST /api/rooms` | A | `{ name?, category? }` → `{ roomId, hostId }` |
| `POST /api/rooms/[id]/participants` | A | `{ nickname, lat, lng, label }` → `{ participantId }` |
| `GET /api/places/search?q=` | B | → `{ results: { name, address, lat, lng }[] }` |
| `POST /api/rooms/[id]/midpoint` | C | `{ hostId }` → `{ stations: { name, kind: "subway" \| "bus", lines, lat, lng, maxMinutes, avgMinutes, over90, routes: { participantId, route, minutes }[] }[], approximate }` |
| `POST /api/rooms/[id]/places` | D | `{ hostId }` → `{ candidates }` (맛집·갈만한 곳 포함) |
| `POST /api/rooms/[id]/vote` | D | `{ participantId, candidateId, on }` → `{ ok }` |
| `POST /api/rooms/[id]/deadline` | D | `{ hostId, minutes? , closeNow?, reopen? }` → `{ voteDeadline, status }` |

A가 위 형태를 `src/types/index.ts`에 타입으로 먼저 올린다. C·D는 A의 API가 머지되기 전에는 목 데이터로 개발한다.

## 파일 소유 (충돌 방지)

| 담당 | 소유 경로 |
| --- | --- |
| A | `supabase/`, `src/lib/supabase/`, `src/types/`, `src/app/page.tsx`, `src/components/CreateRoomForm.tsx`, `src/components/RoomView.tsx`, `src/components/JoinForm.tsx`, `src/app/room/[id]/page.tsx`, `src/app/api/rooms/route.ts`, `src/app/api/rooms/[id]/route.ts`, `src/app/api/rooms/[id]/participants/`, `.github/`, `.env.example` |
| B | `src/app/api/places/`, `src/components/Map.tsx`, `src/components/OriginSearch.tsx` |
| C | `src/app/api/rooms/[id]/midpoint/`, `src/lib/midpoint/` |
| D | `src/app/api/rooms/[id]/places/`, `src/app/api/rooms/[id]/vote/`, `src/app/api/rooms/[id]/deadline/`, `src/components/VotePanel.tsx`, `src/components/ResultView.tsx` |

`RoomView`에 B·C·D의 컴포넌트를 붙이는 작업은 A가 각자의 PR이 머지될 때마다 연결한다. 공용 파일을 고쳐야 하면 담당자에게 요청한다.

## 일정

| 시점 | A | B | C | D |
| --- | --- | --- | --- | --- |
| 0~2시간 | 스키마·타입·클라이언트 머지 | 검색 API, 지도 컴포넌트 | API 키 확인, 버스 정류장 검색 가능 여부 확인, 순위 함수와 테스트 | 투표 API와 역 카드 UI(목 데이터) |
| 2~8시간 | 방장 첫 화면·참여자 등록·방 화면 | 출발지 UI, 현재 위치 | 후보 역 검색, 직선거리 시간 추정 | 중복 투표, 맛집·갈만한 곳, 실시간 반영 |
| 다음 날 오전 | 통합 연결, CI, 배포 | 후보 역 핀 연결 | 실시간 재계산, 폴백·경고·반경 확대 | 마감 시간, 결과 화면 |
| 데모 전 | 데모 시드, 휴대폰 3대 리허설, README | 지도 예외 처리 | 한도 초과 대비 | 투표 동시성·마감 확인 |

## 공통 규칙 (CLAUDE.md 요약)

- `master` 최신화 후 `feat/`·`fix/`·`docs/`·`refactor/` 브랜치를 만든다. master 직접 push 금지, PR 승인 1명 + CI 통과 후 Squash and Merge.
- 커밋 제목은 `유형: 한 줄 요약`. 작게 자주 커밋한다.
- 머지 전에 `npm run build`와 `npm run dev`로 확인하고, 기능과 함께 테스트를 작성한다.
- 키는 `.env.local`에만 둔다. `NEXT_PUBLIC_` 값은 브라우저에 노출되므로 서버 전용 키(`KAKAO_REST_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)를 클라이언트 코드에서 읽지 않는다.
- 기능 하나가 끝나면 새 세션에서 다음 작업을 시작한다.
- Next.js 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 확인한다.
