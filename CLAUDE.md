# 약속 장소 투표 지도

친구들의 출발지를 모아 대중교통 이동 시간 기준 중간 지점(지하철역)과 주변 장소를 추천하고, 투표로 약속 장소를 정하는 웹 서비스 (해커톤용).
스택: Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase · 카카오 로컬 API / 지도 JS SDK · ODsay 대중교통 API

## 서비스 정의

해커톤 조건: 하루 이틀, 팀 3~4명, 라이브 데모. 핵심 흐름 하나만 완성한다.

- 흐름: 방 만들기 → 닉네임·출발지 입력 → 방장이 "중간 지점 찾기" → 후보 5곳 → 투표
- 사용자 식별: 로그인 없음. 방 링크 공유 + 닉네임. 참여자·방장 ID는 브라우저에 저장한다.
- 출발지 입력: 카카오 로컬 API로 주소·장소 검색이 기본, "현재 위치 사용"은 보조.
- 중간 지점: 참여자 평균 좌표 주변 지하철역 후보 5~8개를 카카오 카테고리 검색으로 찾고, 후보마다 모든 참여자의 대중교통 이동 시간(ODsay)을 조회한다. 가장 오래 걸리는 사람의 시간이 최소인 역을 1순위로 하고 평균 시간을 함께 표시한다.
- 조회 결과는 Supabase에 저장해 재사용한다. API 실패·한도 초과 시 평균 좌표 방식으로 대체하고 "대략적인 중간 지점"이라고 안내한다.
- 추천 장소: 음식점 · 카페 · 술집 중 방장이 카테고리를 고른다. 중간 역 근처 상위 5곳을 후보로 한다.
- 투표: 참여자당 한 표, 표 변경 가능, 결과 실시간 반영(Supabase Realtime, 어려우면 주기적 재조회).
- 화면: 홈(방 만들기) · `/room/[id]`(방 화면과 결과 화면을 상태로 전환). 지도에는 참여자 핀, 중간 역 핀, 후보 번호 핀을 표시한다.
- 제한과 예외: 참여자 2~6명, 후보 0곳이면 반경 확대 재검색, 이동 시간 90분 초과자가 있으면 경고만 표시한다.
- 데모: 팀원 휴대폰 3대로 같은 방에 접속하는 시연과, 미리 채운 "데모 방" 시드를 준비한다. Vercel에 배포한다.

### 데이터 구조 (Supabase)

- `rooms`: 방, 카테고리, 상태
- `participants`: 닉네임, 출발지 좌표
- `candidates`: 후보 장소와 점수
- `travel_times`: 참여자 × 후보역 이동 시간 캐시
- `votes`: 참여자당 한 행 (덮어쓰기로 표 변경)

로그인이 없으므로 방 ID를 아는 사람만 읽고 쓰게 하는 정도의 단순한 접근 제어이며, 이 한계를 문서에 명시한다. 스키마는 `supabase/schema.sql`에 둔다.

### 환경변수 (`.env.local`)

| 이름 | 용도 | 공개 범위 |
| --- | --- | --- |
| `KAKAO_REST_API_KEY` | 장소·역 검색 | 서버 전용 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 지도 표시 | 브라우저 공개 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 주소 | 브라우저 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개용 키 | 브라우저 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버에서 캐시 저장 | 서버 전용, 절대 공개 금지 |
| `ODSAY_API_KEY` | 대중교통 이동 시간 | 서버 전용 |

`NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저에 노출된다. 서버 전용 키는 서버 코드(Route Handler, Server Component)에서만 읽는다. 키 값은 채팅·코드·커밋에 넣지 않는다.

## 협업 규칙 (Collaboration Rules)

팀원과 AI 서비스가 함께 준수한다.

### 1. 깃 브랜치 전략

- `master` (또는 `main`): 언제나 배포 가능한 최종 안정 버전
- `develop`: 기능 개발이 통합되는 메인 개발 브랜치
- `feature/기능명`: 세부 기능 개발 (예: `feature/login`, `feature/search`)
- `fix/버그명`: 버그 수정 전용 (예: `fix/auth-error`)

작업 흐름: `master` → `feature/기능명` 생성 → 작업 완료 후 Pull Request(PR) 생성 → 팀원 검토 후 `master` 병합

### 2. 커밋 메시지 컨벤션

제목은 `유형: 한 줄 요약` 형태로 작성한다.

| 유형 | 설명 | 예시 |
| --- | --- | --- |
| feat | 새로운 기능 추가 | feat: 로그인 기능 추가 |
| fix | 버그 수정 | fix: 투표 결과 갱신 오류 수정 |
| docs | 문서 수정 (CLAUDE.md, README.md 등) | docs: 협업 규칙 및 환경변수 안내 문서화 |
| style | 코드 포맷팅 등 (동작 변경 없음) | style: Tailwind CSS 클래스 정렬 |
| refactor | 코드 구조 개선 (기능 변경 없음) | refactor: 검색 컴포넌트 로직 분리 |
| test | 테스트 코드 작성 및 수정 | test: 검색 API 단위 테스트 추가 |

### 3. AI 모델 및 도구 활용 규칙

- 역할 분담
  - Opus: 대규모 아키텍처 설계, 복잡한 DB 스키마 기획, 프로젝트 초기 뼈대 잡기
  - Sonnet: 세부 기능 구현, UI 컴포넌트 작성, 버그 수정 및 코드 리뷰
- 디자인 워크플로우: Figma 대신 프롬프트 입력창의 `/design` 커맨드를 우선 활용해 UI/UX를 생성한다.
- AI 생성 코드 검증: AI가 작성한 코드는 반드시 로컬에서 빌드(`npm run build`) 및 동작(`npm run dev`) 확인 후 커밋한다.

### 4. 코드 스타일 및 PR 규칙

- 컴포넌트 구조 (App Router): 페이지는 `src/app/`, 재사용 UI 컴포넌트는 `src/components/`에 둔다.
- 명명 규칙
  - 변수·함수: camelCase (예: `fetchUserData`)
  - 컴포넌트·타입·인터페이스: PascalCase (예: `UserProfile`, `User`)
- PR 조건
  - 최소 1명 이상의 팀원 승인 후 `master`에 병합한다.
  - PR 본문에 변경 기능의 스크린샷 또는 작업 요약을 포함한다.

### 5. 보안 및 환경변수 수칙

- 비밀 키 보호: API Key, DB 비밀번호 등 모든 민감 정보는 `.env.local`에만 저장한다.
- `.env.local`이 Git에 추적·커밋되지 않도록 `.gitignore` 포함 여부를 항상 확인한다.
- 공유 환경변수: 새 환경변수를 추가하면 키 이름만 적은 `.env.example`을 갱신해 저장소에 공유한다.

## 프로젝트 메모

- 이 Next.js 버전은 코드 작성 전 `node_modules/next/dist/docs/`의 해당 가이드를 확인한다 (`AGENTS.md` 참고).
