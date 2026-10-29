# 프로젝트

스택: Next.js (App Router) · React · TypeScript · Tailwind CSS

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
| fix | 버그 수정 | fix: 시세 목록 갱신 오류 수정 |
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
