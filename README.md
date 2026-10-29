# 약속 장소 투표 지도

친구들의 출발지를 모아 **대중교통 이동 시간 기준 중간 지점(지하철역·버스 정류장)** 을 찾고, 근처 맛집과 갈만한 곳을 보면서 **역에 투표해 약속 장소를 정하는** 웹 서비스입니다. (해커톤 프로젝트)

> 개발 중입니다. 방장 첫 화면(모임 이름 + 링크 공유), 방 만들기, 닉네임 참여까지 구현되었고 나머지는 목표로 하는 기능입니다. 진행 상황은 GitHub Issue를 보세요.

## 주요 기능

1. **방장 첫 화면**: 모임 이름을 정하고 "링크 공유하기"를 누르면 방이 만들어지고 초대 링크가 공유됩니다. 링크로 들어온 친구는 이 화면 없이 바로 방 화면으로 들어옵니다.
2. **출발지 입력**: 방 화면 위에서부터 모임 이름, 내 출발지 검색창, 친구들 출발지가 찍힌 지도가 보입니다. 주소·장소 검색이 기본이고 "현재 위치 사용"도 가능합니다. 로그인 없이 닉네임만 있으면 됩니다.
3. **실시간 중간 지점**: 친구가 출발지를 등록할 때마다 후보 역 순위와 지도 핀이 바뀝니다. 가장 오래 걸리는 사람의 시간이 가장 짧은 후보가 1순위입니다.
4. **역 투표**: 후보는 지하철역과 버스 정류장입니다. 카드마다 내가 타는 노선·버스와 내 이동 시간, 평균 시간, 근처 유명 맛집(별점), 역 근처 갈만한 곳이 보입니다. 여러 역에 중복 투표할 수 있고 다시 누르면 취소됩니다.
5. **투표 마감**: 방장이 마감 시간(30분·1시간·3시간·하루)을 정하거나 바로 마감합니다. 마감되면 최다 득표 역이 확정됩니다.

대중교통 API 실패나 한도 초과 시에는 참여자 평균 좌표를 기준으로 "대략적인 중간 지점"을 안내합니다. 참여자는 2~6명이며, 이동 시간이 90분을 넘는 사람이 있으면 경고만 표시합니다.

## 기술 스택

- Next.js (App Router), React, TypeScript, Tailwind CSS
- Supabase (데이터 저장, 실시간 반영)
- 카카오 로컬 API, 카카오 지도 JavaScript SDK
- ODsay 대중교통 API
- 배포: Vercel

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사해 `.env.local`을 만들고 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 이름 | 용도 | 공개 범위 |
| --- | --- | --- |
| `KAKAO_REST_API_KEY` | 장소·역 검색 | 서버 전용 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 지도 표시 | 브라우저 공개 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 주소 | 브라우저 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개용 키 | 브라우저 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버에서 캐시 저장 | 서버 전용 |
| `ODSAY_API_KEY` | 대중교통 이동 시간 | 서버 전용 |

- `.env.local`은 Git에 커밋되지 않습니다. 키 값을 코드나 커밋, 채팅에 넣지 마세요.
- 카카오 지도를 쓰려면 카카오 디벤로퍼스 앱 설정에 사용할 도메인(예: `http://localhost:3000`)을 등록해야 합니다.

### 3. Supabase 준비

Supabase 프로젝트를 만들고 SQL Editor에서 아래 순서로 실행합니다.

1. [`supabase/schema.sql`](supabase/schema.sql): 테이블, RLS, 참여자 6명 제한 트리거
2. [`supabase/seed.sql`](supabase/seed.sql): 참여자 3명이 채워진 "데모 방" (홈의 "데모 방 둘러보기" 링크가 가리킴)

이미 이전 스키마로 만든 프로젝트라면 모임 이름 컬럼을 추가해야 합니다.

