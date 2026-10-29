# Project Guidelines & Rules

## 📌 프로젝트 개요
- **프로젝트명**: [프로젝트 이름]
- **설명**: [프로젝트 목적 및 주요 기능 간단 작성]

## 🛠️ 개발 환경 및 스택
- **Language**: Kotlin / C++ (필요한 언어로 변경)
- **JDK / Compiler**: OpenJDK 17 / GCC 11+
- **Build Tool**: Gradle / CMake

## 📁 주요 폴더 구조
- `src/`: 소스 코드 디렉토리
- `docs/`: 프로젝트 관련 문서 및 설계 자료
- `tests/`: 단체 및 기능 테스트 코드

## 📝 코드 작성 및 커밋 컨벤션
### 커밋 메시지 규칙
- `feat:` 새로운 기능 추가
- `fix:` 버그 수정
- `docs:` 문서 수정 (`CLAUDE.md`, `README.md` 등)
- `refactor:` 기능 변경 없는 코드 구조 개선
- `test:` 테스트 코드 추가 및 수정

### 코딩 스타일
- 변수/함수명: `camelCase`
- 클래스/인터페이스명: `PascalCase`
- 상수명: `UPPER_SNAKE_CASE`
- 들여쓰기: 공백 4칸(4 spaces)

## 🚀 주요 실행 및 빌드 명령어
- **빌드**: `./gradlew build`
- **실행**: `./gradlew run`
- **테스트**: `./gradlew test`
