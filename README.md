# 약속 장소 투표 지도

친구들의 출발지를 모아 **대중교통 이동 시간 기준 중간 지점(지하철역)** 과 주변 장소를 추천하고, **투표로 약속 장소를 정하는** 웹 서비스입니다. (해커톤 프로젝트)

> 개발 중입니다. 현재는 빈 Next.js 기본 상태이며, 아래 내용은 목표로 하는 기능입니다.

## 주요 기능

1. 방을 만들고 링크를 친구에게 공유합니다. 로그인 없이 닉네임만 입력하면 참여할 수 있습니다.
2. 참여자가 각자 출발지를 주소나 장소명으로 검색해 입력합니다. ("현재 위치 사용"도 가능)
3. 방장이 "중간 지점 찾기"를 누르면, 후보 지하철역마다 모든 참여자의 대중교통 이동 시간을 계산해 **가장 오래 걸리는 사람의 시간이 가장 짧은 역**을 추천합니다.
4. 중간 역 근처의 음식점, 카페, 술집 중 방장이 고른 카테고리로 후보 5곳을 보여줍니다.
5. 참여자마다 한 표씩 투표하고(변경 가능), 결과가 실시간으로 반영됩니다.

대중교통 API 실패나 한도 초과 시에는 참여자 평균 좌표를 기준으로 "대략적인 중간 지점"을 안내합니다.

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

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

### 4. 빌드와 검사

```bash
npm run build
npm run lint
```

## 폴더 구조

```
src/
  app/          페이지와 라우트 (App Router)
  components/   재사용 UI 컴포넌트
docs/           프로젝트 문서
```

## 협업 규칙

브랜치 전략, 커밋 메시지 컨벤션, PR 규칙은 [CLAUDE.md](CLAUDE.md)를 따릅니다.

- `master`는 항상 배포 가능한 상태를 유지하며, **직접 push하지 않고** PR로만 병합합니다.
- 브랜치 이름: `feat/기능명`, `fix/버그명`, `docs/문서명`, `refactor/개선명`. **1 브랜치 = 1 담당자**입니다.
- 작업 흐름: `master` 최신화 → 작업 브랜치 생성 → 작게 자주 커밋·push → PR 작성 → CI 통과와 팀원 1명 이상 승인 → Squash and Merge
- 커밋 제목: `유형: 한 줄 요약` (feat, fix, docs, style, refactor, test)
- 기능을 구현할 때 테스트 코드를 함께 작성하고, PR마다 GitHub Actions가 테스트를 자동 실행합니다.
- AI가 작성한 코드는 로컬에서 `npm run build`와 `npm run dev`로 확인한 뒤 커밋하고, 다른 모델이나 팀원에게 교차 검증을 받습니다.
- 기능 하나가 끝나면 AI 세션을 새로 시작해 컨텍스트를 깨끗하게 유지합니다.