```sql
alter table rooms add column if not exists name text check (char_length(name) between 1 and 20);
grant select (name) on rooms to anon;
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

### 5. 빌드와 검사

```bash
npm run build
npm run lint
npm test
```

## 접근 제어의 한계

로그인이 없으므로 접근 제어는 **"방 ID(uuid)를 아는 사람만 그 방을 쓴다"** 수준의 단순한 방식입니다.

- 방 링크를 아는 사람은 누구나 참여자 목록을 읽고, 참여하고, 투표할 수 있습니다.
- 모든 쓰기는 서버(Route Handler)가 service role 키로 처리하고, 브라우저(anon 키)는 읽기만 가능합니다.
- 다만 anon 읽기 정책은 방 ID를 몰라도 테이블 전체를 조회할 수 있습니다. 민감한 정보(실명, 정확한 집 주소 등)를 입력하지 마세요.
- 방장 권한 토큰(`rooms.host_id`)만은 anon에게 열지 않으며, 방을 만든 브라우저의 localStorage에 저장됩니다. 브라우저 저장소를 지우면 방장 권한(링크 공유, 마감 시간 설정)을 잃습니다.
- 참여자는 가입할 때 비밀 토큰(`participants.token`)을 받아 localStorage에 저장하고, 출발지 저장·투표 같은 쓰기 요청은 `participantId`와 함께 이 토큰을 보내야 합니다. 토큰은 방장 토큰처럼 anon에게 열지 않으므로, 목록에서 ID가 보여도 남의 출발지를 바꾸거나 대신 투표할 수 없습니다.
- 참여자 ID도 localStorage에 저장되므로, 다른 기기에서 같은 방에 들어오면 새 참여자로 가입해야 합니다.
- 투표 마감은 서버가 저장된 마감 시각으로 판단합니다. 브라우저 시계는 믿지 않습니다.

## 디자인 시안

`/design`으로 만든 비공개 시안입니다. 시안 속 닉네임·역·이동 시간·맛집·별점은 모두 시연용 가짜 값입니다.

- 첫 화면과 출발지 입력: https://claude.ai/artifact/X2Z3ogYJsnT4eTS3SY6QMF
- 실시간 중간 지점, 역 투표, 마감 시간: https://claude.ai/artifact/CeJLKPz3CatxwHgwi71oXc

## 배포 (Vercel)

1. GitHub 저장소를 Vercel에 연결하고, 위 환경변수 6개를 Vercel 프로젝트 설정에 입력합니다.
2. `master`에 병합되면 자동 배포됩니다. 카카오 디벤로퍼스에 배포 도메인을 등록하는 것을 잊지 마세요.

## 폴더 구조

```
src/
  app/          페이지와 라우트 (App Router)
  components/   재사용 UI 컴포넌트
  lib/          Supabase 클라이언트, 검증, 브라우저 저장소 헬퍼
  types/        팀 공용 타입과 API 계약
supabase/       schema.sql, seed.sql
docs/           프로젝트 문서 (TEAM_ASSIGNMENT.md: 역할별 담당·소유 파일·일정)
```

## 협업 규칙

브랜치 전략, 커밋 메시지 컨벤션, PR 규칙은 [CLAUDE.md](CLAUDE.md)를 따르고, 역할별 업무는 [docs/TEAM_ASSIGNMENT.md](docs/TEAM_ASSIGNMENT.md)와 GitHub Issue(`A-기반` · `B-지도` · `C-중간지점` · `D-투표` 라벨)에서 확인합니다.

- `master`는 항상 배포 가능한 상태를 유지하며, **직접 push하지 않고** PR로만 병합합니다.
- 브랜치 이름: `feat/기능명`, `fix/버그명`, `docs/문서명`, `refactor/개선명`. **1 브랜치 = 1 담당자**입니다.
- 작업 흐름: `master` 최신화 → 작업 브랜치 생성 → 작게 자주 커밋·push → PR 작성 → CI 통과와 팀원 1명 이상 승인 → Squash and Merge
- 커밋 제목: `유형: 한 줄 요약` (feat, fix, docs, style, refactor, test)
- 기능을 구현할 때 테스트 코드를 함께 작성하고, PR마다 GitHub Actions가 테스트를 자동 실행합니다.
- AI가 작성한 코드는 로컬에서 `npm run build`와 `npm run dev`로 확인한 뒤 커밋하고, 다른 모델이나 팀원에게 교차 검증을 받습니다.
- 기능 하나가 끝나면 AI 세션을 새로 시작해 컨텍스트를 깨끗하게 유지합니다.
